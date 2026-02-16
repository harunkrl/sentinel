//go:build linux

package collector

import (
	"os"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
)

func (c *Collector) getLoadAvg() (float64, float64, float64) {
	l, err := load.Avg()
	if err != nil {
		return 0, 0, 0
	}
	return l.Load1, l.Load5, l.Load15
}

func (c *Collector) readThermal() float64 {
	temps, _ := host.SensorsTemperatures()

	// Even if there's an error (e.g. Warning), continue if data is available
	if len(temps) > 0 {
		var bestCandidate float64 = 0
		var bestScore = 0

		for _, t := range temps {
			key := strings.ToLower(t.SensorKey)
			val := t.Temperature

			// Filter out: zero readings, virtual, wifi, nvme and composite sensors
			if val <= 0 || strings.Contains(key, "virtual") || strings.Contains(key, "wifi") || strings.Contains(key, "nvme") || strings.Contains(key, "composite") {
				continue
			}

			currentScore := 0

			// Scoring logic — prefer package/tctl > core > cpu > thinkpad > other
			if strings.Contains(key, "package") || strings.Contains(key, "tctl") {
				currentScore = 100
			} else if strings.Contains(key, "core") {
				currentScore = 80
			} else if strings.Contains(key, "cpu") {
				currentScore = 60
			} else if strings.Contains(key, "thinkpad") {
				currentScore = 50
			} else {
				currentScore = 10
			}

			if currentScore > bestScore {
				bestScore = currentScore
				bestCandidate = val
			} else if currentScore == bestScore {
				if val > bestCandidate {
					bestCandidate = val
				}
			}
		}

		if bestCandidate > 0 {
			return bestCandidate
		}
	}

	// Fallback: Raspberry Pi and similar SBCs
	data, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp")
	if err == nil {
		valStr := strings.TrimSpace(string(data))
		val, _ := strconv.Atoi(valStr)
		return float64(val) / 1000.0
	}

	return 0
}
