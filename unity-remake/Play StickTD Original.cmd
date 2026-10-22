@echo off
if exist "%~dp0Builds\StickTD\StickTD.exe" (
  start "" "%~dp0Builds\StickTD\StickTD.exe"
) else (
  echo Extract the original Unity archive into Builds so Builds\StickTD\StickTD.exe exists.
  pause
)
