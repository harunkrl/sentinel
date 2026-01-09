# Sentinel Agent Windows Uninstaller
# Run as Administrator

$ServiceName = "SentinelAgent"
$InstallDir = "C:\Program Files\Sentinel"

# Check Administrator Privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ Error: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "🗑️  Sentinel Agent Uninstaller (Windows)" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Gray

# 1. Stop Service
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -eq 'Running') {
        Write-Host "⏹️  Stopping service..." -ForegroundColor Yellow
        Stop-Service -Name $ServiceName -Force
        Start-Sleep -Seconds 2
    }
    
    Write-Host "🔌 Removing service..." -ForegroundColor Yellow
    sc.exe delete $ServiceName | Out-Null
    Write-Host "✅ Service removed." -ForegroundColor Green
} else {
    Write-Host "⚠️  Service not found, skipping." -ForegroundColor Yellow
}

# 2. Remove Environment Variable
$envVar = [System.Environment]::GetEnvironmentVariable("CORE_ADDRESS", "Machine")
if ($envVar) {
    Write-Host "🔧 Removing environment variable..." -ForegroundColor Yellow
    [System.Environment]::SetEnvironmentVariable("CORE_ADDRESS", $null, "Machine")
    Write-Host "✅ Environment variable removed." -ForegroundColor Green
}

# 3. Remove Install Directory
if (Test-Path -Path $InstallDir) {
    Write-Host "📦 Removing install directory..." -ForegroundColor Yellow
    Remove-Item -Path $InstallDir -Recurse -Force
    Write-Host "✅ Install directory removed." -ForegroundColor Green
} else {
    Write-Host "⚠️  Install directory not found, skipping." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Uninstall Complete. Sentinel Agent has been removed." -ForegroundColor Green
