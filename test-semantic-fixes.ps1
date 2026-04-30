#!/usr/bin/env pwsh
# Test script for semantic search fixes (PowerShell)
# Usage: .\test-semantic-fixes.ps1 -JwtToken <token> [-BaseUrl <url>]

param(
    [Parameter(Mandatory=$true)]
    [string]$JwtToken,
    
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Semantic Search Fixes - Test Suite" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
Write-Host ""

$TESTS_PASSED = 0
$TESTS_FAILED = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [int]$ExpectedStatus = 200,
        [string]$Data = ""
    )

    Write-Host -NoNewline "Testing: $Name ... "

    try {
        $url = "$BaseUrl$Endpoint"
        $headers = @{
            "Authorization" = "Bearer $JwtToken"
            "Content-Type" = "application/json"
        }

        $params = @{
            Uri = $url
            Headers = $headers
            Method = $Method
            ErrorAction = "SilentlyContinue"
            SkipHttpErrorCheck = $true
        }

        if ($Method -eq "POST" -and $Data) {
            $params["Body"] = $Data
        }

        $response = Invoke-WebRequest @params
        $httpCode = $response.StatusCode
        $body = $response.Content

        if ($httpCode -eq $ExpectedStatus) {
            Write-Host "PASS" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $httpCode)"
            $script:TESTS_PASSED += 1

            if ($body -and $body -ne "null") {
                $truncated = if ($body.Length -gt 100) { $body.Substring(0, 100) + "..." } else { $body }
                Write-Host "  Response: $truncated"
            }
        } else {
            Write-Host "FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (expected $ExpectedStatus, got $httpCode)"
            $script:TESTS_FAILED += 1

            if ($body) {
                $truncated = if ($body.Length -gt 200) { $body.Substring(0, 200) } else { $body }
                Write-Host "  Error: $truncated"
            }
        }
    }
    catch {
        Write-Host "ERROR" -ForegroundColor Red
        Write-Host "  Exception: $_"
        $script:TESTS_FAILED += 1
    }

    Write-Host ""
}

# ============================================
Write-Host "PHASE 1: Create Test Links" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Name "Save LeetCode link" -Method "POST" -Endpoint "/links" -ExpectedStatus 201 -Data @'
{
  "originalUrl": "https://leetcode.com/problemset/",
  "title": "LeetCode - The World's Leading Online Programming Judge"
}
'@

Test-Endpoint -Name "Save NeetCode link" -Method "POST" -Endpoint "/links" -ExpectedStatus 201 -Data @'
{
  "originalUrl": "https://neetcode.io/",
  "title": "NeetCode - Ace Your Coding Interview"
}
'@

Test-Endpoint -Name "Save unrelated link" -Method "POST" -Endpoint "/links" -ExpectedStatus 201 -Data @'
{
  "originalUrl": "https://example.com/cooking-recipes",
  "title": "Best Cooking Recipes"
}
'@

Write-Host ""
Write-Host "Note: Waiting 2 seconds for embeddings to be generated..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host ""

# ============================================
Write-Host "PHASE 2: Test Query Expansion (Fix 2)" -ForegroundColor Cyan
Write-Host "Testing that short queries like 'dsa' expand internally" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Name "Search: 'dsa' (should find LeetCode/NeetCode)" -Method "GET" -Endpoint "/links/search?q=dsa"
Test-Endpoint -Name "Search: 'cp' (competitive programming)" -Method "GET" -Endpoint "/links/search?q=cp"
Test-Endpoint -Name "Search: 'algorithms' (longer query)" -Method "GET" -Endpoint "/links/search?q=algorithms"

Write-Host ""

# ============================================
Write-Host "PHASE 3: Test Dynamic Thresholds (Fix 3)" -ForegroundColor Cyan
Write-Host "Short queries should use relaxed thresholds" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Name "Search: 'ml' (short, 1 word)" -Method "GET" -Endpoint "/links/search?q=ml"
Test-Endpoint -Name "Search: 'machine learning' (longer, should use stricter threshold)" -Method "GET" -Endpoint "/links/search?q=machine%20learning"

Write-Host ""

# ============================================
Write-Host "PHASE 4: Test Backfill Endpoint (Fix 4)" -ForegroundColor Cyan
Write-Host "Testing the admin reprocess endpoint" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Name "Reprocess all links" -Method "POST" -Endpoint "/links/admin/reprocess"

Write-Host ""
Write-Host "Note: Backfill typically takes 2-5 seconds per link" -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

# ============================================
Write-Host "PHASE 5: Verify Search After Reprocessing" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -Name "Post-reprocess search: 'dsa'" -Method "GET" -Endpoint "/links/search?q=dsa"
Test-Endpoint -Name "Post-reprocess search: 'coding interview'" -Method "GET" -Endpoint "/links/search?q=coding%20interview"

Write-Host ""

# ============================================
Write-Host "TEST SUMMARY" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "Passed: $TESTS_PASSED" -ForegroundColor Green
Write-Host "Failed: $TESTS_FAILED" -ForegroundColor Red
Write-Host ""

if ($TESTS_FAILED -eq 0) {
    Write-Host "All tests passed! ✓" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "Some tests failed. Check the output above." -ForegroundColor Red
    exit 1
}
