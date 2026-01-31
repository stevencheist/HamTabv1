@echo off
REM Manual update — pulls latest code and installs dependencies.

cd /d "%~dp0"

echo Pulling latest changes...
git pull
if %ERRORLEVEL% neq 0 (
  echo git pull failed
  exit /b 1
)

echo Installing dependencies...
npm install --production
if %ERRORLEVEL% neq 0 (
  echo npm install failed
  exit /b 1
)

echo Update complete.
