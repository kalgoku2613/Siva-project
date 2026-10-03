@echo off
setlocal enabledelayedexpansion
title ESP Smart Control - Hub Launcher

echo ===================================================================
echo     ESP32 Smart Monitoring, Camera, Motor & Autonomous Control
echo ===================================================================
echo.

:: 1. Add standard Node.js and Python installation paths to PATH for this session
set "PATH=C:\Program Files\nodejs;C:\Users\Dell\AppData\Local\Programs\Python\Python312;C:\Users\Dell\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"

:: 2. Check Node.js installation
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not recognized in PATH!
    echo Please ensure Node.js is installed from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js runtime detected:
node -v
echo.

:: 3. Check and install backend dependencies if missing
if not exist "backend\node_modules\" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install --no-audit --no-fund
    cd ..
)

:: 4. Check and install frontend dependencies if missing
if not exist "frontend\node_modules\" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install --no-audit --no-fund
    cd ..
)

:: 5. Ensure database schema and build are compiled
if not exist "backend\dist\server.js" (
    echo [INFO] Compiling backend TypeScript...
    cd backend
    call npm run build
    cd ..
)

echo.
echo ===================================================================
echo  Starting Local Servers:
echo   - Backend Server:   http://localhost:5000 (REST & WebSocket)
echo   - Frontend PWA:     http://localhost:3000
echo ===================================================================
echo.

:: 6. Launch Backend in a background process
start "ESP-Backend-Server" cmd /k "cd backend && npm start"

:: 7. Launch Frontend Vite Dev Server in a background process
start "ESP-Frontend-PWA" cmd /k "cd frontend && npm run dev"

:: 8. Wait 3 seconds for ports to bind, then open browser
timeout /t 3 /nobreak >nul
echo [INFO] Opening default browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo [READY] The ESP Smart Control system is now running!
echo Close this window or press Ctrl+C in server windows to stop.
echo.
pause
