package alert

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"sentinel/internal/config"
	"sentinel/proto"
)

type AlertManager struct {
	Topic      string
	lastAlerts map[string]time.Time
	mu         sync.Mutex
}

func NewAlertManager() *AlertManager {
	defaultTopic := "sentinel-command-private-alarm-channel"

	return &AlertManager{
		Topic:      defaultTopic,
		lastAlerts: make(map[string]time.Time),
	}
}

// SendMessageToTopic: Sends a notification to a specific topic
func (a *AlertManager) SendMessageToTopic(message, tag, topic string) {
	if topic == "" {
		topic = a.Topic
	}

	url := fmt.Sprintf("https://ntfy.sh/%s", topic)

	go func() {
		req, err := http.NewRequest("POST", url, strings.NewReader(message))
		if err != nil {
			log.Printf("❌ Failed to create alert request: %v", err)
			return
		}

		req.Header.Set("Title", "Sentinel Alert")
		req.Header.Set("Priority", "high")
		req.Header.Set("Tags", tag)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Printf("❌ Failed to send alert: %v", err)
			return
		}
		defer resp.Body.Close()
	}()
}

// CheckMetrics: Checks limits and sends alert if needed
func (a *AlertManager) CheckMetrics(agentID string, m *proto.MetricData, settings config.Settings) {
	if a == nil {
		return
	}

	if !settings.NotificationsEnabled {
		return
	}

	// Use topic from settings if available, otherwise default
	targetTopic := settings.NtfyTopic
	if targetTopic == "" {
		targetTopic = a.Topic
	}

	// --- CPU UTILIZATION ---
	if m.CpuPercent > settings.CpuThreshold {
		msg := fmt.Sprintf("🔥 CPU HIGH: %s is at %.1f%% (Limit: %.0f%%)", agentID, m.CpuPercent, settings.CpuThreshold)
		// Key: agentID + "_cpu"
		a.sendWithDebounce(agentID+"_cpu", msg, "rotating_light", targetTopic)
	}

	// --- RAM USAGE ---
	if m.RamUsedPercent > settings.RamThreshold {
		msg := fmt.Sprintf("💾 RAM HIGH: %s is at %.1f%% (Limit: %.0f%%)", agentID, m.RamUsedPercent, settings.RamThreshold)
		// Icon fixed
		a.sendWithDebounce(agentID+"_ram", msg, "rotating_light", targetTopic)
	}

	// --- DISK USAGE ---
	if m.DiskUsedPercent > settings.DiskThreshold {
		msg := fmt.Sprintf("💿 DISK FULL: %s is at %.1f%% (Limit: %.0f%%)", agentID, m.DiskUsedPercent, settings.DiskThreshold)
		a.sendWithDebounce(agentID+"_disk", msg, "rotating_light", targetTopic)
	}

	// CPU Temperature threshold check
	// Check if temperature data exists (greater than 0)
	if m.TemperatureC > 0 && m.TemperatureC > settings.CpuTempThreshold {
		msg := fmt.Sprintf("🌡️ TEMP HIGH: %s is at %.1f°C (Limit: %.0f°C)", agentID, m.TemperatureC, settings.CpuTempThreshold)
		a.sendWithDebounce(agentID+"_temp", msg, "rotating_light", targetTopic)
	}
}

func (a *AlertManager) sendWithDebounce(key string, msg string, tag string, topic string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	last, exists := a.lastAlerts[key]
	// Repeat same alarm every 5 minutes (Spam prevention)
	debounceMinutes := 5
	if envVal := os.Getenv("ALERT_DEBOUNCE_MINUTES"); envVal != "" {
		if n, err := fmt.Sscanf(envVal, "%d", &debounceMinutes); n == 1 && err == nil {
			// Use parsed value
		}
	}
	if !exists || time.Since(last) > time.Duration(debounceMinutes)*time.Minute {
		log.Printf("🚨 Sending Alert to %s: %s", topic, msg)
		a.SendMessageToTopic(msg, tag, topic)
		a.lastAlerts[key] = time.Now()
	}
}

func (a *AlertManager) SendAgentOffline(agentID string, settings config.Settings) {
	if a == nil || !settings.NotificationsEnabled {
		return
	}
	targetTopic := settings.NtfyTopic
	if targetTopic == "" {
		targetTopic = a.Topic
	}
	a.SendMessageToTopic(fmt.Sprintf("🚨 %s has disconnected!", agentID), "red_circle", targetTopic)
}

func (a *AlertManager) SendAgentOnline(agentID, ip string, settings config.Settings) {
	if a == nil || !settings.NotificationsEnabled {
		return
	}
	targetTopic := settings.NtfyTopic
	if targetTopic == "" {
		targetTopic = a.Topic
	}
	a.SendMessageToTopic(fmt.Sprintf("✅ %s connected from %s", agentID, ip), "green_circle", targetTopic)
}
