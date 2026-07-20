@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% neq 0 (
  echo Python was not found.
  echo Install Python 3, then run this file again.
  pause
  exit /b 1
)
start "" http://127.0.0.1:8080
py backend\wirevault_core.py