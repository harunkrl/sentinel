# Sentinel - Technical Architecture and Detailed Guide

This document provides a detailed explanation of the Sentinel project's technical architecture, technologies used, and code structure.

---

## 📚 Table of Contents

1. [Overview](#1-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Agent Structure](#4-agent-structure)
5. [Communication Protocols](#5-communication-protocols)
6. [Database Design](#6-database-design)
7. [Security Implementation](#7-security-implementation)
8. [Docker and Deployment](#8-docker-and-deployment)
9. [Test Strategy](#9-test-strategy)

---

## 1. Overview

Sentinel is a platform designed to monitor and manage distributed systems. It consists of three main components:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Frontend  │────▶│   Core Server   │◀────│     Agents      │
│    (React)      │REST │      (Go)       │gRPC │      (Go)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │InfluxDB │ │ SQLite  │ │  Ntfy   │
              │(Metrics)│ │(Config) │ │(Alerts) │
              └─────────┘ └─────────┘ └─────────┘
```

### Why These Technologies?

| Technology | Why Selected? |
|------------|---------------|
| **Go** | Low memory usage, cross-compile support, easy deployment |
| **gRPC** | Bidirectional streaming, low latency, type safety with Protobuf |
| **InfluxDB** | Optimized for time-series data, high write throughput |
| **React** | Component-based, vast ecosystem, rapid development |
| **TailwindCSS** | Utility-first, fast UI development, small bundle size |

---

## 2. Backend Architecture

### 2.1 Directory Structure

```
cmd/
├── core/main.go      # Main server entry point
└── agent/main.go     # Agent entry point

internal/
├── server/
│   ├── grpc.go       # gRPC handlers
│   └── http.go       # REST API handlers
├── middleware/
│   ├── auth.go       # JWT authentication
│   └── ratelimit.go  # Rate limiting
├── store/
│   ├── db.go         # SQLite operations
│   └── influx.go     # InfluxDB operations
├── config/
│   └── settings.go   # Configuration management
├── collector/
│   └── metrics.go    # Metric collection
└── alert/
    └── alert.go      # Alerting system
```

### 2.2 Core Server (`cmd/core/main.go`)

```go
func main() {
    // 1. InfluxDB connection
    influxStore := store.NewInfluxStore(...)
    
    // 2. SQLite connection
    sqliteStore := store.NewStore(...)
    
    // 3. Create Core server
    core := server.NewCoreServer(influxStore, sqliteStore)
    
    // 4. Boostrap Admin user
    if _, err := sqliteStore.GetUser("admin"); err != nil {
        core.CreateUser("admin", randomPassword, "admin")
    }
    
    // 5. Start gRPC server (for agents)
    go startGRPCServer(core)
    
    // 6. Start HTTP server (for frontend)
    startHTTPServer(core)
}
```

**Key Concepts:**

- **Dependency Injection**: Stores are injected into the core.
- **Concurrent Servers**: gRPC and HTTP run simultaneously.
- **Bootstrap Pattern**: Admin user is created on first run.

### 2.3 HTTP API Handlers (`internal/server/http.go`)

```go
func NewHttpServer(core *CoreServer) *HttpServer {
    r := gin.Default()
    
    // CORS middleware
    r.Use(corsMiddleware())
    
    api := r.Group("/api")
    
    // Public routes
    api.POST("/auth/login", 
        middleware.RateLimitMiddleware(middleware.LoginLimiter),
        s.handleLogin)
    
    // Protected routes
    api.Use(middleware.AuthMiddleware())
    api.Use(middleware.RateLimitMiddleware(middleware.APILimiter))
    {
        api.GET("/agents", s.handleGetAgents)
        api.POST("/agent/:id/action", s.handleAgentAction)
        // ...
    }
    
    return &HttpServer{engine: r, core: core}
}
```

**Gin Framework:**
- High-performance HTTP router
- Middleware support
- JSON binding/validation

### 2.4 gRPC Server (`internal/server/grpc.go`)

```go
func (s *CoreServer) StreamTelemetry(stream proto.SystemMonitor_StreamTelemetryServer) error {
    for {
        // Receive message from Agent
        telemetry, err := stream.Recv()
        if err != nil {
            // Agent disconnected
            s.markAgentOffline(agentID)
            return err
        }
        
        switch telemetry.Type {
        case proto.Telemetry_HANDSHAKE:
            // Agent register/update
            s.registerAgent(telemetry.Handshake)
            
        case proto.Telemetry_METRICS:
            // Record metrics
            s.influxStore.WriteMetrics(telemetry.Metrics)
            
            // Broadcast to SSE clients
            s.broadcastToSSE(telemetry.Metrics)
        }
    }
}
```

**Bidirectional Streaming:**
- Agent continuously sends metrics
- Server can send commands
- Agent marked offline if connection drops

---

## 3. Frontend Architecture

### 3.1 React Component Structure

```
src/
├── components/
│   ├── Dashboard.jsx       # Main dashboard
│   ├── AgentDetail.jsx     # Agent detail page
│   ├── SettingsModal.jsx   # Settings modal
│   ├── Login.jsx           # Login page
│   └── ErrorBoundary.jsx   # Error handling
├── utils/
│   └── osHelpers.jsx       # Helper functions
├── App.jsx                 # Main app component
├── main.jsx                # Entry point
└── index.css               # Global styles
```

### 3.2 State Management

React Context API is used (No need for Redux):

```jsx
// App.jsx - Simple state management
function App() {
    const [token, setToken] = useState(localStorage.getItem("token"));
    
    const handleLoginSuccess = (newToken) => {
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };
    
    return (
        <ErrorBoundary>
            <Router>
                <Routes>
                    {!token ? (
                        <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                    ) : (
                        <Route path="/" element={<Dashboard />} />
                    )}
                </Routes>
            </Router>
        </ErrorBoundary>
    );
}
```

### 3.3 Real-time Updates (SSE)

```jsx
// Dashboard.jsx
useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/events`);
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Update agent metrics
        updateAgentMetrics(data);
    };
    
    return () => eventSource.close();
}, []);
```

**Server-Sent Events (SSE):**
- Unidirectional stream from server to client
- Simpler than WebSocket
- Auto reconnect

### 3.4 TailwindCSS 4 Usage

```css
/* index.css */
@import "tailwindcss";

@layer base {
  :root {
    --bg-primary: #030712;
    --text-primary: #f3f4f6;
  }
}

@layer components {
  .glass-panel {
    background-color: var(--bg-glass);
    @apply backdrop-blur-md shadow-xl;
    border: 1px solid var(--border-color);
  }
}
```

**CSS Variables + Tailwind:**
- Theme variables defined in CSS
- Tailwind custom classes created
- Utility classes combined using `@apply`

---

## 4. Agent Structure

### 4.1 Working Principle

```go
func runAgent(addr string, col *collector.Collector) error {
    // 1. TLS or Plaintext mode
    // Default: Secure (TLS with cert verification)
    // Set SENTINEL_INSECURE_TLS=true for plaintext gRPC (no TLS)
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

    conn, _ := grpc.NewClient(addr, dialOpt)
    
    // 2. Start Bidirectional stream
    stream, _ := client.StreamTelemetry(context.Background())
    
    // 3. Send Handshake
    stream.Send(&proto.Telemetry{
        Type: proto.Telemetry_HANDSHAKE,
        Handshake: &proto.Handshake{
            Hostname: hostname,
            Os: runtime.GOOS,
            Arch: runtime.GOARCH,
        },
    })
    
    // 4. Goroutine to listen for commands
    go listenForCommands(stream)
    
    // 5. Metric sending loop
    for {
        metrics := collectMetrics()
        stream.Send(&proto.Telemetry{
            Type: proto.Telemetry_METRICS,
            Metrics: metrics,
        })
        time.Sleep(interval) // Default 2s, configurable via METRIC_INTERVAL_SECONDS
    }
}
```

> **Note:** When `SENTINEL_INSECURE_TLS=true`, the agent uses `insecure.NewCredentials()` for plaintext gRPC. This must match the Core Server's mode — if the Core has no TLS certificates, it also runs in plaintext.

### 4.2 Metric Collection (`gopsutil`)

```go
func collectMetrics() *proto.MetricData {
    // CPU
    cpuPercent, _ := cpu.Percent(0, false)
    
    // RAM
    mem, _ := mem.VirtualMemory()
    
    // Disk
    diskStat, _ := disk.Usage("/")
    
    // Network
    netIO, _ := net.IOCounters(false)
    
    return &proto.MetricData{
        CpuUsage:    cpuPercent[0],
        RamUsage:    mem.UsedPercent,
        DiskUsage:   diskStat.UsedPercent,
        NetworkIn:   netIO[0].BytesRecv,
        NetworkOut:  netIO[0].BytesSent,
    }
}
```

### 4.3 Command Processing

```go
func handleCommand(cmd *proto.Command) *proto.Telemetry {
    switch cmd.Type {
    case proto.Command_SYSTEM_REBOOT:
        exec.Command("reboot").Run()
        
    case proto.Command_KILL_PROCESS:
        process, _ := os.FindProcess(int(cmd.Payload))
        process.Kill()
        
    case proto.Command_LIST_CONTAINERS:
        containers := listDockerContainers()
        return &proto.Telemetry{
            Type: proto.Telemetry_COMMAND_RESULT,
            Result: containers,
        }
    }
    return nil
}
```

---

## 5. Communication Protocols

### 5.1 Protobuf Definitions

```protobuf
// proto/service.proto
service SystemMonitor {
    rpc StreamTelemetry(stream Telemetry) returns (stream Command);
}

message Telemetry {
    enum Type {
        HANDSHAKE = 0;
        METRICS = 1;
        COMMAND_RESULT = 2;
    }
    Type type = 1;
    Handshake handshake = 2;
    MetricData metrics = 3;
}

message Command {
    string id = 1;
    CommandType type = 2;
    bytes payload = 3;
}
```

**Protobuf Advantages:**
- Binary format (smaller than JSON)
- Type safety
- Automatic code generation

### 5.2 REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Liveness check |
| `/api/auth/login` | POST | Get JWT token |
| `/api/auth/check` | GET | Verify token validity |
| `/api/auth/change-password` | POST | Change password |
| `/api/agents` | GET | List agents |
| `/api/agent/:id/history` | GET | Metric history |
| `/api/agent/:id/stats?range=1h` | GET | Avg/Min/Max stats |
| `/api/agent/:id/action` | POST | Send command |
| `/api/agent/:id/processes` | POST | List processes |
| `/api/agent/:id/kill` | POST | Kill process |
| `/api/agent/:id/containers` | GET | List containers |
| `/api/agent/:id/docker` | POST | Container action |
| `/api/agent/:id/services` | GET | List services |
| `/api/agent/:id/service/action` | POST | Service action |
| `/api/agent/:id/update` | POST | Remote agent update |
| `/api/agent/:id/wake` | POST | Wake agent |
| `/api/agent/:id/logs` | GET | Agent logs |
| `/api/command/:id` | GET | Command result |
| `/api/settings` | GET/POST | Settings |
| `/api/events` | GET | SSE stream |
| `/api/audit-logs` | GET/DELETE | Audit logs |

---

## 6. Database Design

### 6.1 InfluxDB (Time Series)

```
Measurement: agent_metrics
Tags:
  - hostname: string
Fields:
  - cpu_usage: float
  - ram_usage: float
  - disk_usage: float
  - network_in: integer
  - network_out: integer
Time: timestamp
```

**Why InfluxDB?**
- Optimized for time-based queries
- Automatic downsampling
- High write throughput

### 6.2 SQLite (Metadata)

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT
);

CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    hostname TEXT,
    os TEXT,
    last_seen DATETIME
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    action TEXT,
    agent_id TEXT,
    timestamp DATETIME
);
```

---

## 7. Security Implementation

### 7.1 gRPC Transport Security (TLS / Plaintext)

The Core Server and Agent both support TLS and plaintext gRPC:

**Core Server** automatically detects TLS certificates:
```go
// Core attempts to load TLS certs; falls back to plaintext if not found
creds, err := credentials.NewServerTLSFromFile(certFile, keyFile)
if err != nil {
    log.Println("Warning: Falling back to INSECURE mode")
    grpcServer = grpc.NewServer() // Plaintext
} else {
    grpcServer = grpc.NewServer(grpc.Creds(creds)) // TLS
}
```

**Agent** uses `SENTINEL_INSECURE_TLS=true` for plaintext:
```go
if insecureTLS {
    dialOpt = grpc.WithTransportCredentials(insecure.NewCredentials()) // Plaintext
} else {
    dialOpt = grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{})) // TLS
}
```

> Both sides must be in the same mode. If the Core runs in plaintext (no certs), the Agent must set `SENTINEL_INSECURE_TLS=true`.

### 7.2 JWT Authentication

```go
func GenerateToken(username, role string) (string, error) {
    claims := &Claims{
        Username: username,
        Role:     role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(SecretKey)
}
```

### 7.3 Rate Limiting

```go
type RateLimiter struct {
    requests map[string]*requestInfo
    limit    int
    window   time.Duration
}

func (rl *RateLimiter) Allow(ip string) bool {
    // Check requests per IP
    if info.count >= rl.limit {
        return false
    }
    info.count++
    return true
}

// Usage:
// Login: 5 req/min
// API: 100 req/min
```

---

## 8. Docker and Deployment

### 8.1 Multi-stage Build

```dockerfile
# Dockerfile.core
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o sentinel-core ./cmd/core

FROM alpine:latest
COPY --from=builder /app/sentinel-core /usr/local/bin/
EXPOSE 8080 50051
CMD ["sentinel-core"]
```

### 8.2 Docker Compose Structure

```yaml
services:
  influxdb:
    image: influxdb:2.7
    
  core:
    build: ./deploy/Dockerfile.core
    depends_on: [influxdb]
    
  web:
    build: ./deploy/Dockerfile.web
    depends_on: [core]
```

### 8.3 Auto Environment Setup

The `compile_and_run.sh` script automatically handles environment configuration:

1. **Auto `.env` creation**: Creates `.env` from `.env.production.example` (prod) or `.env.example` (dev) if missing.
2. **Auto server IP detection**: Uses `hostname -I` to determine the LAN IP for install commands.
3. **InfluxDB token matching**: `INFLUXDB_TOKEN` must match `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN` in `.env`.

### 8.4 Port Configuration

| Port | Environment | Service | Description |
|------|-------------|---------|-------------|
| 80 | Prod | Web UI | Standard HTTP |
| 3000 | Dev | Web UI | Development |
| 8080 | Dev | API | Debug access |
| 8086 | Dev | InfluxDB | Database debug |
| 50051 | Both | gRPC | Agent connection |

**Startup:**
```bash
./compile_and_run.sh --prod  # Port 80
./compile_and_run.sh --dev   # Port 3000
```

### 8.5 Operations Tooling

Sentinel provides a suite of CLI tools for common operational tasks, all accessible via `make` shortcuts:

| Command | Script | Purpose |
|---------|--------|---------|
| `make dev` / `make prod` | `scripts/dev.sh`, `scripts/prod.sh` | Start environments (wrappers for `compile_and_run.sh`) |
| `make status` | `scripts/status.sh` | Container health, uptime, resource usage |
| `make logs` | `scripts/logs.sh` | Filtered, colorized log viewer |
| `make doctor` | `scripts/doctor.sh` | Diagnose `.env` tokens, port conflicts, Docker, TLS |
| `make backup` | `scripts/backup.sh` | Backup InfluxDB + SQLite + settings → `.tar.gz` |
| `make reset` | `scripts/reset.sh` | Clean wipe of all data volumes (interactive) |
| `make update` | `scripts/update.sh` | `git pull` + auto-backup + rebuild |
| `make generate-certs` | `scripts/generate-certs.sh` | Self-signed TLS certificate generator with SAN |

The `Makefile` acts as a unified command interface, covering build, Docker lifecycle, operations, and development tasks.

---

## 9. Test Strategy

### 9.1 Backend Tests (Go)

```go
func TestManager_SaveAndLoad(t *testing.T) {
    // Arrange
    mgr := NewManager(tempDir)
    settings := Settings{CPUThreshold: 80}
    
    // Act
    err := mgr.Save(settings)
    loaded := mgr.Get()
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, 80, loaded.CPUThreshold)
}
```

### 9.2 Frontend Tests (Vitest)

```jsx
describe('Login', () => {
    it('calls onLoginSuccess after successful login', async () => {
        axios.post.mockResolvedValueOnce({ data: { token: 'test' } });
        
        render(<Login onLoginSuccess={onLoginSuccess} />);
        
        fireEvent.click(screen.getByRole('button'));
        
        await waitFor(() => {
            expect(onLoginSuccess).toHaveBeenCalled();
        });
    });
});
```

---

## 📖 Conclusion

This document comprehensively explains the technical details of the Sentinel project. Each component is designed according to modern software development practices:

- **Separation of Concerns**: Each module has a single responsibility
- **Dependency Injection**: Testable code
- **Type Safety**: Protobuf
- **Security First**: JWT, rate limiting, bcrypt

Questions? [GitHub Issues](https://github.com/harunkrl/sentinel/issues)
