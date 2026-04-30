@echo off
echo ========================================
echo  MentAi - Flask Backend Setup
echo ========================================
echo.

echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo [3/4] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [4/4] Setup complete!
echo.
echo ========================================
echo  Next Steps:
echo ========================================
echo 1. Configure .env file with your database credentials
echo 2. Create MySQL database: CREATE DATABASE mentorai;
echo 3. Import schema: mysql -u root -p mentorai ^< schema.sql
echo 4. Run the app: python app.py
echo.
echo ========================================
pause
