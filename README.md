# Sentinel - Distributed System Monitoring and Management

<div align="center">

![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?style=for-the-badge&logo=go)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwindcss)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Real-time system monitoring, remote management, and Docker container control.**

*Senior Design Project - Software Engineering*

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Security](#-security)
- [Development](#-development)

---

## 🚀 Features

### System Monitoring
| Feature | Description |
|---------|-------------|
| **CPU Monitoring** | Real-time CPU usage, per-core analysis |
| **RAM Monitoring** | Memory usage, swap status |
| **Disk I/O** | Read/write speeds, disk capacity |
| **Network Traffic** | Inbound/outbound bandwidth monitoring |
| **Temperature** | CPU thermal sensor data |
| **System Info** | Hostname, OS, uptime, IP addresses |

### Remote Management
- 🔄 **System Reboot/Shutdown**
- ⚡ **Process Management** (list, kill)
- 🐳 **Docker Container Control** (start/stop/restart)
- 🔧 **Systemd Service Management** (Linux)
- 📦 **Agent Update** (remote one-click update)

### Alerting System
- 📊 Threshold-based alerts (CPU, RAM, Disk, Temperature)
- 📱 Ntfy.sh integration (mobile notifications)
- 📜 Audit logs

---

## 🛠 Tech Stack

### Backend (Go)
| Component | Technology | Description |
|-----------|------------|-------------|
| HTTP API | Gin | RESTful API framework |
| RPC | gRPC + Protobuf | Agent-Server communication |
| Metrics DB | InfluxDB | Time-series database |
| Metadata DB | SQLite | Users, agents, settings |
| Auth | JWT + bcrypt | Token-based authentication |
| Rate Limit | Custom middleware | Brute-force protection |

### Frontend (React)
| Component | Technology |
|-----------|------------|
| Framework | React 19 + Vite 7 |
| Styling | TailwindCSS 4 |
| Charts | Recharts |
| Dashboard | Single Page Application (SPA) |
| State | React Context API |

### Agent
| Platform | Technology |
|----------|------------|
| Linux/Windows | Go + gopsutil |
| Docker SDK | Docker API client |
| Systemd | D-Bus interface |
| TLS / Insecure | Configurable via `SENTINEL_INSECURE_TLS` |

### DevOps
| Component | Technology |
|-----------|------------|
| Containerization | Docker + Docker Compose |
| Multi-stage builds | Alpine Linux |
| Reverse Proxy | Nginx |

---

## 📦 Installation

### Prerequisites
- Docker & Docker Compose
- Go 1.25+ (for development)
- Node.js 20+ (for development)

### 1. Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/harunkrl/sentinel.git
cd sentinel

# Start Development environment
# (.env is auto-created from .env.example if missing)
./compile_and_run.sh --dev

# Get initial admin password
docker logs sentinel_core | grep -A3 "INITIAL ADMIN"
```

> **Note:** If no `.env` file exists, the startup script automatically creates one from `.env.example` (dev) or `.env.production.example` (prod).

### 2. Production Setup

```bash
# Create production environment file
cp .env.production.example .env
# IMPORTANT: Edit .env and set secure values
# INFLUXDB_TOKEN must match DOCKER_INFLUXDB_INIT_ADMIN_TOKEN
nano .env

# Start Production
./compile_and_run.sh --prod
```

> **Important:** `INFLUXDB_TOKEN` and `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN` **must be identical**, otherwise InfluxDB will return 401 Unauthorized errors.

### 3. Agent Installation

The startup script auto-detects your server's LAN IP and prints the correct install command. You can also copy it from the Dashboard's "Add Agent" button.

#### Linux (Production - Port 80)
```bash
curl -sL http://<SERVER_IP>/downloads/install.sh | sudo bash -s <SERVER_IP>
```

#### Linux (Development - Port 3000)
```bash
curl -sL http://<SERVER_IP>:3000/downloads/install.sh | sudo bash -s <SERVER_IP>
```

#### Windows (PowerShell - Admin)
```powershell
Invoke-WebRequest -Uri "http://<SERVER_IP>/downloads/install.ps1" -OutFile "install.ps1"
.\install.ps1 -ServerIP <SERVER_IP>
```

> **Tip:** When running without TLS certificates, set `SENTINEL_INSECURE_TLS=true` in the agent's systemd service file to enable plaintext gRPC communication.

---

## 🔑 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INFLUXDB_URL` | `http://influxdb:8086` | InfluxDB connection URL |
| `INFLUXDB_TOKEN` | — | InfluxDB auth token (**must match** `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN`) |
| `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN` | — | InfluxDB init token |
| `JWT_SECRET` | auto | JWT signing key |
| `CORS_ALLOWED_ORIGINS` | `*` | Allowed CORS origins |
| `GRPC_PORT` | `50051` | gRPC server port |
| `METRIC_INTERVAL_SECONDS` | `2` | Agent metric collection interval |
| `ALERT_DEBOUNCE_MINUTES` | `5` | Alert notification cooldown |
| `SENTINEL_INSECURE_TLS` | `false` | Agent: use plaintext gRPC (no TLS) |
| `NTFY_TOPIC` | — | Ntfy.sh topic for push notifications |

---

## 🛠 Operations Scripts

Sentinel includes utility scripts for common operational tasks. All scripts are available via `make` shortcuts.

### Quick Reference

| Command | Script | Description |
|---------|--------|-------------|
| `make dev` | `scripts/dev.sh` | Start development environment |
| `make prod` | `scripts/prod.sh` | Start production environment |
| `make stop` | — | Stop all containers |
| `make status` | `scripts/status.sh` | Service health check (uptime, resources) |
| `make logs` | `scripts/logs.sh` | Filtered log viewer (`--errors`, `--follow`) |
| `make doctor` | `scripts/doctor.sh` | Diagnose .env, ports, Docker, TLS |
| `make backup` | `scripts/backup.sh` | Backup InfluxDB + SQLite + settings |
| `make reset` | `scripts/reset.sh` | Clean wipe all data (interactive) |
| `make update` | `scripts/update.sh` | git pull + backup + rebuild |
| `make generate-certs` | `scripts/generate-certs.sh` | Generate self-signed TLS certificates |
| `make build-all` | — | Build core + all agent binaries |
| `make test` | — | Run tests and `go vet` |

### Examples

```bash
# Quick health check
make status

# Diagnose common issues
make doctor

# View only error logs
./scripts/logs.sh --errors

# Backup before maintenance
make backup

# Generate TLS certs for gRPC
make generate-certs
```

---

## 🖥 Usage

### Dashboard
1. Open in browser:
   - **Production:** `http://<SERVER_IP>` (port 80)
   - **Development:** `http://<SERVER_IP>:3000`
2. Login with Admin credentials.
3. View connected agents on the dashboard.

### Dashboard Features
- ➕ **Add Agent:** Add new agents via install command
- ⭐ **Favorite Agents:** Pin important agents to the top
- 🗑️ **Delete Agent:** Quickly remove offline agents
- 🌡️ **CPU Temp:** Real-time thermal indicator

### Agent Detail Page
- Real-time metric charts
- **Avg/Min/Max statistics** (based on time range)
- Process list and management
- Docker container control
- Service management (Linux)

### Settings
- Notification preferences
- Threshold configuration
- Ntfy.sh integration
- Change password

---

## 📡 API Reference

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Liveness check (Docker/LB probes) |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/check` | Verify token validity |
| POST | `/api/auth/change-password` | Change password |

### Agent Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| DELETE | `/api/agent/:id` | Remove agent |
| GET | `/api/agent/:id/history` | Metric history |
| GET | `/api/agent/:id/stats?range=1h` | Avg/Min/Max stats |
| POST | `/api/agent/:id/action` | Send system command |
| POST | `/api/agent/:id/update` | Remote agent update |
| POST | `/api/agent/:id/wake` | Wake agent |
| GET | `/api/agent/:id/logs` | Get agent logs |
| GET | `/api/command/:id` | Get command result |

### Processes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/:id/processes` | List processes |
| POST | `/api/agent/:id/kill` | Kill process |

### Docker
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/:id/containers` | List containers |
| POST | `/api/agent/:id/docker` | Container action |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/:id/services` | List services |
| POST | `/api/agent/:id/service/action` | Service action |

### Settings & Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get settings |
| POST | `/api/settings` | Save settings |
| GET | `/api/events` | SSE live event stream |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs` | Get audit logs |
| DELETE | `/api/audit-logs` | Clear audit logs |

---

## 📁 Project Structure

```
sentinel/
├── cmd/
│   ├── core/              # Main server entry point
│   │   └── main.go
│   └── agent/             # Agent entry point
│       └── main.go
├── internal/
│   ├── server/            # HTTP & gRPC handlers
│   │   ├── http.go
│   │   └── grpc.go
│   ├── middleware/        # Auth & rate limiting
│   │   ├── auth.go
│   │   └── ratelimit.go
│   ├── store/             # Database operations
│   │   ├── db.go          # SQLite
│   │   └── influx.go      # InfluxDB
│   ├── config/            # Configuration management
│   ├── collector/         # Metric collection
│   └── alert/             # Alerting system
├── web/                   # React frontend
│   └── src/
│       ├── components/    # UI components
│       ├── context/       # React context
│       └── utils/         # Helper functions
├── website/               # Landing Page & Documentation (Next.js)
├── proto/                 # Protobuf definitions
├── deploy/
│   ├── Dockerfile.core
│   ├── Dockerfile.web
│   └── downloads/         # Agent install scripts
├── scripts/
│   ├── dev.sh             # Dev wrapper → compile_and_run.sh
│   ├── prod.sh            # Prod wrapper → compile_and_run.sh
│   ├── status.sh          # Service health check
│   ├── logs.sh            # Filtered log viewer
│   ├── doctor.sh          # Diagnostics
│   ├── backup.sh          # Data backup
│   ├── reset.sh           # Clean reset
│   ├── update.sh          # Self-update server
│   └── generate-certs.sh  # TLS certificate generator
├── Makefile               # Unified command interface
├── docker-compose.yml
├── docker-compose.dev.yml
└── docker-compose.prod.yml
```

---

## 🏗 Architecture

```mermaid
graph TB
    subgraph "Frontend"
        Browser[React Dashboard]
    end
    
    subgraph "Backend"
        HTTP[HTTP API :8080]
        GRPC[gRPC Server :50051]
        SSE[SSE Events]
    end
    
    subgraph "Storage"
        InfluxDB[(InfluxDB)]
        SQLite[(SQLite)]
    end
    
    subgraph "Agents"
        Agent1[Linux Agent]
        Agent2[Windows Agent]
        Agent3[RPi Agent]
    end
    
    Browser -->|REST API| HTTP
    Browser -->|Real-time| SSE
    HTTP --> InfluxDB
    HTTP --> SQLite
    
    Agent1 -->|gRPC Stream| GRPC
    Agent2 -->|gRPC Stream| GRPC
    Agent3 -->|gRPC Stream| GRPC
    
    GRPC --> InfluxDB
    GRPC --> SQLite
```

---

## 🔒 Security

| Feature | Implementation |
|---------|----------------|
| **gRPC Transport** | TLS by default; auto-fallback to plaintext if no certs found (`SENTINEL_INSECURE_TLS`) |
| Authentication | JWT (24-hour validity) |
| Password Hashing | bcrypt |
| Rate Limiting | **Token Bucket** algorithm (golang.org/x/time/rate) |
| CORS | Configurable origins |
| **Audit Logs** | Tracks critical actions (updates, deletions) |

---

## 🔧 Development

### Local Development
```bash
# Start everything in dev mode (recommended)
make dev

# Run backend only
go run cmd/core/main.go

# Run frontend only
cd web && npm install && npm run dev

# Website (Landing & Docs)
cd website && npm install && npm run dev

# Agent test
go run cmd/agent/main.go --server=localhost:50051
```

### Build Agents
```bash
make build-all    # Core + Linux + ARM + Windows agents
make build-agent   # Linux AMD64 only
```

### Proto Compilation
```bash
# Handled automatically by compile_and_run.sh, or manually:
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/service.proto
```

### Run Diagnostics
```bash
make doctor    # Check .env, ports, Docker, TLS certs
make status    # Container health, uptime, resources
```

---

## 📄 License

MIT License

---

## 🤝 Contribution

This project was developed as a Senior Design Project for Software Engineering.

---

<div align="center">
<b>Sentinel</b> - Monitor and manage distributed systems from a single point.
</div>
