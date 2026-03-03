#!/bin/bash

# JWT Authentication Testing Script
# Run this after starting the backend server

API_URL="http://localhost:3000"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="password123"

echo "=== JWT Authentication Testing ==="
echo ""

# Test 1: Register a new user
echo "1. Testing Registration (POST /auth/register)"
echo "Email: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Response:"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Extract token from response
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken' 2>/dev/null)
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.userId' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "❌ Failed to register user"
  exit 1
fi

echo "✅ Registration successful!"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo "User ID: $USER_ID"
echo ""

# Test 2: Login with credentials
echo "2. Testing Login (POST /auth/login)"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ -z "$LOGIN_TOKEN" ] || [ "$LOGIN_TOKEN" = "null" ]; then
  echo "❌ Failed to login"
  exit 1
fi

echo "✅ Login successful!"
echo ""

# Test 3: Create a link (protected route)
echo "3. Testing Protected Route - Create Link (POST /links)"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/links" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"originalUrl\": \"https://www.example.com\",
    \"title\": \"Example Website\",
    \"keywords\": [\"test\", \"example\"]
  }")

echo "Response:"
echo "$CREATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RESPONSE"
echo ""

LINK_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$LINK_ID" ] || [ "$LINK_ID" = "null" ]; then
  echo "⚠️  Link creation may have issues, but check the response above"
else
  echo "✅ Link created successfully!"
  echo "Link ID: $LINK_ID"
fi

echo ""

# Test 4: Get all links (protected route)
echo "4. Testing Protected Route - Get All Links (GET /links)"
GET_RESPONSE=$(curl -s -X GET "$API_URL/links" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response:"
echo "$GET_RESPONSE" | jq '.' 2>/dev/null || echo "$GET_RESPONSE"
echo ""

# Test 5: Access without token (should fail)
echo "5. Testing Unauthorized Access (GET /links without token)"
UNAUTHORIZED_RESPONSE=$(curl -s -X GET "$API_URL/links" \
  -w "\nHTTP_CODE:%{http_code}")

echo "Response:"
echo "$UNAUTHORIZED_RESPONSE" | jq '.' 2>/dev/null || echo "$UNAUTHORIZED_RESPONSE"
echo ""

if echo "$UNAUTHORIZED_RESPONSE" | grep -q "401\|Unauthorized"; then
  echo "✅ Correctly rejected request without token"
else
  echo "⚠️  Request should have been rejected with 401"
fi

# Test 6: Search links (protected route)
echo ""
echo "6. Testing Protected Route - Search Links (GET /links/search?q=example)"
SEARCH_RESPONSE=$(curl -s -X GET "$API_URL/links/search?q=example" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response:"
echo "$SEARCH_RESPONSE" | jq '.' 2>/dev/null || echo "$SEARCH_RESPONSE"
echo ""

echo "=== Testing Complete ==="
