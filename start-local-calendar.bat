@echo off
setlocal

cd /d "%~dp0"

echo Restarting local calendar server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-local-calendar.ps1"

if errorlevel 1 (
  echo.
  echo The local calendar server did not become ready. Check local-calendar.log and local-calendar.error.log for details.
  pause
  exit /b 1
)

set "CALENDAR_URL=http://127.0.0.1:8790/?site=all"
if exist "%~dp0local-calendar.launch-url" (
  for /f "usebackq delims=" %%A in ("%~dp0local-calendar.launch-url") do set "CALENDAR_URL=%%A"
)

start "" "%CALENDAR_URL%"
echo.
echo Local calendar is running at %CALENDAR_URL%
echo Press any key to close this launcher. The server keeps running in the background.
pause

endlocal
