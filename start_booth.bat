@echo off
echo ========================================================
echo  Diabetes Awareness Day - simglucose Live Simulator
echo ========================================================
echo.

REM Find Python executable (prefer python, then python313, python310)
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PY_CMD=python
) else (
    if exist "c:\Users\reddy\AppData\Local\Programs\Python\Python313\python.exe" (
        set "PY_CMD=c:\Users\reddy\AppData\Local\Programs\Python\Python313\python.exe"
    ) else if exist "c:\Users\reddy\AppData\Local\Programs\Python\Python310\python.exe" (
        set "PY_CMD=c:\Users\reddy\AppData\Local\Programs\Python\Python310\python.exe"
    ) else (
        echo [ERROR] Python not found on PATH.
        pause
        exit /b 1
    )
)

echo Starting simglucose booth server on http://127.0.0.1:8000...
echo Serving both API and Offline React UI from FastAPI.
echo.

REM Open browser after 2 seconds
start "" http://127.0.0.1:8000

REM Run FastAPI server with Uvicorn
%PY_CMD% -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
