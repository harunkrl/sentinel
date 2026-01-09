# Sentinel Agent Windows Installer
# Run as Administrator

param (
    [Parameter(Mandatory=$true)]
    [string]$ServerIP
)

# Configuration
$ProcessName = "sentinel-agent-windows-amd64"
$BinaryName = "sentinel-agent.exe"
$InstallDir = "C:\Program Files\Sentinel"
$ServiceName = "SentinelAgent"
$WebPort = "3000"
$CorePort = "50051"

# Check Administrator Privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ Error: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Sentinel Agent Installer (Windows)" -ForegroundColor Cyan
Write-Host "Target Server: $ServerIP" -ForegroundColor Gray

# 1. Create Directory
if (-not (Test-Path -Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    Write-Host "✅ Created install directory: $InstallDir" -ForegroundColor Green
}

# 2. Stop Existing Service (if updating)
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "🔄 Setup detected existing service. Stopping..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 3. Download Binary
$DownloadUrl = "http://${ServerIP}:${WebPort}/downloads/${ProcessName}.exe"
$DestPath = "$InstallDir\$BinaryName"

Write-Host "⬇️  Downloading Agent from $DownloadUrl..." -ForegroundColor Cyan

try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $DestPath
} catch {
    Write-Host "❌ Download failed! Error: $_" -ForegroundColor Red
    exit 1
}

if (Test-Path -Path $DestPath) {
    Write-Host "✅ Download complete." -ForegroundColor Green
} else {
    Write-Host "❌ Error: File not found after download." -ForegroundColor Red
    exit 1
}

# 4. Create/Update Service
# We use sc.exe for reliable service creation with arguments
$BinPath = "$DestPath"
# Environment variables for service can be tricky in Windows. 
# Best way for Go method: Set machine-level environment variable OR pass as flag.
# Our agent looks for CORE_ADDRESS env var.
# Let's set it globally for the machine (Persistent)
[System.Environment]::SetEnvironmentVariable("CORE_ADDRESS", "${ServerIP}:${CorePort}", "Machine")
Write-Host "✅ Environment variable CORE_ADDRESS set to ${ServerIP}:${CorePort}" -ForegroundColor Green

if (-not $service) {
    Write-Host "🔧 Creating Windows Service..." -ForegroundColor Cyan
    New-Service -Name $ServiceName -BinaryPathName $BinPath -DisplayName "Sentinel System Monitor" -StartupType Automatic
} else {
    Write-Host "🔧 Service already exists. Binary updated." -ForegroundColor Cyan
}

# 5. Start Service
Write-Host "▶️  Starting Service..." -ForegroundColor Cyan
Start-Service -Name $ServiceName

Start-Sleep -Seconds 2
$service = Get-Service -Name $ServiceName
if ($service.Status -eq 'Running') {
    Write-Host "✅ Agent Installed & Running!" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Service failed to start." -ForegroundColor Red
    exit 1
}