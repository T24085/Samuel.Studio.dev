@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

git -C "%ROOT%" rev-parse --is-inside-work-tree >nul 2>&1
if not errorlevel 1 (
  echo Updating from GitHub...
  git -C "%ROOT%" pull --ff-only
  if errorlevel 1 (
    echo Failed to update from GitHub.
    exit /b 1
  )
) else (
  echo Skipping GitHub pull because this folder is not a git checkout.
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Failed to install dependencies.
    exit /b 1
  )
)

echo Starting Nova Studio development server...
start "Nova Studio" /D "%ROOT%" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"

set "URL=http://127.0.0.1:5173/Nova.Studio/"
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 2 ^| Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto :open_browser
  timeout /t 1 /nobreak >nul
)

echo Server did not respond in time, opening browser anyway.
:open_browser
start "" "%URL%"

endlocal
