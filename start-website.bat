@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Failed to install dependencies.
    exit /b 1
  )
)

echo Starting Nova Studio development server...
start "Nova Studio" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"
timeout /t 3 /nobreak >nul
start "" http://127.0.0.1:5173/Nova.Studio/

endlocal
