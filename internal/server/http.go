package server

import (
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
	"io"

	"sentinel/internal/config" // Config package
	"sentinel/proto"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sentinel/internal/middleware"
)

type HttpServer struct {
	engine *gin.Engine
	core   *CoreServer
}

func NewHttpServer(core *CoreServer) *HttpServer {
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = "*"
		}

		origin := c.Request.Header.Get("Origin")
		if allowedOrigins == "*" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			origins := strings.Split(allowedOrigins, ",")
			for _, o := range origins {
				if strings.TrimSpace(o) == origin {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	s := &HttpServer{
		engine: r,
		core:   core,
	}

	api := r.Group("/api")
	
	// Serve static downloads (scripts, binaries)
	r.Static("/downloads", "./deploy/downloads")

	// Public Routes (with login rate limiting)
	api.POST("/auth/login", middleware.RateLimitMiddleware(middleware.LoginLimiter), s.handleLogin)
	api.GET("/auth/check", s.handleAuthCheck)
	api.POST("/auth/change-password", middleware.AuthMiddleware(), s.handleChangePassword)

	// Protected Routes (with general API rate limiting)
	api.Use(middleware.AuthMiddleware())
	api.Use(middleware.RateLimitMiddleware(middleware.APILimiter))
	{
		// Agent Management
		api.GET("/agents", s.handleGetAgents)
		api.POST("/agent/:id/kill", s.handleKillProcess)
		api.POST("/agent/:id/processes", s.handleListProcesses)
		api.POST("/agent/:id/action", s.handleSystemAction)
		api.DELETE("/agent/:id", s.handleDeleteAgent)
		api.GET("/agent/:id/history", s.handleGetHistory)
		api.GET("/agent/:id/stats", s.handleGetStats)

		// Logs
		api.GET("/agent/:id/logs", s.handleGetLogs)

		// Command Results
		api.GET("/command/:id", s.handleGetCommand)

		// Docker Management
		api.GET("/agent/:id/containers", s.handleListContainers)
		api.POST("/agent/:id/docker", s.handleDockerAction)

		// Service Management
		api.GET("/agent/:id/services", s.handleListServices)
		api.POST("/agent/:id/service/action", s.handleServiceAction)

		// --- NEW ENDPOINTS ---

		// Update Endpoint
		api.POST("/agent/:id/update", s.handleUpdateAgent)

		// Power Management
		api.POST("/agent/:id/wake", s.handleWakeAgent)

		// Settings Endpoints (Uses Config package)
		api.GET("/settings", s.handleGetSettings)
		api.POST("/settings", s.handleSaveSettings)

		// Real-time Events (SSE)
		api.GET("/events", s.handleSSE)

		// Audit Logs
		api.GET("/audit-logs", s.handleGetAuditLogs)
		api.DELETE("/audit-logs", s.handleClearAuditLogs)
	}

	return s
}

func (s *HttpServer) Run(addr string) error {
	return s.engine.Run(addr)
}

// Handler functions for agent management, logs, processes, containers, and docker actions

func (s *HttpServer) handleGetAgents(c *gin.Context) {
	sessions := s.core.GetAgents()

	type AgentResponse struct {
		Hostname        string            `json:"hostname"`
		IpAddress       string            `json:"ip_address"`
		MacAddress      string            `json:"mac_address"`
		Os              string            `json:"os"`
		Arch            string            `json:"arch"`
		Status          string            `json:"status"`
		LastSeen        int64             `json:"last_seen"`
		Metrics         *proto.MetricData `json:"metrics,omitempty"`
		CpuModel        string            `json:"cpu_model"`
		CpuCores        int32             `json:"cpu_cores"`
		TotalMemory     uint64            `json:"total_memory"`
		TotalDisk       uint64            `json:"total_disk"`
		KernelVersion   string            `json:"kernel_version"`
		BootTime        uint64            `json:"boot_time"`
		Platform        string            `json:"platform"`
		PlatformVersion string            `json:"platform_version"`
		Virtualization  string            `json:"virtualization"`
	}

	res := make([]AgentResponse, 0, len(sessions))
	for _, sess := range sessions {
		status := "offline"
		if sess.Active {
			status = "online"
		}
		res = append(res, AgentResponse{
			Hostname:        sess.Meta.Hostname,
			IpAddress:       sess.Meta.IpAddress,
			MacAddress:      sess.Meta.MacAddress,
			Os:              sess.Meta.Os,
			Arch:            sess.Meta.Arch,
			Status:          status,
			LastSeen:        sess.LastSeen.Unix(),
			Metrics:         sess.LatestMetrics,
			CpuModel:        sess.Meta.CpuModel,
			CpuCores:        sess.Meta.CpuCores,
			TotalMemory:     sess.Meta.TotalMemory,
			TotalDisk:       sess.Meta.TotalDisk,
			KernelVersion:   sess.Meta.KernelVersion,
			BootTime:        sess.Meta.BootTime,
			Platform:        sess.Meta.Platform,
			PlatformVersion: sess.Meta.PlatformVersion,
			Virtualization:  sess.Meta.VirtualizationSystem,
		})
	}

	sort.Slice(res, func(i, j int) bool {
		return res[i].Hostname < res[j].Hostname
	})

	c.JSON(http.StatusOK, res)
}

// ... Diğer mevcut fonksiyonlar (handleSystemAction vb.) buraya gelecek ...
// Sadece yeni eklenenleri aşağıya yazıyorum:

// --- YENİ EKLENEN HANDLERLAR ---

func (s *HttpServer) handleUpdateAgent(c *gin.Context) {
	agentID := c.Param("id")
	cmdID := uuid.New().String()

	cmd := &proto.Command{
		Id:   cmdID,
		Type: proto.Command_UPDATE_AGENT,
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	// AUDIT LOG
	if s.core.db != nil {
		go s.core.db.AddAuditLog("update_agent", agentID, "User triggered update")
	}

	c.JSON(http.StatusOK, gin.H{"status": "updating", "command_id": cmdID})
}

func (s *HttpServer) handleGetStats(c *gin.Context) {
	agentID := c.Param("id")
	
	// Default to 1h if not specified
	duration := c.DefaultQuery("range", "1h")
	
	// Validate duration
	validRanges := map[string]bool{"1m": true, "1h": true, "6h": true, "12h": true, "24h": true, "7d": true, "30d": true}
	if !validRanges[duration] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid range. Use: 1h, 6h, 24h, 7d, 30d"})
		return
	}
	
	stats, err := s.core.GetAgentStats(agentID, duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, stats)
}

func (s *HttpServer) handleGetSettings(c *gin.Context) {
	// Read from Config Manager on Core
	c.JSON(http.StatusOK, s.core.configMgr.Get())
}

func (s *HttpServer) handleSaveSettings(c *gin.Context) {
	var newSettings config.Settings
	if err := c.BindJSON(&newSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid settings format"})
		return
	}

	// Save to Config Manager on Core
	if err := s.core.configMgr.Save(newSettings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved", "settings": newSettings})
}

func (s *HttpServer) handleSSE(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")

	clientChan := make(chan string, 10)
	s.core.AddSSEClient(clientChan)
	defer s.core.RemoveSSEClient(clientChan)

	c.Stream(func(w io.Writer) bool {
		if msg, ok := <-clientChan; ok {
			c.SSEvent("message", msg)
			return true
		}
		return false
	})
}

func (s *HttpServer) handleWakeAgent(c *gin.Context) {
	agentID := c.Param("id")
	if err := s.core.WakeAgent(agentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "magic_packet_sent", "target": agentID})
}

// Note: Ensure all handler functions are included below.

func (s *HttpServer) handleSystemAction(c *gin.Context) {
	agentID := c.Param("id")
	var req struct {
		Action string `json:"action"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	var cmdType proto.Command_Type
	switch req.Action {
	case "reboot":
		cmdType = proto.Command_SYSTEM_REBOOT
	case "shutdown":
		cmdType = proto.Command_SYSTEM_SHUTDOWN
	case "restart_agent":
		cmdType = proto.Command_RESTART_AGENT
	case "suspend":
		cmdType = proto.Command_SYSTEM_SUSPEND
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown action"})
		return
	}

	cmdID := uuid.New().String()
	cmd := &proto.Command{
		Id:   cmdID,
		Type: cmdType,
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "queued", "command_id": cmdID})
}

func (s *HttpServer) handleGetLogs(c *gin.Context) {
	agentID := c.Param("id")
	cmdID := uuid.New().String()
	cmd := &proto.Command{
		Id:      cmdID,
		Type:    proto.Command_FETCH_LOGS,
		Payload: &proto.Command_FetchLogs{FetchLogs: &proto.FetchLogsRequest{Lines: 500}},
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	for i := 0; i < 50; i++ {
		time.Sleep(100 * time.Millisecond)
		result := s.core.GetCommandResult(cmdID)
		if result != nil {
			logText := result.GetLogData()
			c.JSON(http.StatusOK, gin.H{"status": "success", "logs": logText})
			return
		}
	}
	c.JSON(http.StatusGatewayTimeout, gin.H{"error": "Timeout waiting for logs"})
}

func (s *HttpServer) handleDeleteAgent(c *gin.Context) {
	agentID := c.Param("id")
	s.core.RemoveAgent(agentID)
	c.JSON(http.StatusOK, gin.H{"status": "deleted", "agent_id": agentID})
}

func (s *HttpServer) handleKillProcess(c *gin.Context) {
	agentID := c.Param("id")
	var req struct {
		Pid int32 `json:"pid"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	cmdID := uuid.New().String()
	cmd := &proto.Command{
		Id:      cmdID,
		Type:    proto.Command_KILL_PROCESS,
		Payload: &proto.Command_KillProcess{KillProcess: &proto.KillProcessRequest{Pid: req.Pid}},
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "queued", "command_id": cmdID})
}

func (s *HttpServer) handleListProcesses(c *gin.Context) {
	agentID := c.Param("id")
	cmdID := uuid.New().String()
	cmd := &proto.Command{
		Id:      cmdID,
		Type:    proto.Command_LIST_PROCESSES,
		Payload: &proto.Command_ListProcesses{ListProcesses: &proto.ListProcessesRequest{}},
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "queued", "command_id": cmdID})
}

func (s *HttpServer) handleGetCommand(c *gin.Context) {
	cmdID := c.Param("id")
	result := s.core.GetCommandResult(cmdID)
	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "pending"})
		return
	}

	response := gin.H{
		"command_id":    result.CommandId,
		"success":       result.Success,
		"error_message": result.Message,
	}

	if pl := result.GetProcessList(); pl != nil {
		response["process_list"] = pl
	}
	if logs := result.GetLogData(); logs != "" {
		response["logs"] = logs
	}

	c.JSON(http.StatusOK, response)
}

func (s *HttpServer) handleGetHistory(c *gin.Context) {
	agentID := c.Param("id")
	duration := c.DefaultQuery("duration", "1h")
	history, err := s.core.GetAgentHistory(agentID, duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

func (s *HttpServer) handleListContainers(c *gin.Context) {
	agentID := c.Param("id")
	cmdID := uuid.New().String()

	cmd := &proto.Command{
		Id:      cmdID,
		Type:    proto.Command_LIST_CONTAINERS,
		Payload: &proto.Command_ListContainers{ListContainers: &proto.ListContainersRequest{}},
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	for i := 0; i < 50; i++ {
		time.Sleep(100 * time.Millisecond)
		result := s.core.GetCommandResult(cmdID)
		if result != nil {
			if result.Success {
				containers := result.GetContainerList().GetContainers()
				c.JSON(http.StatusOK, containers)
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": result.Message})
			}
			return
		}
	}
	c.JSON(http.StatusGatewayTimeout, gin.H{"error": "Timeout"})
}

func (s *HttpServer) handleDockerAction(c *gin.Context) {
	agentID := c.Param("id")
	var req struct {
		ContainerId string `json:"container_id"`
		Action      string `json:"action"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	cmdID := uuid.New().String()
	cmd := &proto.Command{
		Id:   cmdID,
		Type: proto.Command_DOCKER_ACTION,
		Payload: &proto.Command_DockerAction{
			DockerAction: &proto.DockerActionRequest{
				ContainerId: req.ContainerId,
				Action:      req.Action,
			},
		},
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "queued", "command_id": cmdID})
}

func (s *HttpServer) handleListServices(c *gin.Context) {
	agentID := c.Param("id")
	cmdID := uuid.New().String()

	cmd := &proto.Command{
		Id:      cmdID,
		Type:    proto.Command_LIST_SERVICES,
		Payload: &proto.Command_ListServices{ListServices: &proto.ListServicesRequest{}},
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	for i := 0; i < 50; i++ {
		time.Sleep(100 * time.Millisecond)
		result := s.core.GetCommandResult(cmdID)
		if result != nil {
			if result.Success {
				services := result.GetServiceList().GetServices()
				c.JSON(http.StatusOK, services)
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": result.Message})
			}
			return
		}
	}
	c.JSON(http.StatusGatewayTimeout, gin.H{"error": "Timeout"})
}

func (s *HttpServer) handleServiceAction(c *gin.Context) {
	agentID := c.Param("id")
	var req struct {
		ServiceName string `json:"service_name"`
		Action      string `json:"action"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	cmdID := uuid.New().String()
	cmd := &proto.Command{
		Id:   cmdID,
		Type: proto.Command_SERVICE_ACTION,
		Payload: &proto.Command_ServiceAction{
			ServiceAction: &proto.ServiceActionRequest{
				ServiceName: req.ServiceName,
				Action:      req.Action,
			},
		},
	}

	if err := s.core.SendCommand(agentID, cmd); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "queued", "command_id": cmdID})
}

func (s *HttpServer) handleGetAuditLogs(c *gin.Context) {
	logs, err := s.core.GetAuditLogs(50) // Limit 50
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (s *HttpServer) handleClearAuditLogs(c *gin.Context) {
	if err := s.core.ClearAuditHistory(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "cleared"})
}

// --- AUTH HANDLERS ---

func (s *HttpServer) handleLogin(c *gin.Context) {
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	role, err := s.core.VerifyUser(creds.Username, creds.Password)
	if err != nil {
		// Initial Bootstrap: If admin/admin check comes and DB is empty/no admin, create it?
		// For detailed Phase 4: We'll assume manual creation or script. 
		// But let's add a "First Run" check here or in VerifyUser.
		// For now, strict check.
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	token, err := middleware.GenerateToken(creds.Username, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token, "username": creds.Username, "role": role})
}

func (s *HttpServer) handleAuthCheck(c *gin.Context) {
	// Simple endpoint to check if API is reachable. 
	// Actual validation happens via middleware on protected routes.
	// But since this is public, it just says "Hello".
	// The frontend should try a protected route (e.g. /api/agents) to validate token.
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *HttpServer) handleChangePassword(c *gin.Context) {
	// Get username from JWT token (set by middleware)
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if len(req.NewPassword) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters"})
		return
	}

	// Verify current password
	_, err := s.core.VerifyUser(username.(string), req.CurrentPassword)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Update password
	if err := s.core.UpdateUserPassword(username.(string), req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}
