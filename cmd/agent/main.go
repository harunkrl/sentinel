package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"time"

	"sentinel/internal/collector"
	"sentinel/proto"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/process"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

// Global Docker Manager
var dockerMgr *collector.DockerManager

func main() {
	log.Println("🚀 SENTINEL AGENT v2.3 (SMART IP)")
	coreAddr := os.Getenv("CORE_ADDRESS")
	if coreAddr == "" {
		coreAddr = "localhost:50051"
	}

	log.Printf("Starting Sentinel Agent. Target Core: %s", coreAddr)

	// Try Docker connection
	var err error
	dockerMgr, err = collector.NewDockerManager()
	if err != nil {
		log.Printf("⚠️ Docker not available: %v", err)
	} else {
		log.Println("🐳 Docker connected successfully")
	}

	col := collector.NewCollector()

	for {
		err := runAgent(coreAddr, col)
		log.Printf("Disconnected from Core: %v. Retrying in 5s...", err)
		time.Sleep(5 * time.Second)
	}
}

func runAgent(addr string, col *collector.Collector) error {
	// TLS Config
	// Default: Secure (Verify Cert)
	// Dev/Self-Signed: Set SENTINEL_INSECURE_TLS=true for plaintext gRPC (no TLS)
	insecureTLS := os.Getenv("SENTINEL_INSECURE_TLS") == "true"

	var dialOpt grpc.DialOption
	if insecureTLS {
		log.Println("⚠️ WARNING: Running in INSECURE mode (no TLS)")
		dialOpt = grpc.WithTransportCredentials(insecure.NewCredentials())
	} else {
		tlsConfig := &tls.Config{}
		creds := credentials.NewTLS(tlsConfig)
		dialOpt = grpc.WithTransportCredentials(creds)
	}

	conn, err := grpc.NewClient(addr, dialOpt)

	if err != nil {
		return err
	}
	defer conn.Close()

	client := proto.NewSystemMonitorClient(conn)
	stream, err := client.StreamTelemetry(context.Background())
	if err != nil {
		return err
	}

	msgChan := make(chan *proto.Telemetry, 10)

	// --- GATHER SYSTEM SPECS ---
	hostInfo, _ := host.Info()
	cpuInfo, _ := cpu.Info()
	memInfo, _ := mem.VirtualMemory()
	diskInfo, _ := disk.Usage("/")

	cpuModel := "Unknown CPU"
	var cpuCores int32 = 0
	if len(cpuInfo) > 0 {
		cpuModel = cpuInfo[0].ModelName
		cpuCores = int32(len(cpuInfo))
	}

	virtSystem := hostInfo.VirtualizationSystem
	if virtSystem == "" {
		virtSystem = "Physical"
	}

	// Hostname Fix: Env first, then OS
	hostname := os.Getenv("AGENT_HOSTNAME")
	if hostname == "" {
		hostname, _ = os.Hostname()
	}

	// IP Fix: Get outbound IP to server
	realIP := getOutboundIP(addr)

	// Get MAC Address for WoL
	macAddr := getMacAddress()

	msgChan <- &proto.Telemetry{
		AgentId:   hostname,
		Timestamp: time.Now().Unix(),
		Payload: &proto.Telemetry_Handshake{
			Handshake: &proto.Handshake{
				Os:                   runtime.GOOS,
				Arch:                 runtime.GOARCH,
				Hostname:             hostname,
				IpAddress:            realIP,
				MacAddress:           macAddr,
				CpuModel:             cpuModel,
				CpuCores:             cpuCores,
				TotalMemory:          memInfo.Total,
				TotalDisk:            diskInfo.Total,
				KernelVersion:        hostInfo.KernelVersion,
				BootTime:             hostInfo.BootTime,
				Platform:             hostInfo.Platform,
				PlatformVersion:      hostInfo.PlatformVersion,
				VirtualizationSystem: virtSystem,
			},
		},
	}

	errChan := make(chan error, 1)
	go func() {
		for {
			cmd, err := stream.Recv()
			if err != nil {
				errChan <- err
				return
			}
			result := handleCommand(cmd)
			if result != nil {
				result.AgentId = hostname
				result.Timestamp = time.Now().Unix()
				msgChan <- result
			}
		}
	}()

	go func() {
		// Metric collection interval (configurable via METRIC_INTERVAL_SECONDS, default 2)
		intervalStr := os.Getenv("METRIC_INTERVAL_SECONDS")
		interval := 2 * time.Second
		if intervalStr != "" {
			if n, err := time.ParseDuration(intervalStr + "s"); err == nil {
				interval = n
			}
		}
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			m, err := col.Collect()
			if err != nil {
				log.Printf("Error collecting metrics: %v", err)
				continue
			}
			msgChan <- &proto.Telemetry{
				AgentId:   hostname,
				Timestamp: time.Now().Unix(),
				Payload: &proto.Telemetry_Metrics{
					Metrics: m,
				},
			}
		}
	}()

	for {
		select {
		case err := <-errChan:
			return err
		case msg := <-msgChan:
			if err := stream.Send(msg); err != nil {
				return err
			}
		}
	}
}

func handleCommand(cmd *proto.Command) *proto.Telemetry {
	log.Printf("📥 Received command ID: %s Type: %v", cmd.Id, cmd.Type)

	// --- UPDATE AGENT ACTION ---
	if cmd.Type == proto.Command_UPDATE_AGENT {
		coreAddr := os.Getenv("CORE_ADDRESS")
		host, _, _ := net.SplitHostPort(coreAddr)

		if host == "" || host == "localhost" || host == "127.0.0.1" {
			if host == "" {
				host = "localhost"
			}
		}

		downloadURL := fmt.Sprintf("http://%s:3000/downloads/install.sh", host)
		log.Printf("🔄 Update requested. Script URL: %s", downloadURL)

		go func() {
			time.Sleep(1 * time.Second)

			// METHOD: Sleep + Systemd Run
			// 1. Sleep 5s (Let agent stop/start)
			// 2. Download and run script.
			// The script includes "systemctl stop" so it will override the running service.

			fullCmd := fmt.Sprintf("sleep 5; curl -fsSL %s | bash -s %s", downloadURL, host)

			var finalCmd *exec.Cmd

			if _, err := exec.LookPath("systemd-run"); err == nil {
				log.Println("🚀 Spawning independent updater process...")

				// --service-type=oneshot: Wait until finished
				// --unit=sentinel-updater: Name it
				finalCmd = exec.Command("systemd-run",
					"--unit=sentinel-updater",
					"--description=Sentinel Agent Updater",
					"--service-type=oneshot",
					"/bin/bash", "-c", fullCmd)
			} else {
				// Fallback
				log.Println("⚠️ systemd-run not found, trying nohup...")
				finalCmd = exec.Command("nohup", "bash", "-c", fullCmd)
			}

			output, err := finalCmd.CombinedOutput()

			if err != nil {
				log.Printf("❌ Updater spawn failed: %v\nOutput: %s", err, string(output))
			} else {
				log.Printf("✅ Updater spawned. Agent will restart in 5 seconds.\nOutput: %s", string(output))
			}

			// We are done, let updater take over.
			// If we don't exit, old binary might remain in memory even if update succeeds.
			os.Exit(0)
		}()

		return successResponse(cmd.Id, "Update process started. Agent will restart shortly.")
	}

	if cmd.Type == proto.Command_LIST_CONTAINERS {
		if dockerMgr == nil {
			return errorResponse(cmd.Id, "Docker not available on this agent")
		}
		list, err := dockerMgr.ListContainers()
		if err == nil {
			log.Printf("🐳 DEBUG: Found %d containers", len(list))
		} else {
			log.Printf("❌ DEBUG: Error listing containers: %v", err)
		}
		if err != nil {
			return errorResponse(cmd.Id, err.Error())
		}
		return &proto.Telemetry{
			Payload: &proto.Telemetry_Response{
				Response: &proto.CommandResponse{
					CommandId: cmd.Id,
					Success:   true,
					ResultData: &proto.CommandResponse_ContainerList{
						ContainerList: &proto.ContainerList{Containers: list},
					},
				},
			},
		}
	}

	if cmd.Type == proto.Command_DOCKER_ACTION {
		if dockerMgr == nil {
			return errorResponse(cmd.Id, "Docker not available")
		}
		req := cmd.GetDockerAction()
		err := dockerMgr.ContainerAction(req.ContainerId, req.Action)
		success := true
		msg := fmt.Sprintf("Container %s %sed", req.ContainerId, req.Action)
		if err != nil {
			success = false
			msg = err.Error()
		}
		return &proto.Telemetry{
			Payload: &proto.Telemetry_Response{
				Response: &proto.CommandResponse{
					CommandId: cmd.Id,
					Success:   success,
					Message:   msg,
				},
			},
		}
	}

	if cmd.Type == proto.Command_FETCH_LOGS {
		lines := "50"
		if req := cmd.GetFetchLogs(); req != nil && req.Lines > 0 {
			lines = fmt.Sprintf("%d", req.Lines)
		}
		var out []byte
		var err error
		if runtime.GOOS == "windows" {
			psCmd := fmt.Sprintf("Get-EventLog -LogName System -Newest %s | Select-Object -Property TimeGenerated, EntryType, Message | Format-Table -AutoSize | Out-String -Width 4096", lines)
			out, err = exec.Command("powershell", "-Command", psCmd).CombinedOutput()
		} else {
			out, err = exec.Command("journalctl", "-n", lines, "--no-pager", "--output=short").CombinedOutput()
		}
		resultText := string(out)
		if err != nil {
			resultText += "\nError fetching logs: " + err.Error()
		}
		return &proto.Telemetry{
			Payload: &proto.Telemetry_Response{
				Response: &proto.CommandResponse{
					CommandId:  cmd.Id,
					Success:    true,
					ResultData: &proto.CommandResponse_LogData{LogData: resultText},
				},
			},
		}
	}

	if cmd.Type == proto.Command_SYSTEM_REBOOT {
		go func() {
			time.Sleep(2 * time.Second)
			if runtime.GOOS == "windows" {
				exec.Command("shutdown", "/r", "/t", "2", "/f").Run()
			} else {
				exec.Command("reboot").Run()
			}
		}()
		return successResponse(cmd.Id, "System is rebooting...")
	}

	if cmd.Type == proto.Command_SYSTEM_SHUTDOWN {
		go func() {
			time.Sleep(2 * time.Second)
			if runtime.GOOS == "windows" {
				exec.Command("shutdown", "/s", "/t", "2", "/f").Run()
			} else {
				exec.Command("shutdown", "-h", "now").Run()
			}
		}()
		return successResponse(cmd.Id, "System is shutting down...")
	}

	if cmd.Type == proto.Command_SYSTEM_SUSPEND {
		go func() {
			time.Sleep(2 * time.Second)
			if runtime.GOOS == "windows" {
				// Hibernate off, Suspend on
				exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0").Run()
			} else {
				// Systemd suspend
				exec.Command("systemctl", "suspend").Run()
			}
		}()
		return successResponse(cmd.Id, "System is suspending...")
	}

	if cmd.Type == proto.Command_RESTART_AGENT {
		go func() {
			time.Sleep(2 * time.Second)
			os.Exit(0)
		}()
		return successResponse(cmd.Id, "Agent is restarting...")
	}

	if killPayload := cmd.GetKillProcess(); killPayload != nil {
		pid := killPayload.Pid
		proc, err := os.FindProcess(int(pid))
		success := true
		errMsg := ""
		if err == nil {
			err = proc.Kill()
		}
		if err != nil {
			success = false
			errMsg = err.Error()
		}
		return &proto.Telemetry{
			Payload: &proto.Telemetry_Response{
				Response: &proto.CommandResponse{
					CommandId: cmd.Id,
					Success:   success,
					Message:   errMsg,
				},
			},
		}
	}

	if cmd.GetListProcesses() != nil {
		procs, err := process.Processes()
		if err != nil {
			return errorResponse(cmd.Id, err.Error())
		}
		var allProcs []*proto.ProcessInfo
		for _, p := range procs {
			name, err := p.Name()
			if err != nil {
				continue
			}
			cpu, _ := p.CPUPercent()
			mem, _ := p.MemoryPercent()
			allProcs = append(allProcs, &proto.ProcessInfo{
				Pid:           int32(p.Pid),
				Name:          name,
				CpuPercent:    cpu,
				MemoryPercent: float64(mem),
			})
		}
		sort.Slice(allProcs, func(i, j int) bool { return allProcs[i].CpuPercent > allProcs[j].CpuPercent })
		return &proto.Telemetry{
			Payload: &proto.Telemetry_Response{
				Response: &proto.CommandResponse{
					CommandId: cmd.Id,
					Success:   true,
					ResultData: &proto.CommandResponse_ProcessList{
						ProcessList: &proto.ProcessList{Processes: allProcs},
					},
				},
			},
		}
	}
	if cmd.Type == proto.Command_LIST_SERVICES {
		// Linux only support for now (Systemd)
		if runtime.GOOS != "linux" {
			return errorResponse(cmd.Id, "Service management is only supported on Linux (systemd) for now.")
		}

		// Run systemctl list-units
		// --no-pager: No paging
		// --no-legend: No header/footer
		// --plain: Simple output
		out, err := exec.Command("systemctl", "list-units", "--type=service", "--all", "--no-pager", "--no-legend", "--plain").CombinedOutput()
		if err != nil {
			return errorResponse(cmd.Id, "Failed to list services: "+err.Error())
		}

		lines := strings.Split(string(out), "\n")
		var services []*proto.ServiceInfo

		for _, line := range lines {
			if strings.TrimSpace(line) == "" {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) < 4 {
				continue
			}

			// Example: cron.service loaded active running Regular background program processing daemon
			name := parts[0]
			loadState := parts[1]
			activeState := parts[2]
			subState := parts[3]

			// Description can be multiple words
			desc := ""
			if len(parts) > 4 {
				desc = strings.Join(parts[4:], " ")
			}

			services = append(services, &proto.ServiceInfo{
				Name:        name,
				LoadState:   loadState,
				ActiveState: activeState,
				SubState:    subState,
				Description: desc,
			})
		}

		return &proto.Telemetry{
			Payload: &proto.Telemetry_Response{
				Response: &proto.CommandResponse{
					CommandId: cmd.Id,
					Success:   true,
					ResultData: &proto.CommandResponse_ServiceList{
						ServiceList: &proto.ServiceList{Services: services},
					},
				},
			},
		}
	}

	if cmd.Type == proto.Command_SERVICE_ACTION {
		if runtime.GOOS != "linux" {
			return errorResponse(cmd.Id, "Service management is only supported on Linux.")
		}

		req := cmd.GetServiceAction()
		if req == nil {
			return errorResponse(cmd.Id, "Invalid request payload")
		}

		// Sanitize Service Name — strict whitelist to prevent command injection
		// Only allow typical systemd unit names: alphanumeric, dash, underscore, dot, @
		validServiceName := regexp.MustCompile(`^[a-zA-Z0-9@._-]+$`)
		if !validServiceName.MatchString(req.ServiceName) {
			return errorResponse(cmd.Id, "Invalid service name: contains disallowed characters")
		}

		// Action validation
		validActions := map[string]bool{"start": true, "stop": true, "restart": true, "enable": true, "disable": true}
		if !validActions[req.Action] {
			return errorResponse(cmd.Id, "Invalid action")
		}

		// Run systemctl
		// Example: systemctl restart nginx
		out, err := exec.Command("systemctl", req.Action, req.ServiceName).CombinedOutput()
		success := true
		msg := fmt.Sprintf("Service %s %sed successfully", req.ServiceName, req.Action)

		if err != nil {
			success = false
			msg = fmt.Sprintf("Failed to %s service %s: %s", req.Action, req.ServiceName, string(out))
		}

		return &proto.Telemetry{
			Payload: &proto.Telemetry_Response{
				Response: &proto.CommandResponse{
					CommandId: cmd.Id,
					Success:   success,
					Message:   msg,
				},
			},
		}
	}

	return nil
}

func successResponse(cmdID, msg string) *proto.Telemetry {
	return &proto.Telemetry{
		Payload: &proto.Telemetry_Response{
			Response: &proto.CommandResponse{CommandId: cmdID, Success: true, Message: msg},
		},
	}
}

func errorResponse(cmdID, msg string) *proto.Telemetry {
	return &proto.Telemetry{
		Payload: &proto.Telemetry_Response{
			Response: &proto.CommandResponse{CommandId: cmdID, Success: false, Message: msg},
		},
	}
}

// Finds local IP used to connect to target address
func getOutboundIP(targetAddr string) string {
	host, _, _ := net.SplitHostPort(targetAddr)
	if host == "" || host == "localhost" {
		// If target is localhost, test via external (Google DNS)
		host = "8.8.8.8"
		targetAddr = "8.8.8.8:80"
	} else {
		// If target is specific IP without port
		if _, _, err := net.SplitHostPort(targetAddr); err != nil {
			targetAddr = net.JoinHostPort(host, "80")
		}
	}

	conn, err := net.Dial("udp", targetAddr)
	if err != nil {
		return "127.0.0.1"
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

// getMacAddress returns the MAC address of the primary network interface
func getMacAddress() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	for _, iface := range ifaces {
		// Skip loopback, down interfaces, and virtual interfaces
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		if iface.Flags&net.FlagUp == 0 {
			continue
		}

		// Skip virtual/docker interfaces
		name := strings.ToLower(iface.Name)
		if strings.HasPrefix(name, "veth") || strings.HasPrefix(name, "docker") ||
			strings.HasPrefix(name, "br-") || strings.HasPrefix(name, "virbr") {
			continue
		}

		if len(iface.HardwareAddr) > 0 {
			return iface.HardwareAddr.String()
		}
	}
	return ""
}
