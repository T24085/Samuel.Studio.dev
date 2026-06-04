@echo off
setlocal

cd /d "%~dp0"

echo Starting Samuel Studio development server...
if exist node_modules (
  npm run dev -- --host 127.0.0.1 --port 5173
) else (
  echo.
  echo Dependencies are missing. Run npm install first.
  pause
)

endlocal
