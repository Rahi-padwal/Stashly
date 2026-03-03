@echo off
REM JWT Authentication Testing Script for Windows
REM Run this after starting the backend server

setlocal enabledelayedexpansion

set API_URL=http://localhost:3000
set /a TIMESTAMP=%date:~-4%%date:~-10,2%%date:~-7,2%%time:~0,2%%time:~3,2%%time:~6,2%
set EMAIL=test-%TIMESTAMP%@example.com
set PASSWORD=password123

echo.
echo === JWT Authentication Testing ===
echo.

REM Test 1: Register a new user
echo 1. Testing Registration (POST /auth/register)
echo Email: %EMAIL%
curl -X POST "%API_URL%/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"%EMAIL%\", \"password\": \"%PASSWORD%\"}"
echo.
echo.

REM Note: To properly extract token in Windows batch, you would need to:
REM 1. Use jq.exe (need to install JSON command line processor)
REM 2. Or use PowerShell instead

echo.
echo NOTE: For full automated testing on Windows, consider using PowerShell:
echo PowerShell -ExecutionPolicy Bypass -File "test-jwt-auth.ps1"
echo.
echo Manual testing steps:
echo.
echo 1. Register:
echo   curl -X POST %API_URL%/auth/register ^
echo     -H "Content-Type: application/json" ^
echo     -d "{\"email\": \"user@example.com\", \"password\": \"password123\"}"
echo.
echo 2. Copy the accessToken from the response
echo.
echo 3. Create Link (replace TOKEN with actual token):
echo   curl -X POST %API_URL%/links ^
echo     -H "Content-Type: application/json" ^
echo     -H "Authorization: Bearer TOKEN" ^
echo     -d "{\"originalUrl\": \"https://example.com\"}"
echo.
echo 4. Get Links (replace TOKEN with actual token):
echo   curl -X GET %API_URL%/links ^
echo     -H "Authorization: Bearer TOKEN"
echo.
echo 5. Search Links (replace TOKEN and QUERY with actual values):
echo   curl -X GET "%API_URL%/links/search?q=QUERY" ^
echo     -H "Authorization: Bearer TOKEN"
echo.
