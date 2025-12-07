@echo off
title FeelWise - All Services Launcher
echo ============================================
echo 🚀 Starting FeelWise Multi-Module System...
echo ============================================

REM === Start Text Analysis API ===
echo.
echo ▶ Starting Text Analysis API (port 8001)...
start cmd /k "cd FastAPI_Backend && call main-venv\Scripts\activate && uvicorn text-analysis-api:app --reload --port 8001"

REM === Start Speech Analysis API ===
echo.
echo ▶ Starting Speech Analysis API (port 8000)...
start cmd /k "cd FastAPI_Backend && call main-venv\Scripts\activate && uvicorn speech_analysis_fastapi:app --reload --port 8000"

REM === Start Journal API ===
echo.
echo ▶ Starting Journal API (port 8004)...
start cmd /k "cd FastAPI_Backend && call main-venv\Scripts\activate && uvicorn journal_api:app --reload --port 8004"

REM === Start Face Analysis API (Python 3.10) ===
echo.
echo ▶ Starting Face Analysis API (port 8002)...
start cmd /k "cd FastAPI_Backend && call venv3102\Scripts\activate && uvicorn face-analysis-api:app --reload --port 8002"

REM === Start Node.js Main Server ===
echo.
echo ▶ Starting Node.js Main Server (port 5000)...
start cmd /k "cd FastAPI_Backend && npm start"

echo.
echo ✅ All services are launching in separate terminals.
pause
