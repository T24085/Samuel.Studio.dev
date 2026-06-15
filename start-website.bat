@echo off
setlocal

cd /d "%~dp0"

call "%~dp0start-chat-agent.bat"
if errorlevel 1 (
  echo.
  echo The chat agent could not be started.
  pause
  exit /b 1
)

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

echo Restarting Samuel Studio development server...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = 5173;" ^
  "$processIds = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique);" ^
  "foreach ($processId in $processIds) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }" ^
  "exit 0"

timeout /t 1 /nobreak >nul

if exist dev-server.log del /q dev-server.log >nul 2>nul
start "" /b cmd /c "npm run dev -- --host 127.0.0.1 --port 5173"

echo Waiting for the site to become available...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$urls = @('http://localhost:5173/', 'http://127.0.0.1:5173/');" ^
  "$readyUrl = $null;" ^
  "for ($i = 0; $i -lt 60 -and -not $readyUrl; $i++) {" ^
  "  foreach ($url in $urls) {" ^
  "    try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($response.StatusCode -ge 200) { $readyUrl = $url; break } } catch { }" ^
  "  }" ^
  "  if (-not $readyUrl) { Start-Sleep -Seconds 1 }" ^
  "}" ^
  "if ($readyUrl) { Start-Process $readyUrl; exit 0 } else { exit 1 }"

if errorlevel 1 (
  echo.
  echo The server did not become ready. Check dev-server.log for details.
  pause
  exit /b 1
)

endlocal
