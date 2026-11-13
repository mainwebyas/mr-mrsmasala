@echo off
setlocal
cd /d "%~dp0"

REM --- locate node (PATH first, then portable install) ---
set "NODE_EXE="
where node >nul 2>nul
if not errorlevel 1 set "NODE_EXE=node"

if not defined NODE_EXE (
  if exist "%LOCALAPPDATA%\Programs\nodejs\node-v24.22.0-win-x64\node.exe" (
    set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node-v24.22.0-win-x64\node.exe"
  )
)

if not defined NODE_EXE (
  echo.
  echo   Node.js not found. Install from https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo.
  echo   Dependencies missing. Open a terminal here and run:
  echo       npm install
  echo.
  pause
  exit /b 1
)

echo.
echo   Mr ^& Mrs Masala - Dev Server
echo   http://localhost:5173
echo   (close this window to stop the server)
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul & start "" http://localhost:5173"
"%NODE_EXE%" "node_modules\vite\bin\vite.js" --host 0.0.0.0 --port 5173

echo.
echo   Server stopped.
pause
