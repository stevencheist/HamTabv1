@echo off
REM Start wrapper — runs node server.js in a restart loop.
REM Clean exit (code 0) restarts after 1s; crash restarts after 3s.

cd /d "%~dp0"

:loop
echo === Starting server ===
node server.js
if %ERRORLEVEL% equ 0 (
  echo Server exited cleanly (code 0). Restarting in 1s...
  timeout /t 1 /nobreak >nul
) else (
  echo Server crashed (code %ERRORLEVEL%). Restarting in 3s...
  timeout /t 3 /nobreak >nul
)
goto loop
