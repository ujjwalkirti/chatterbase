<#
.SYNOPSIS
    Automated development environment launcher for ChatterBase.
.DESCRIPTION
    Launches ChatterBase development services:
    - Service 1: Frontend (Next.js on http://localhost:3000)
    - Service 2: Redis Server (local native Windows binary on port 6379)
    - Service 3: Backend (Go or Node.js on http://localhost:8000)

    Supports Windows Terminal tabs (default) or separate PowerShell windows.
.PARAMETER Backend
    Backend to launch: 'go' (default) or 'js' (Node.js/Express).
.PARAMETER SeparateWindows
    If specified, launches each service in its own independent PowerShell window instead of Windows Terminal tabs.
.EXAMPLE
    .\start-dev.ps1
    .\start-dev.ps1 -Backend js
    .\start-dev.ps1 -SeparateWindows
#>

[CmdletBinding()]
param(
    [ValidateSet("go", "js")]
    [string]$Backend = "go",

    [switch]$SeparateWindows
)

$ErrorActionPreference = "Stop"

$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$frontendDir = Join-Path $projectRoot "frontend"
$backendGoDir = Join-Path $projectRoot "backend-go"
$backendJsDir = Join-Path $projectRoot "backend-js"
$selectedBackendDir = if ($Backend -eq "go") { $backendGoDir } else { $backendJsDir }

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

# Script block: Frontend (Next.js)
$frontendScript = @"
`$host.UI.RawUI.WindowTitle = 'ChatterBase - Frontend'
Set-Location '$frontendDir'
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ' ChatterBase Frontend (Next.js)           ' -ForegroundColor Cyan
Write-Host ' Directory: $frontendDir                  ' -ForegroundColor Gray
Write-Host ' URL:       http://localhost:3000         ' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan
npm run dev
"@

# Script block: Redis Server
$redisScript = @"
`$host.UI.RawUI.WindowTitle = 'ChatterBase - Redis'
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ' ChatterBase Redis Server                 ' -ForegroundColor Cyan
Write-Host ' Port: 6379                               ' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan

`$redisCli = '$redisCli'
`$redisExe = '$redisExe'

`$isRunning = `$false
if (Test-Path `$redisCli) {
    try {
        `$ping = & `$redisCli ping 2>&1
        if (`$ping -match 'PONG') {
            `$isRunning = `$true
        }
    } catch {}
}

if (`$isRunning) {
    Write-Host 'Redis server is already running on port 6379.' -ForegroundColor Green
    & `$redisCli ping
    Write-Host 'Leaving session open for redis-cli commands.' -ForegroundColor Gray
} else {
    Write-Host 'Starting Redis Server on port 6379...' -ForegroundColor Cyan
    if (Test-Path `$redisExe) {
        & `$redisExe
    } else {
        Write-Host "Error: Redis executable not found at `$redisExe" -ForegroundColor Red
    }
}
"@

# Script block: Backend (Go or JS)
$backendStartupCode = if ($Backend -eq 'go') {
@"
`$env:PATH = '$goBinDir;$gopathBinDir;' + `$env:PATH
Set-Location '$backendGoDir'
if (Get-Command air -ErrorAction SilentlyContinue) {
    Write-Host 'Starting Go Backend with Air (live reload)...' -ForegroundColor Cyan
    air
} elseif (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host 'Starting Go Backend with go run main.go...' -ForegroundColor Cyan
    go run main.go
} else {
    Write-Host "Error: Neither 'air' nor 'go' found in PATH." -ForegroundColor Red
}
"@
} else {
@"
Set-Location '$backendJsDir'
Write-Host 'Starting Node.js Backend (npm run dev)...' -ForegroundColor Cyan
npm run dev
"@
}

$backendScript = @"
`$host.UI.RawUI.WindowTitle = 'ChatterBase - Backend ($($Backend.ToUpper()))'
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ' ChatterBase Backend ($($Backend.ToUpper()))' -ForegroundColor Cyan
Write-Host ' Directory: $selectedBackendDir           ' -ForegroundColor Gray
Write-Host ' Port:      8000                          ' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan

`$redisCli = '$redisCli'
Write-Host 'Waiting for Redis on port 6379...' -ForegroundColor Yellow
`$ready = `$false
for (`$i = 0; `$i -lt 30; `$i++) {
    if (Test-Path `$redisCli) {
        try {
            `$res = & `$redisCli ping 2>&1
            if (`$res -match 'PONG') {
                `$ready = `$true
                break
            }
        } catch {}
    }
    Start-Sleep -Milliseconds 500
}

if (`$ready) {
    Write-Host 'Redis is ready on port 6379!' -ForegroundColor Green
} else {
    Write-Host 'Warning: Redis did not respond within 15 seconds. Proceeding anyway...' -ForegroundColor Yellow
}

$backendStartupCode
"@

# Helper to convert scripts into base64 EncodedCommand
# (avoids any quote escaping, newline splitting, or semicolon issues across shells)
function ConvertTo-EncodedCommand {
    param([string]$Script)
    $bytes = [System.Text.Encoding]::Unicode.GetBytes($Script)
    return [Convert]::ToBase64String($bytes)
}

$frontendEnc = ConvertTo-EncodedCommand $frontendScript
$redisEnc = ConvertTo-EncodedCommand $redisScript
$backendEnc = ConvertTo-EncodedCommand $backendScript

Write-Host "Initializing ChatterBase development environment..." -ForegroundColor Cyan
Write-Host "  - [1/3] Frontend: Next.js (http://localhost:3000)" -ForegroundColor Gray
Write-Host "  - [2/3] Redis:    Local server (Port 6379)" -ForegroundColor Gray
Write-Host "  - [3/3] Backend:  $($Backend.ToUpper()) server (Port 8000)" -ForegroundColor Gray

# Launch services
$useWindowsTerminal = (-not $SeparateWindows) -and (Get-Command wt.exe -ErrorAction SilentlyContinue)

if ($useWindowsTerminal) {
    Write-Host "Launching services in Windows Terminal..." -ForegroundColor Cyan
    try {
        & wt.exe -w 0 `
            new-tab --title "Frontend" -d "$frontendDir" powershell.exe -NoExit -ExecutionPolicy Bypass -EncodedCommand $frontendEnc `; `
            new-tab --title "Redis" -d "$projectRoot" powershell.exe -NoExit -ExecutionPolicy Bypass -EncodedCommand $redisEnc `; `
            new-tab --title "Backend ($($Backend.ToUpper()))" -d "$selectedBackendDir" powershell.exe -NoExit -ExecutionPolicy Bypass -EncodedCommand $backendEnc
    } catch {
        Write-Host "Windows Terminal failed to launch ($($_.Exception.Message)). Falling back to separate windows..." -ForegroundColor Yellow
        Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $frontendEnc
        Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $redisEnc
        Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $backendEnc
    }
} else {
    Write-Host "Launching services in separate PowerShell windows..." -ForegroundColor Cyan
    Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $frontendEnc
    Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $redisEnc
    Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $backendEnc
}

Write-Host "All development services triggered successfully." -ForegroundColor Green
Write-Host "Tip: Use '.\start-dev.ps1 -SeparateWindows' to launch separate console windows." -ForegroundColor Gray
Write-Host "Tip: Use '.\start-dev.ps1 -Backend js' to run the Node.js/Express backend." -ForegroundColor Gray
