package server

import (
	"fmt"
	"io"
	"log"
	"sync"
	"time"

	"sentinel/internal/alert"
	"sentinel/internal/config" // Config package
	"sentinel/internal/store"
	"sentinel/proto"

	"net"

	"google.golang.org/grpc"

	"golang.org/x/crypto/bcrypt"
)

type AgentSession struct {
	Stream        proto.SystemMonitor_StreamTelemetryServer
	Meta          *proto.Handshake
	LastSeen      time.Time
	Active        bool
	LatestMetrics *proto.MetricData
}

type CoreServer struct {
	proto.UnimplementedSystemMonitorServer
	mu             sync.RWMutex
	agents         map[string]*AgentSession
	knownAgents    map[string]*proto.Handshake // Store metadata for offline agents
	commandResults map[string]*commandResultEntry
	pendingCmds    map[string]chan struct{} // Channels to notify when a command result arrives

	influx   *store.InfluxStore
	db       *store.Store
	alertMgr *alert.AlertManager

	configMgr *config.Manager

	// SSE Clients
	sseClients map[chan string]bool
}

// Command result with timestamp for TTL cleanup
type commandResultEntry struct {
	Result    *proto.CommandResponse
	CreatedAt time.Time
}

func NewCoreServer(influx *store.InfluxStore, db *store.Store, dataDir string) *CoreServer {
	if dataDir == "" {
		dataDir = "/data"
	}
	s := &CoreServer{
		agents:         make(map[string]*AgentSession),
		knownAgents:    make(map[string]*proto.Handshake),
		commandResults: make(map[string]*commandResultEntry),
		pendingCmds:    make(map[string]chan struct{}),
		influx:         influx,
		db:             db,
		alertMgr:       alert.NewAlertManager(),
		configMgr:      config.NewManager(dataDir + "/settings.json"),
		sseClients:     make(map[chan string]bool),
	}

	// Routine to clean old command results (TTL: 10 minutes)
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		for range ticker.C {
			s.cleanCommandResults()
		}
	}()

	return s
}

func (s *CoreServer) cleanCommandResults() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for id, entry := range s.commandResults {
		if now.Sub(entry.CreatedAt) > 10*time.Minute {
			delete(s.commandResults, id)
		}
	}
}

func (s *CoreServer) StreamTelemetry(stream proto.SystemMonitor_StreamTelemetryServer) error {
	var agentID string

	defer func() {
		if agentID != "" {
			s.markOffline(agentID)
			log.Printf("Agent disconnected: %s", agentID)

			// Get current settings for alert
			currentSettings := s.configMgr.Get()
			s.alertMgr.SendAgentOffline(agentID, currentSettings)

			s.BroadcastToSSE("update")
		}
	}()

	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		switch payload := msg.Payload.(type) {
		case *proto.Telemetry_Handshake:
			agentID = msg.AgentId
			s.registerAgent(agentID, stream, payload.Handshake)
			log.Printf("Agent connected: %s (%s)", agentID, payload.Handshake.IpAddress)

			currentSettings := s.configMgr.Get()
			s.alertMgr.SendAgentOnline(agentID, payload.Handshake.IpAddress, currentSettings)

		case *proto.Telemetry_Metrics:
			if agentID == "" {
				continue
			}
			if s.influx != nil {
				s.influx.WriteMetrics(agentID, payload.Metrics)
			}
			s.updateAgentMetrics(agentID, payload.Metrics)

			// Get current settings from Config Manager and send to Alert Manager
			currentSettings := s.configMgr.Get()
			s.alertMgr.CheckMetrics(agentID, payload.Metrics, currentSettings)

			// SSE Broadcast with enriched data
			s.BroadcastToSSE(fmt.Sprintf(`{"type":"metrics","agent_id":"%s"}`, agentID))

		case *proto.Telemetry_Response:
			log.Printf("Action result from %s: %v", msg.AgentId, payload.Response)
			cmdID := payload.Response.CommandId
			s.mu.Lock()
			s.commandResults[cmdID] = &commandResultEntry{
				Result:    payload.Response,
				CreatedAt: time.Now(),
			}
			// Notify any HTTP handler waiting for this result
			if ch, ok := s.pendingCmds[cmdID]; ok {
				close(ch)
				delete(s.pendingCmds, cmdID)
			}
			s.mu.Unlock()
		}
	}
}

func (s *CoreServer) registerAgent(id string, stream proto.SystemMonitor_StreamTelemetryServer, meta *proto.Handshake) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Add to memory
	s.agents[id] = &AgentSession{
		Stream:   stream,
		Meta:     meta,
		LastSeen: time.Now(),
		Active:   true,
	}

	// Store metadata for WoL (persists after disconnect)
	s.knownAgents[id] = meta

	// Persist to SQLite
	if s.db != nil {
		agent := store.Agent{
			Hostname:        meta.Hostname,
			IP:              meta.IpAddress,
			OS:              meta.Os,
			Arch:            meta.Arch,
			Status:          "online",
			LastSeen:        time.Now().Unix(),
			Platform:        meta.Platform,
			PlatformVersion: meta.PlatformVersion,
			BootTime:        meta.BootTime,
		}
		go func() {
			if err := s.db.UpsertAgent(agent); err != nil {
				log.Printf("Failed to upsert agent %s: %v", id, err)
			}
			s.db.AddAuditLog("agent_connect", id, fmt.Sprintf("IP: %s", meta.IpAddress))
		}()
	}
}

func (s *CoreServer) markOffline(id string) {
	s.mu.Lock()
	if sess, ok := s.agents[id]; ok {
		sess.Active = false
		sess.Stream = nil
	}
	s.mu.Unlock() // Unlock early

	// Update DB (async)
	if s.db != nil {
		go func() {
			s.db.UpdateAgentStatus(id, "offline", time.Now().Unix())
			s.db.AddAuditLog("agent_disconnect", id, "")
		}()
	}
}

func (s *CoreServer) updateAgentMetrics(id string, metrics *proto.MetricData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if sess, exists := s.agents[id]; exists {
		sess.LastSeen = time.Now()
		sess.LatestMetrics = metrics
	}
}

func (s *CoreServer) SendCommand(agentID string, cmd *proto.Command) error {
	s.mu.RLock()
	session, ok := s.agents[agentID]
	s.mu.RUnlock()

	if !ok || !session.Active || session.Stream == nil {
		return fmt.Errorf("agent not found or offline")
	}
	return session.Stream.Send(cmd)
}

func (s *CoreServer) GetAgents() []*AgentSession {
	// Hybrid approach: Get all persistent agents, then overlay active memory state
	var dbAgents []store.Agent
	if s.db != nil {
		var err error
		dbAgents, err = s.db.GetAgents()
		if err != nil {
			log.Printf("Error fetching agents from DB: %v", err)
		}
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	// If DB is empty or failed, fallback to memory agents only (for now)
	// Or better: Construct the list from DB, and fill metrics from map.

	resultMap := make(map[string]*AgentSession)

	// 1. Add DB agents first
	for _, a := range dbAgents {
		// Convert store.Agent to AgentSession-like structure
		meta := &proto.Handshake{
			Hostname:        a.Hostname,
			IpAddress:       a.IP,
			Os:              a.OS,
			Arch:            a.Arch,
			Platform:        a.Platform,
			PlatformVersion: a.PlatformVersion,
			BootTime:        a.BootTime,
		}

		resultMap[a.Hostname] = &AgentSession{
			Meta:     meta,
			LastSeen: time.Unix(a.LastSeen, 0),
			Active:   a.Status == "online",
		}
	}

	// 2. Overlay Memory agents (Source of Truth for Metrics and Live Status)
	for id, sess := range s.agents {
		if existing, ok := resultMap[id]; ok {
			existing.Active = sess.Active // Should match DB but memory is faster/truer
			existing.LatestMetrics = sess.LatestMetrics
			existing.LastSeen = sess.LastSeen
			existing.Meta = sess.Meta // Prefer memory meta if available
		} else {
			// This shouldn't happen if registerAgent writes to DB, but safe fallback
			resultMap[id] = sess
		}
	}

	list := make([]*AgentSession, 0, len(resultMap))
	for _, sess := range resultMap {
		list = append(list, sess)
	}
	return list
}

func (s *CoreServer) GetCommandResult(id string) *proto.CommandResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if entry, ok := s.commandResults[id]; ok {
		return entry.Result
	}
	return nil
}

// RegisterPending creates a channel that will be closed when a command result arrives
func (s *CoreServer) RegisterPending(cmdID string) chan struct{} {
	ch := make(chan struct{})
	s.mu.Lock()
	s.pendingCmds[cmdID] = ch
	s.mu.Unlock()
	return ch
}

// WaitForResult blocks until a command result arrives or the timeout expires
func (s *CoreServer) WaitForResult(cmdID string, timeout time.Duration) *proto.CommandResponse {
	ch := s.RegisterPending(cmdID)
	select {
	case <-ch:
		return s.GetCommandResult(cmdID)
	case <-time.After(timeout):
		// Clean up pending entry on timeout
		s.mu.Lock()
		delete(s.pendingCmds, cmdID)
		s.mu.Unlock()
		return nil
	}
}

func (s *CoreServer) GetAgentHistory(id string, duration string) ([]map[string]interface{}, error) {
	if s.influx == nil {
		return nil, fmt.Errorf("storage not available")
	}
	return s.influx.GetMetricsHistory(id, duration)
}

func (s *CoreServer) GetAgentStats(id string, duration string) (*store.AgentStats, error) {
	if s.influx == nil {
		return nil, fmt.Errorf("storage not available")
	}
	return s.influx.GetMetricsStats(id, duration)
}

func (s *CoreServer) RegisterGrpc(srv *grpc.Server) {
	proto.RegisterSystemMonitorServer(srv, s)
}

func (s *CoreServer) RemoveAgent(agentID string) {
	s.mu.Lock()
	delete(s.agents, agentID)
	// Also remove from knownAgents if we used it
	delete(s.knownAgents, agentID)
	s.mu.Unlock()

	// Persistence Delete
	if s.db != nil {
		// Use goroutine or synchronous? Sync is better for user feedback.
		if err := s.db.DeleteAgent(agentID); err != nil {
			log.Printf("Error deleting agent from DB: %v", err)
		}
		s.db.AddAuditLog("delete_agent", agentID, "User Action")
	}
}

// --- SSE MANAGEMENT ---

func (s *CoreServer) AddSSEClient(client chan string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sseClients[client] = true
}

func (s *CoreServer) RemoveSSEClient(client chan string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sseClients, client)
	close(client)
}

func (s *CoreServer) BroadcastToSSE(msg string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for client := range s.sseClients {
		select {
		case client <- msg:
		default:
		}
	}
}

// --- WAKE ON LAN ---

func (s *CoreServer) WakeAgent(agentID string) error {
	s.mu.RLock()
	var macAddr string
	// First check active session
	if sess, ok := s.agents[agentID]; ok && sess.Meta != nil {
		macAddr = sess.Meta.MacAddress
	} else if meta, ok := s.knownAgents[agentID]; ok {
		// Else check historical records
		macAddr = meta.MacAddress
	}
	s.mu.RUnlock()

	if macAddr == "" {
		return fmt.Errorf("MAC address not found for agent %s", agentID)
	}

	return sendMagicPacket(macAddr)
}

func sendMagicPacket(macAddr string) error {
	hwAddr, err := net.ParseMAC(macAddr)
	if err != nil {
		return err
	}

	// 6x FF
	payload := []byte{0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}
	// 16x MAC
	for i := 0; i < 16; i++ {
		payload = append(payload, hwAddr...)
	}

	// Broadcast address (Local network)
	addr := &net.UDPAddr{
		IP:   net.IPv4bcast,
		Port: 9,
	}

	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	_, err = conn.Write(payload)
	return err
}

// --- AUDIT LOGS ---

func (s *CoreServer) GetAuditLogs(limit int) ([]store.AuditLog, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}
	return s.db.GetAuditLogs(limit)
}

func (s *CoreServer) ClearAuditHistory() error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}
	return s.db.ClearAuditHistory()
}

// --- USER MANAGEMENT ---

func (s *CoreServer) VerifyUser(username, password string) (string, error) {
	if s.db == nil {
		return "", fmt.Errorf("database not available")
	}

	user, err := s.db.GetUser(username)
	if err != nil {
		// Auto-create admin if no users exist?
		// For simplicity, if user lookup fails and it's admin/admin, we might want to bootstrap.
		// BUT better to just return error.
		return "", fmt.Errorf("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", fmt.Errorf("invalid credentials")
	}

	return user.Role, nil
}

func (s *CoreServer) CreateUser(username, password, role string) error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.db.CreateUser(username, string(hashed), role)
}

func (s *CoreServer) UpdateUserPassword(username, newPassword string) error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.db.UpdateUserPassword(username, string(hashed))
}
