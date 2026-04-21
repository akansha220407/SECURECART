$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = "C:\Users\HP\AppData\Local\Programs\Python\Python311\python.exe"
$npmCmd = "C:\Program Files\nodejs\npm.cmd"
$nodeDir = "C:\Program Files\nodejs"
$backendPort = 5002

Write-Host "Starting SecureCart development environment..."

if (-not (Test-Path $pythonExe)) {
    throw "Python not found at $pythonExe"
}

if (-not (Test-Path $npmCmd)) {
    throw "npm not found at $npmCmd"
}

$env:Path = "$nodeDir;$env:Path"
$env:SECURECART_PORT = "$backendPort"

Write-Host "Ensuring database is initialized..."
Push-Location (Join-Path $repoRoot "backend")
try {
    & $pythonExe init_db.py
} finally {
    Pop-Location
}

Write-Host "Launching backend on http://localhost:$backendPort ..."
$backendProcess = Start-Process -FilePath $pythonExe -ArgumentList "run.py" -WorkingDirectory (Join-Path $repoRoot "backend") -PassThru

Start-Sleep -Seconds 5

Write-Host "Launching frontend on http://localhost:3000 ..."
$frontendProcess = Start-Process -FilePath $npmCmd -ArgumentList "start" -WorkingDirectory (Join-Path $repoRoot "frontend") -PassThru

Write-Host ""
Write-Host "SecureCart is starting up."
Write-Host "Backend PID: $($backendProcess.Id)"
Write-Host "Frontend PID: $($frontendProcess.Id)"
Write-Host "Backend URL: http://localhost:$backendPort/api/health"
Write-Host "Frontend URL: http://localhost:3000"
Write-Host ""
Write-Host "To stop them later:"
Write-Host "Stop-Process -Id $($backendProcess.Id), $($frontendProcess.Id)"
