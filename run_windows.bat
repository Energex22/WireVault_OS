@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8080
  py -m http.server 8080
) else (
  echo Python is required to run the modular build locally.
  echo Install Python, then run this file again.
  pause
)