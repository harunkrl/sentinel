//go:build windows

package collector

import (
	"github.com/shirou/gopsutil/v3/host"
)

func (c *Collector) getLoadAvg() (float64, float64, float64) {
	// Windows does not allow reading Load Average directly like Linux.
	// Returning 0 ensures the dashboard handles it gracefully.
	return 0, 0, 0
}

func (c *Collector) readThermal() float64 {
	// Windows requires WMI to read temperatures.
	// gopsutil attempts to use OpenHardwareMonitor via WMI if available.
	temps, err := host.SensorsTemperatures()
	if err == nil {
		var maxCoreTemp float64 = 0
		for _, t := range temps {
			if t.Temperature > maxCoreTemp {
				maxCoreTemp = t.Temperature
			}
		}
		if maxCoreTemp > 0 {
			return maxCoreTemp
		}
	}

	// If WMI fails or requires Admin privileges, return 0.
	return 0
}
