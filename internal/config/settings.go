package config

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"sync"
)

// Default settings
const DefaultNtfyTopic = "sentinel-command-private-alarm-channel"

var defaultSettings = Settings{
	NotificationsEnabled: true,
	NtfyTopic:            DefaultNtfyTopic,
	CpuThreshold:         90.0,
	RamThreshold:         90.0,
	DiskThreshold:        90.0,
	CpuTempThreshold:     80.0,
}

// Settings holds application configuration
type Settings struct {
	NotificationsEnabled bool    `json:"notifications_enabled"`
	NtfyTopic            string  `json:"ntfy_topic"`
	CpuThreshold         float64 `json:"cpu_threshold"`
	RamThreshold         float64 `json:"ram_threshold"`
	DiskThreshold        float64 `json:"disk_threshold"`
	CpuTempThreshold     float64 `json:"cpu_temp_threshold"`
}

// Manager handles settings persistence
type Manager struct {
	filePath string
	mu       sync.RWMutex
	settings Settings
}

func NewManager(path string) *Manager {
	m := &Manager{
		filePath: path,
		settings: defaultSettings,
	}
	m.load()
	return m
}

func (m *Manager) load() {
	file, err := os.ReadFile(m.filePath)
	if err != nil {
		return // Use defaults if file doesn't exist
	}
	if err := json.Unmarshal(file, &m.settings); err != nil {
		log.Printf("Warning: Failed to parse settings file: %v", err)
	}
}

func (m *Manager) Save(s Settings) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Ensure directory exists
	dir := filepath.Dir(m.filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	m.settings = s
	return os.WriteFile(m.filePath, data, 0644)
}

func (m *Manager) Get() Settings {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.settings
}
