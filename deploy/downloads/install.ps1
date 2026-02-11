# Sentinel Agent Windows Installer
# Run as Administrator

param (
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,

    [Parameter(Mandatory=$false)]
    [string]$WebPort = "80"
)

# Configuration
$ProcessName = "sentinel-agent-windows-amd64"
$BinaryName = "sentinel-agent.exe"
$InstallDir = "C:\Program Files\Sentinel"
$ServiceName = "SentinelAgent"
$CorePort = "50051"

# Check Administrator Privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ Error: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Sentinel Agent Installer (Windows)" -ForegroundColor Cyan
Write-Host "Target Server: $ServerIP (Web Port: $WebPort)" -ForegroundColor Gray

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
if ($WebPort -eq "80") {
    $DownloadUrl = "http://${ServerIP}/downloads/${ProcessName}.exe"
} else {
    $DownloadUrl = "http://${ServerIP}:${WebPort}/downloads/${ProcessName}.exe"
}
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

# 4. Set Environment Variables (Persistent, Machine-level)
[System.Environment]::SetEnvironmentVariable("CORE_ADDRESS", "${ServerIP}:${CorePort}", "Machine")
Write-Host "✅ CORE_ADDRESS set to ${ServerIP}:${CorePort}" -ForegroundColor Green

[System.Environment]::SetEnvironmentVariable("SENTINEL_INSECURE_TLS", "true", "Machine")
Write-Host "✅ SENTINEL_INSECURE_TLS set to true (plaintext gRPC)" -ForegroundColor Green

# 5. Create/Update Service
if (-not $service) {
    Write-Host "🔧 Creating Windows Service..." -ForegroundColor Cyan
    New-Service -Name $ServiceName -BinaryPathName $DestPath -DisplayName "Sentinel System Monitor" -StartupType Automatic
} else {
    Write-Host "🔧 Service already exists. Binary updated." -ForegroundColor Cyan
}

# 6. Start Service
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