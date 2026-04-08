@echo off
title RSVP Neural Reader — Local
echo.
echo  ========================================
echo   RSVP NEURAL READER — LOCAL SERVER
echo  ========================================
echo.
echo  Starting on http://localhost:3000
echo  Press Ctrl+C to stop
echo.
timeout /t 3 /nobreak >nul
start http://localhost:3000/read
cd /d D:\neural-reader
npm run dev
