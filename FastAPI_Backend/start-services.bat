@echo off
echo ====================================
echo    FeelWise Services Startup Script
echo ====================================

REM Check if we're in the right directory
if not exist "main-server.js" (
    echo Error: main-server.js not found. Please run this script from the FastAPI_Backend directory.
    pause
    exit /b 1
)

echo Starting FeelWise services...

REM Start Journal API Service
echo.
echo [1/4] Starting Journal API Service (Port 8004)...
start "Journal API" cmd /c "python journal_api.py"
timeout /t 3 /nobreak >nul

REM Start Text Analysis Service (if exists)
if exist "text_analysis_api.py" (
    echo [2/4] Starting Text Analysis Service (Port 8001)...
    start "Text Analysis" cmd /c "python text_analysis_api.py"
    timeout /t 2 /nobreak >nul
) else (
    echo [2/4] Text Analysis Service not found - skipping...
)

REM Start Face Analysis Service (if exists)
if exist "face_analysis_api.py" (
    echo [3/4] Starting Face Analysis Service (Port 8002)...
    start "Face Analysis" cmd /c "python face_analysis_api.py"
    timeout /t 2 /nobreak >nul
) else (
    echo [3/4] Face Analysis Service not found - skipping...
)

REM Start Main Server (Node.js)
echo [4/4] Starting Main Server (Port 5001)...
timeout /t 3 /nobreak >nul
start "Main Server" cmd /c "npm start"

echo.
echo ====================================
echo All services are starting up!
echo.
echo Services:
echo - Journal API: http://localhost:8004/health
echo - Main Server: http://localhost:5001/health
echo.
echo Wait 10-15 seconds for all services to be ready.
echo ====================================

timeout /t 5 /nobreak >nul

REM Try to open health check in browser
echo Opening health check...
start http://localhost:5001/health

pause