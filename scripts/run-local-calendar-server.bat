@echo off
setlocal

cd /d "%~dp0\.."
node server\local-calendar-server.js

endlocal
