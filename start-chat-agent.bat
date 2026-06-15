@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Restarting chat agent server...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = 8787;" ^
  "$processIds = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique);" ^
  "foreach ($processId in $processIds) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }" ^
  "exit 0"

timeout /t 1 /nobreak >nul

if exist chat-agent.log del /q chat-agent.log >nul 2>nul
start "" /b node server\chat-agent-server.js

echo Waiting for the chat agent to become available...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$urls = @('http://localhost:8787/health', 'http://127.0.0.1:8787/health');" ^
  "$readyUrl = $null;" ^
  "for ($i = 0; $i -lt 60 -and -not $readyUrl; $i++) {" ^
  "  foreach ($url in $urls) {" ^
  "    try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($response.StatusCode -ge 200) { $readyUrl = $url; break } } catch { }" ^
  "  }" ^
  "  if (-not $readyUrl) { Start-Sleep -Seconds 1 }" ^
  "}" ^
  "if ($readyUrl) { exit 0 } else { exit 1 }"

if errorlevel 1 (
  echo.
  echo The chat agent did not become ready. Check chat-agent.log for details.
  pause
  exit /b 1
)

endlocal
