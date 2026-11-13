@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\hazel\Documents\Claude\tools\node\clasp.ps1" push --force
