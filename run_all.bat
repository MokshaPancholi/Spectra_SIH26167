@echo off
title SatQuery AI - Full Stack Launcher
echo ======================================================================
echo Launching SatQuery AI Full Stack Workspace...
echo ======================================================================
start "SatQuery Backend (Port 8000)" cmd /k "python server.py"
echo Backend starting on http://127.0.0.1:8000 ...
timeout /t 4 /nobreak >nul
start "SatQuery Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"
echo Frontend starting on http://localhost:5173 ...
echo.
echo Both servers launched successfully!
echo Open your browser at: http://localhost:5173
