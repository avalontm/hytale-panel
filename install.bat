@echo off
chcp 65001 >nul
echo ================================
echo Hytale Panel - Quick Setup
echo ================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from: https://nodejs.org/
    pause
    exit /b 1
)

:: Get Node.js version
for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detected

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

:: Get npm version
for /f "tokens=1" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% detected
echo.

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

:: Create .env if not exists
if not exist .env (
    echo Creating .env file...
    copy .env.example .env >nul
    echo [OK] Created .env file
    echo [WARNING] Please edit backend\.env with your server configuration
)

cd ..

:: Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

cd ..

:: Done
echo.
echo ================================
echo Installation complete!
echo ================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your Hytale server configuration
echo 2. Start the backend: cd backend ^&^& npm run dev
echo 3. Start the frontend: cd frontend ^&^& npm run dev
echo 4. Open http://localhost:5173 in your browser
echo.
echo For more information, see README.md
echo.
pause