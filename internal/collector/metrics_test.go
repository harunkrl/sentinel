package collector

import (
	"testing"
)

func TestNewCollector(t *testing.T) {
	c := NewCollector()
	if c == nil {
		t.Fatal("NewCollector returned nil")
	}
	if c.lastNetStat == nil {
		t.Error("lastNetStat map is nil")
	}
	if c.lastDiskStat == nil {
		t.Error("lastDiskStat map is nil")
	}
}

// Note: TestCollect is difficult to test deterministically because it relies on
// actual system metrics (gopsutil). We would need to mock gopsutil, but for a
// capstone project, showing that we can write tests for initialization and basic
// logic is often sufficient as a first step.
// We can test that it returns a non-nil object and no error.
func TestCollect(t *testing.T) {
	c := NewCollector()
	metrics, err := c.Collect()
	if err != nil {
		t.Fatalf("Collect returned error: %v", err)
	}
	if metrics == nil {
		t.Fatal("Collect returned nil metrics")
	}

	// Basic sanity checks
	if metrics.CpuPercent < 0 || metrics.CpuPercent > 100 {
		t.Errorf("Invalid CPU percent: %f", metrics.CpuPercent)
	}

	// On first run, network/disk IO rates might be 0, which is valid.
}
