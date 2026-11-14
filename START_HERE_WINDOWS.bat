@echo off
cd /d "%~dp0"
echo TEAM NEXUS - MINI LIBRARY (COMP229)
echo ===================================
where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Install Node.js 20 or newer first.
    pause
    exit /b 1
)
if not exist .env (
    node -e "const fs=require('fs');const c=require('crypto');let t=fs.readFileSync('.env.example','utf8');t=t.replace('change-this-to-a-long-random-secret-before-running',c.randomBytes(32).toString('hex'));fs.writeFileSync('.env',t);"
    echo .env was created using local MongoDB.
    echo If you use MongoDB Atlas, update MONGO_URI in .env before continuing.
)
echo.
echo Your MongoDB server must already be running.
echo For local MongoDB with Docker Desktop: docker compose up -d
echo.
call npm install
if errorlevel 1 (echo npm install failed & pause & exit /b 1)
call npm start
pause
