package store

import (
	"testing"
)

func TestNewStore(t *testing.T) {
	tmpDir := t.TempDir()

	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}

	if store == nil {
		t.Error("Expected non-nil store")
	}
}

func TestStore_AgentOperations(t *testing.T) {
	tmpDir := t.TempDir()
	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	// Insert agent
	agent := Agent{
		Hostname: "test-host",
		IP:       "192.168.1.100", // Mock IP for testing
		OS:       "linux",
		Arch:     "amd64",
		Status:   "online",
		LastSeen: 1234567890,
	}

	if err := store.UpsertAgent(agent); err != nil {
		t.Fatalf("Failed to upsert agent: %v", err)
	}

	// Get agents
	agents, err := store.GetAgents()
	if err != nil {
		t.Fatalf("Failed to get agents: %v", err)
	}

	if len(agents) != 1 {
		t.Errorf("Expected 1 agent, got %d", len(agents))
	}

	if agents[0].Hostname != "test-host" {
		t.Errorf("Expected hostname 'test-host', got '%s'", agents[0].Hostname)
	}

	// Update status
	if err := store.UpdateAgentStatus("test-host", "offline", 1234567899); err != nil {
		t.Fatalf("Failed to update status: %v", err)
	}

	agents, _ = store.GetAgents()
	if agents[0].Status != "offline" {
		t.Errorf("Expected status 'offline', got '%s'", agents[0].Status)
	}

	// Delete agent
	if err := store.DeleteAgent("test-host"); err != nil {
		t.Fatalf("Failed to delete agent: %v", err)
	}

	agents, _ = store.GetAgents()
	if len(agents) != 0 {
		t.Errorf("Expected 0 agents after delete, got %d", len(agents))
	}
}

func TestStore_UserOperations(t *testing.T) {
	tmpDir := t.TempDir()
	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	// Create user
	if err := store.CreateUser("admin", "hashed_password", "admin"); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Get user
	user, err := store.GetUser("admin")
	if err != nil {
		t.Fatalf("Failed to get user: %v", err)
	}

	if user.Username != "admin" {
		t.Errorf("Expected username 'admin', got '%s'", user.Username)
	}
	if user.Role != "admin" {
		t.Errorf("Expected role 'admin', got '%s'", user.Role)
	}

	// Get non-existent user
	_, err = store.GetUser("nonexistent")
	if err == nil {
		t.Error("Expected error for non-existent user")
	}
}

func TestStore_AuditLogs(t *testing.T) {
	tmpDir := t.TempDir()
	store, err := NewStore(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	// Add audit log
	if err := store.AddAuditLog("agent_connect", "test-host", "IP: 1.2.3.4"); err != nil {
		t.Fatalf("Failed to add audit log: %v", err)
	}

	// Get logs
	logs, err := store.GetAuditLogs(10)
	if err != nil {
		t.Fatalf("Failed to get logs: %v", err)
	}

	if len(logs) != 1 {
		t.Errorf("Expected 1 log, got %d", len(logs))
	}

	if logs[0].Action != "agent_connect" {
		t.Errorf("Expected action 'agent_connect', got '%s'", logs[0].Action)
	}

	// Clear logs
	if err := store.ClearAuditHistory(); err != nil {
		t.Fatalf("Failed to clear logs: %v", err)
	}

	logs, _ = store.GetAuditLogs(10)
	if len(logs) != 0 {
		t.Errorf("Expected 0 logs after clear, got %d", len(logs))
	}
}
