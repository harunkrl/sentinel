package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewManager_DefaultSettings(t *testing.T) {
	// Create temp dir
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "settings.json")

	mgr := NewManager(configPath)

	// Should have default values
	settings := mgr.Get()
	if !settings.NotificationsEnabled {
		t.Error("Expected notifications to be enabled by default")
	}
	if settings.CpuThreshold != 90.0 {
		t.Errorf("Expected CpuThreshold 90.0, got %f", settings.CpuThreshold)
	}
}

func TestManager_SaveAndLoad(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "settings.json")

	// Create manager and save custom settings
	mgr := NewManager(configPath)
	newSettings := Settings{
		NotificationsEnabled: false,
		NtfyTopic:            "test-topic",
		CpuThreshold:         75.0,
		RamThreshold:         80.0,
		DiskThreshold:        85.0,
		CpuTempThreshold:     70.0,
	}

	if err := mgr.Save(newSettings); err != nil {
		t.Fatalf("Failed to save settings: %v", err)
	}

	// Create new manager to load from file
	mgr2 := NewManager(configPath)
	loaded := mgr2.Get()

	if loaded.NotificationsEnabled != false {
		t.Error("Expected notifications disabled")
	}
	if loaded.NtfyTopic != "test-topic" {
		t.Errorf("Expected topic 'test-topic', got '%s'", loaded.NtfyTopic)
	}
	if loaded.CpuThreshold != 75.0 {
		t.Errorf("Expected CpuThreshold 75.0, got %f", loaded.CpuThreshold)
	}
}

func TestManager_Load_InvalidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "settings.json")

	// Write invalid JSON
	if err := os.WriteFile(configPath, []byte("{invalid json}"), 0644); err != nil {
		t.Fatal(err)
	}

	// Should not panic, should use defaults
	mgr := NewManager(configPath)
	settings := mgr.Get()

	// Should have defaults
	if settings.CpuThreshold != 90.0 {
		t.Errorf("Expected default CpuThreshold, got %f", settings.CpuThreshold)
	}
}

func TestManager_Save_CreatesDirectory(t *testing.T) {
	tmpDir := t.TempDir()
	nestedPath := filepath.Join(tmpDir, "sub", "dir", "settings.json")

	mgr := NewManager(nestedPath)
	if err := mgr.Save(mgr.Get()); err != nil {
		t.Fatalf("Failed to save to nested path: %v", err)
	}

	if _, err := os.Stat(nestedPath); os.IsNotExist(err) {
		t.Error("Expected file to be created")
	}
}
