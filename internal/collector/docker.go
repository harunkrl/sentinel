package collector

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"sentinel/proto"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

type DockerManager struct {
	cli *client.Client
}

func NewDockerManager() (*DockerManager, error) {
	// Use API version negotiation (Docker v26+)
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)

	if err != nil {
		return nil, err
	}
	return &DockerManager{cli: cli}, nil
}

func (d *DockerManager) ListContainers() ([]*proto.ContainerInfo, error) {
	if d.cli == nil {
		return nil, fmt.Errorf("docker client not initialized")
	}

	ctx := context.Background()
	containers, err := d.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var list []*proto.ContainerInfo
	for _, c := range containers {
		name := "unknown"
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		shortID := c.ID
		if len(c.ID) > 12 {
			shortID = c.ID[:12]
		}

		info := &proto.ContainerInfo{
			Id:     shortID,
			Name:   name,
			Image:  c.Image,
			State:  c.State,
			Status: c.Status,
		}

		// Get container stats if running
		if c.State == "running" {
			if stats, err := d.getContainerStats(ctx, c.ID); err == nil {
				info.CpuPercent = stats.cpuPercent
				info.MemoryUsage = stats.memoryUsage
			}
		}

		list = append(list, info)
	}
	return list, nil
}

type containerStats struct {
	cpuPercent  float64
	memoryUsage uint64
}

func (d *DockerManager) getContainerStats(ctx context.Context, containerID string) (*containerStats, error) {
	stats, err := d.cli.ContainerStatsOneShot(ctx, containerID)
	if err != nil {
		return nil, err
	}
	defer stats.Body.Close()

	var v struct {
		CPUStats struct {
			CPUUsage struct {
				TotalUsage uint64 `json:"total_usage"`
			} `json:"cpu_usage"`
			SystemCPUUsage uint64 `json:"system_cpu_usage"`
		} `json:"cpu_stats"`
		PreCPUStats struct {
			CPUUsage struct {
				TotalUsage uint64 `json:"total_usage"`
			} `json:"cpu_usage"`
			SystemCPUUsage uint64 `json:"system_cpu_usage"`
		} `json:"precpu_stats"`
		MemoryStats struct {
			Usage uint64 `json:"usage"`
		} `json:"memory_stats"`
	}

	if err := json.NewDecoder(stats.Body).Decode(&v); err != nil {
		return nil, err
	}

	// Calculate CPU percentage
	cpuDelta := float64(v.CPUStats.CPUUsage.TotalUsage - v.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(v.CPUStats.SystemCPUUsage - v.PreCPUStats.SystemCPUUsage)
	cpuPercent := 0.0
	if systemDelta > 0 && cpuDelta > 0 {
		cpuPercent = (cpuDelta / systemDelta) * 100.0
	}

	return &containerStats{
		cpuPercent:  cpuPercent,
		memoryUsage: v.MemoryStats.Usage,
	}, nil
}

func (d *DockerManager) ContainerAction(containerID, action string) error {
	ctx := context.Background()

	switch action {
	case "start":
		return d.cli.ContainerStart(ctx, containerID, container.StartOptions{})
	case "stop":
		return d.cli.ContainerStop(ctx, containerID, container.StopOptions{})
	case "restart":
		return d.cli.ContainerRestart(ctx, containerID, container.StopOptions{})
	default:
		return fmt.Errorf("unknown action: %s", action)
	}
}
