#!/bin/bash
# Test script for semantic search fixes
# Usage: ./test-semantic-fixes.sh <jwt_token> [base_url]

set -e

JWT_TOKEN="${1:-}"
BASE_URL="${2:-http://localhost:3000}"

if [ -z "$JWT_TOKEN" ]; then
  echo "Error: JWT token required"
  echo "Usage: $0 <jwt_token> [base_url]"
  exit 1
fi

echo "=========================================="
echo "Semantic Search Fixes - Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local data="$5"

  echo -n "Testing: $name ... "

  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Print relevant output
    if [ ! -z "$body" ] && [ "$body" != "null" ]; then
      echo "  Response: $(echo "$body" | head -c 100)..."
    fi
  else
    echo -e "${RED}FAIL${NC} (expected $expected_status, got $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    
    # Print error details
    if [ ! -z "$body" ]; then
      echo "  Error: $(echo "$body" | head -c 200)"
    fi
  fi
  echo ""
}

# ============================================
echo "PHASE 1: Create Test Links"
echo "============================================"
echo ""

# Create a DSA-related link
test_endpoint \
  "Save LeetCode link" \
  "POST" \
  "/links" \
  "201" \
  '{
    "originalUrl": "https://leetcode.com/problemset/",
    "title": "LeetCode - The World'\''s Leading Online Programming Judge"
  }'

# Create another DSA resource
test_endpoint \
  "Save NeetCode link" \
  "POST" \
  "/links" \
  "201" \
  '{
    "originalUrl": "https://neetcode.io/",
    "title": "NeetCode - Ace Your Coding Interview"
  }'

# Create a non-DSA link for contrast
test_endpoint \
  "Save unrelated link" \
  "POST" \
  "/links" \
  "201" \
  '{
    "originalUrl": "https://example.com/cooking-recipes",
    "title": "Best Cooking Recipes"
  }'

echo ""
echo -e "${YELLOW}Note: Waiting 2 seconds for embeddings to be generated...${NC}"
sleep 2
echo ""

# ============================================
echo "PHASE 2: Test Query Expansion (Fix 2)"
echo "============================================"
echo "Testing that short queries like 'dsa' expand internally"
echo ""

test_endpoint \
  "Search: 'dsa' (should find LeetCode/NeetCode)" \
  "GET" \
  "/links/search?q=dsa" \
  "200" \
  ""

test_endpoint \
  "Search: 'cp' (competitive programming)" \
  "GET" \
  "/links/search?q=cp" \
  "200" \
  ""

test_endpoint \
  "Search: 'algorithms' (longer query)" \
  "GET" \
  "/links/search?q=algorithms" \
  "200" \
  ""

echo ""

# ============================================
echo "PHASE 3: Test Dynamic Thresholds (Fix 3)"
echo "============================================"
echo "Short queries should use relaxed thresholds"
echo ""

test_endpoint \
  "Search: 'ml' (short, 1 word)" \
  "GET" \
  "/links/search?q=ml" \
  "200" \
  ""

test_endpoint \
  "Search: 'machine learning' (longer, should use stricter threshold)" \
  "GET" \
  "/links/search?q=machine%20learning" \
  "200" \
  ""

echo ""

# ============================================
echo "PHASE 4: Test Backfill Endpoint (Fix 4)"
echo "============================================"
echo "Testing the admin reprocess endpoint"
echo ""

test_endpoint \
  "Reprocess all links" \
  "POST" \
  "/links/admin/reprocess" \
  "201" \
  ""

echo -e "${YELLOW}Note: Backfill typically takes 2-5 seconds per link${NC}"
sleep 3
echo ""

# ============================================
echo "PHASE 5: Verify Search After Reprocessing"
echo "============================================"
echo ""

test_endpoint \
  "Post-reprocess search: 'dsa'" \
  "GET" \
  "/links/search?q=dsa" \
  "200" \
  ""

test_endpoint \
  "Post-reprocess search: 'coding interview'" \
  "GET" \
  "/links/search?q=coding%20interview" \
  "200" \
  ""

echo ""

# ============================================
echo "TEST SUMMARY"
echo "============================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Check the output above.${NC}"
  exit 1
fi
