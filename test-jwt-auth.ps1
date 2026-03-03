#!/usr/bin/env pwsh

# JWT Authentication Testing Script for PowerShell
# Run this after starting the backend server

$ApiUrl = "http://localhost:3000"
$Email = "test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$Password = "password123"

Write-Host ""
Write-Host "=== JWT Authentication Testing ===" -ForegroundColor Green
Write-Host ""

# Test 1: Register a new user
Write-Host "1. Testing Registration (POST /auth/register)" -ForegroundColor Yellow
Write-Host "Email: $Email"

$registerBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$ApiUrl/auth/register" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $registerBody `
    -ErrorAction SilentlyContinue

Write-Host "Response:" -ForegroundColor Cyan
$registerResponse | ConvertTo-Json | Write-Host

if (-not $registerResponse -or -not $registerResponse.accessToken) {
    Write-Host "❌ Failed to register user" -ForegroundColor Red
    exit 1
}

$accessToken = $registerResponse.accessToken
$userId = $registerResponse.userId

Write-Host ""
Write-Host "✅ Registration successful!" -ForegroundColor Green
Write-Host "Access Token: $($accessToken.Substring(0, [Math]::Min(50, $accessToken.Length)))..."
Write-Host "User ID: $userId"
Write-Host ""

# Test 2: Login with credentials
Write-Host "2. Testing Login (POST /auth/login)" -ForegroundColor Yellow

$loginBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$ApiUrl/auth/login" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $loginBody `
    -ErrorAction SilentlyContinue

Write-Host "Response:" -ForegroundColor Cyan
$loginResponse | ConvertTo-Json | Write-Host

if (-not $loginResponse -or -not $loginResponse.accessToken) {
    Write-Host "❌ Failed to login" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Login successful!" -ForegroundColor Green
Write-Host ""

# Test 3: Create a link (protected route)
Write-Host "3. Testing Protected Route - Create Link (POST /links)" -ForegroundColor Yellow

$linkBody = @{
    originalUrl = "https://www.example.com"
    title = "Example Website"
    keywords = @("test", "example")
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $accessToken"
}

$createResponse = Invoke-RestMethod -Uri "$ApiUrl/links" `
    -Method Post `
    -Headers $headers `
    -Body $linkBody `
    -ErrorAction SilentlyContinue

Write-Host "Response:" -ForegroundColor Cyan
$createResponse | ConvertTo-Json | Write-Host

if ($createResponse -and $createResponse.id) {
    Write-Host "✅ Link created successfully!" -ForegroundColor Green
    Write-Host "Link ID: $($createResponse.id)"
}

Write-Host ""

# Test 4: Get all links (protected route)
Write-Host "4. Testing Protected Route - Get All Links (GET /links)" -ForegroundColor Yellow

$getResponse = Invoke-RestMethod -Uri "$ApiUrl/links" `
    -Method Get `
    -Headers $headers `
    -ErrorAction SilentlyContinue

Write-Host "Response:" -ForegroundColor Cyan
$getResponse | ConvertTo-Json | Write-Host

Write-Host ""

# Test 5: Access without token (should fail)
Write-Host "5. Testing Unauthorized Access (GET /links without token)" -ForegroundColor Yellow

try {
    $unauthorizedResponse = Invoke-RestMethod -Uri "$ApiUrl/links" `
        -Method Get `
        -Headers @{"Content-Type" = "application/json"} `
        -ErrorAction Stop
    Write-Host "⚠️  Request should have been rejected!" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Correctly rejected request without token (HTTP 401)" -ForegroundColor Green
    } else {
        Write-Host "Response status: $statusCode" -ForegroundColor Cyan
        Write-Host $_.Exception.Response | ConvertTo-Json
    }
}

Write-Host ""

# Test 6: Search links (protected route)
Write-Host "6. Testing Protected Route - Search Links (GET /links/search?q=example)" -ForegroundColor Yellow

$searchResponse = Invoke-RestMethod -Uri "$ApiUrl/links/search?q=example" `
    -Method Get `
    -Headers $headers `
    -ErrorAction SilentlyContinue

Write-Host "Response:" -ForegroundColor Cyan
$searchResponse | ConvertTo-Json | Write-Host

Write-Host ""
Write-Host "=== Testing Complete ===" -ForegroundColor Green
