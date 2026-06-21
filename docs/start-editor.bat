@echo off
cd /d "%~dp0"
title Project Page Visual Editor
python editor_server.py
if errorlevel 1 (
  echo.
  echo Could not start the editor. Make sure Python is installed.
  pause
)
