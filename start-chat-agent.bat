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
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-chat-agent.ps1"

if errorlevel 1 (
  echo.
  echo The chat agent did not become ready. Check chat-agent.log for details.
  pause
  exit /b 1
)

endlocal
