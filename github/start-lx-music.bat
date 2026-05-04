@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0.."
title LX Music
echo Starting LX Music...
echo If this is your first time, run: npm install
node_modules\.bin\electron.cmd .
pause
