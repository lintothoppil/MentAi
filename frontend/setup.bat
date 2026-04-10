@echo off
echo ========================================
echo  MentorAI - Node.js Frontend Setup
echo ========================================
echo.

echo [1/2] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [2/2] Setup complete!
echo.
echo ========================================
echo  Next Steps:
echo ========================================
echo 1. Make sure Flask backend is running on port 5000
echo 2. Configure .env file if needed
echo 3. Run the frontend: npm start
echo 4. Access at: http://localhost:3000
echo.
echo ========================================
pause
