<#
.SYNOPSIS
    Automated development environment launcher for ChatterBase.
.DESCRIPTION
    Launches 3 tabs in Windows Terminal (or 3 PowerShell windows as fallback):
    - Tab 1: Frontend (Next.js - npm run dev)
    - Tab 2: Redis Server (local native Windows binary)
    - Tab 3: Backend Go (waits for Redis, then starts air or go run main.go)
#>

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$frontendDir = Join-Path $projectRoot "frontend"
$backendGoDir = Join-Path $projectRoot "backend-go"

# Resolve Redis Server executable
$redisExe = if (Test-Path "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe") {
    "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe"
} elseif (Get-Command redis-server -ErrorAction SilentlyContinue) {
    (Get-Command redis-server).Source
} else {
    "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe"
}

$redisCli = if (Test-Path "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-cli.exe") {
    "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-cli.exe"
} elseif (Get-Command redis-cli -ErrorAction SilentlyContinue) {
    (Get-Command redis-cli).Source
} else {
    "redis-cli"
}

$goBinDir = "$env:LOCALAPPDATA\Programs\go\bin"
$gopathBinDir = "$env:USERPROFILE\go\bin"

# Script blocks to execute in each tab
$frontendCmd = "Set-Location '$frontendDir'; Write-Host 'Starting Next.js Frontend...' -ForegroundColor Cyan; npm run dev"

$redisCmd = @"
if (Test-Path '$redisCli') {
    `$ping = & '$redisCli' ping 2>`$null
    if (`$ping -eq 'PONG') {
        Write-Host 'Redis is already running on port 6379.' -ForegroundColor Green
        & '$redisCli' ping
        return
    }
}
Write-Host 'Starting Redis Server on port 6379...' -ForegroundColor Cyan
& '$redisExe'
"@

$backendGoCmd = @"
`$env:PATH = '$goBinDir;$gopathBinDir;' + `$env:PATH
Set-Location '$backendGoDir'
Write-Host 'Checking for Redis on port 6379...' -ForegroundColor Yellow
`$attempts = 10
while (`$attempts -gt 0) {
    if (Test-Path '$redisCli') {
        `$ping = & '$redisCli' ping 2>`$null
        if (`$ping -eq 'PONG') { break }
    }
    Start-Sleep -Milliseconds 500
    `$attempts--
}
Write-Host 'Redis is ready! Starting Backend Go...' -ForegroundColor Green
if (Get-Command air -ErrorAction SilentlyContinue) {
    air
} else {
    go run main.go
}
"@

# Check if Windows Terminal (wt.exe) is available
if (Get-Command wt.exe -ErrorAction SilentlyContinue) {
    Write-Host "Launching 3 development tabs in Windows Terminal..." -ForegroundColor Cyan

    & wt.exe -w 0 `
        new-tab --title "Frontend" -d "$frontendDir" powershell -NoExit -Command $frontendCmd `; `
        new-tab --title "Redis" -d "$projectRoot" powershell -NoExit -Command $redisCmd `; `
        new-tab --title "Backend-Go" -d "$backendGoDir" powershell -NoExit -Command $backendGoCmd
} else {
    Write-Host "Windows Terminal (wt.exe) not detected. Launching separate PowerShell windows..." -ForegroundColor Yellow

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $redisCmd
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendGoCmd
}

Write-Host "All development services triggered successfully." -ForegroundColor Green
