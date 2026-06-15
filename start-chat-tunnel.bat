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

where cloudflared >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" (
    set "CLOUDFLARED_EXE=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
  ) else (
    echo.
    echo cloudflared was not found in PATH.
    echo Install it with: winget install --id Cloudflare.cloudflared
    pause
    exit /b 1
  )
) else (
  set "CLOUDFLARED_EXE=cloudflared"
)

if exist cloudflared.log del /q cloudflared.log >nul 2>nul

echo Starting Cloudflare Tunnel for chat.novatec.casa...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$exe = if (Test-Path '%ProgramFiles(x86)%\cloudflared\cloudflared.exe') { '%ProgramFiles(x86)%\cloudflared\cloudflared.exe' } else { 'cloudflared' };" ^
  "$token = (& $exe tunnel token chat-novatec).Trim();" ^
  "if (-not $token) { throw 'Failed to fetch the tunnel token for chat-novatec.' }" ^
  "Start-Process -WindowStyle Hidden -FilePath $exe -ArgumentList @('tunnel','run','--token',$token) -WorkingDirectory '%CD%' | Out-Null"

echo.
echo Tunnel process launched.
echo Check cloudflared.log for the public hostname and connectivity details.
echo The chat server is available locally at http://127.0.0.1:8787

endlocal
