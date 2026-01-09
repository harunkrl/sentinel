package collector

import (
	"log"
	"math"
	"strings"
	"time"

	"sentinel/proto"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type Collector struct {
	lastNetStat map[string]net.IOCountersStat
	lastNetTime time.Time

	// State for Disk I/O
	lastDiskStat map[string]disk.IOCountersStat
	lastDiskTime time.Time
}

func NewCollector() *Collector {
	return &Collector{
		lastNetStat:  make(map[string]net.IOCountersStat),
		lastDiskStat: make(map[string]disk.IOCountersStat),
	}
}

func (c *Collector) Collect() (*proto.MetricData, error) {
	m := &proto.MetricData{}

	// 1. CPU Usage
	percentages, err := cpu.Percent(0, false)
	if err == nil && len(percentages) > 0 {
		m.CpuPercent = math.Round(percentages[0]*100) / 100
	}

	// 2. Memory Usage
	v, err := mem.VirtualMemory()
	if err == nil {
		m.RamUsedPercent = math.Round(v.UsedPercent*100) / 100
	}

	// 3. Disk Usage (Space)
	d, err := disk.Usage("/")
	if err == nil {
		m.DiskUsedPercent = math.Round(d.UsedPercent*100) / 100
	}

	// 4. Platform Specific Metrics (Load Avg & Thermal)
	m.Load_1, m.Load_5, m.Load_15 = c.getLoadAvg()
	m.TemperatureC = c.readThermal()

	// 5. Network I/O
	c.collectNetworkMetrics(m)

	// 6. Disk I/O (Read/Write Speed)
	c.collectDiskIOMetrics(m)

	return m, nil
}

func (c *Collector) collectNetworkMetrics(m *proto.MetricData) {
	counters, err := net.IOCounters(true)
	if err == nil {
		now := time.Now()
		duration := now.Sub(c.lastNetTime).Seconds()
		var totalSentRate, totalRecvRate float64

		if duration > 0 {
			for _, current := range counters {
				name := strings.ToLower(current.Name)
				if strings.HasPrefix(name, "lo") || strings.HasPrefix(name, "veth") || strings.HasPrefix(name, "docker") || strings.HasPrefix(name, "br-") {
					continue
				}

				if last, ok := c.lastNetStat[current.Name]; ok {
					sentDelta := float64(current.BytesSent - last.BytesSent)
					recvDelta := float64(current.BytesRecv - last.BytesRecv)
					if sentDelta >= 0 && recvDelta >= 0 {
						totalSentRate += sentDelta / duration
						totalRecvRate += recvDelta / duration
					}
				}
				c.lastNetStat[current.Name] = current
			}
		} else {
			for _, current := range counters {
				c.lastNetStat[current.Name] = current
			}
		}
		m.NetSentKbps = totalSentRate / 1024
		m.NetRecvKbps = totalRecvRate / 1024
		m.NetSent = totalSentRate
		m.NetRecv = totalRecvRate
		c.lastNetTime = now
	}
}

func (c *Collector) collectDiskIOMetrics(m *proto.MetricData) {
	// Get Disk I/O Counters
	counters, err := disk.IOCounters()
	if err == nil {
		now := time.Now()
		duration := now.Sub(c.lastDiskTime).Seconds()
		var totalReadBytes, totalWriteBytes float64

		if duration > 0 {
			for name, current := range counters {
				// Get only physical disks or main partitions (ignore loops and ramdisks)
				// Linux: sdX, nvmeX, vdX; Windows: C:, D: etc.
				if strings.HasPrefix(name, "loop") || strings.HasPrefix(name, "ram") {
					continue
				}

				if last, ok := c.lastDiskStat[name]; ok {
					readDelta := float64(current.ReadBytes - last.ReadBytes)
					writeDelta := float64(current.WriteBytes - last.WriteBytes)

					if readDelta >= 0 && writeDelta >= 0 {
						totalReadBytes += readDelta
						totalWriteBytes += writeDelta
					}
				}
				c.lastDiskStat[name] = current
			}

			// Convert Bytes/sec -> MB/s
			m.DiskReadMbps = (totalReadBytes / duration) / (1024 * 1024)
			m.DiskWriteMbps = (totalWriteBytes / duration) / (1024 * 1024)
		} else {
			// Fill map on first run
			for name, current := range counters {
				c.lastDiskStat[name] = current
			}
		}
		c.lastDiskTime = now
	} else {
		log.Printf("Disk IO Error: %v", err)
	}
}
