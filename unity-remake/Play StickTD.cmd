@echo off
if exist "%~dp0Builds\StickTD-Enhanced\StickTD.exe" (
  start "" "%~dp0Builds\StickTD-Enhanced\StickTD.exe"
) else (
  echo Open the Unity folder in Unity 6000.3.19f1 and choose StickTD - Build Windows game.
  pause
)
