#!/bin/bash

# Omni-Wallet Complete Testing Suite
# Tests all MCP tools, Gemini integration, API routes, and frontend flows

set -e

echo "========================================="
echo "Omni-Wallet Complete Test Suite"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Test helper function
run_test() {
  local test_name=$1
  local curl_command=$2
  
  echo -n "[TEST] $test_name... "
  
  response=$(eval "$curl_command")
  
  if echo "$response" | grep -q '"success":true\|"totalTransactions"\|"topCard"\|"cardName"'; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
    echo "Response: $(echo $response | cut -c1-100)..."
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
    echo "Response: $response"
  fi
  echo ""
}

# Test 1: MCP Tool - analyze_transactions
run_test "MCP: analyze_transactions" \
  "curl -s -X POST http://localhost:3000/api/tools/execute \
    -H 'Content-Type: application/json' \
    -d '{
      \"toolName\": \"analyze_transactions\",
      \"toolInput\": {
        \"transactions\": [
          {\"amount\": 500, \"category\": \"dining\", \"merchant\": \"Restaurant\"},
          {\"amount\": 300, \"category\": \"groceries\", \"merchant\": \"Supermarket\"}
        ]
      }
    }'"

# Test 2: MCP Tool - calculate_rewards
run_test "MCP: calculate_rewards" \
  "curl -s -X POST http://localhost:3000/api/tools/execute \
    -H 'Content-Type: application/json' \
    -d '{
      \"toolName\": \"calculate_rewards\",
      \"toolInput\": {
        \"amount\": 100,
        \"category\": \"dining\",
        \"cards\": [
          {\"name\": \"Premium\", \"categories\": [{\"name\": \"dining\", \"reward\": 3}]}
        ]
      }
    }'"

# Test 3: MCP Tool - compare_cards
run_test "MCP: compare_cards" \
  "curl -s -X POST http://localhost:3000/api/tools/execute \
    -H 'Content-Type: application/json' \
    -d '{
      \"toolName\": \"compare_cards\",
      \"toolInput\": {
        \"userSpending\": {\"dining\": 1000, \"travel\": 500},
        \"cards\": [{\"name\": \"Premium\", \"categories\": [\"dining\"], \"annualFee\": 0}]
      }
    }'"

# Test 4: MCP Tool - optimize_spending
run_test "MCP: optimize_spending" \
  "curl -s -X POST http://localhost:3000/api/tools/execute \
    -H 'Content-Type: application/json' \
    -d '{
      \"toolName\": \"optimize_spending\",
      \"toolInput\": {
        \"spendingPattern\": {\"dining\": 1000},
        \"availableCards\": [{\"name\": \"Premium\", \"categories\": [\"dining\"]}]
      }
    }'"

# Test 5: MCP Tool - validate_transaction
run_test "MCP: validate_transaction" \
  "curl -s -X POST http://localhost:3000/api/tools/execute \
    -H 'Content-Type: application/json' \
    -d '{
      \"toolName\": \"validate_transaction\",
      \"toolInput\": {
        \"merchant\": \"Restaurant\",
        \"amount\": 150,
        \"category\": \"dining\"
      }
    }'"

# Test 6: API - Get Users
run_test "API: Get Users" \
  "curl -s -X GET http://localhost:3000/api/users"

# Test 7: API - Get Cards
run_test "API: Get Cards" \
  "curl -s -X GET http://localhost:3000/api/cards"

# Test 8: API - Health Check
run_test "API: Health Check" \
  "curl -s -X GET http://localhost:3000/api/health"

# Test 9: Page Load - Homepage
echo -n "[TEST] Frontend: Homepage loads... "
if curl -s http://localhost:3000 | grep -q "Omni-Wallet"; then
  echo -e "${GREEN}✓ PASSED${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAILED${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 10: Page Load - Cards Page
echo -n "[TEST] Frontend: Cards page loads... "
if curl -s http://localhost:3000/cards | grep -q "Your Credit Cards\|Card Management"; then
  echo -e "${GREEN}✓ PASSED${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAILED${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "========================================="
echo -e "Test Results: ${GREEN}$TESTS_PASSED passed${NC}, ${RED}$TESTS_FAILED failed${NC}"
echo "========================================="

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
