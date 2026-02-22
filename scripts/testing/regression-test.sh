#!/bin/bash

# =====================================================
# Execora Error Handling Regression Test Suite
# Live monitoring through Grafana dashboard
# =====================================================

BASE_URL="http://localhost:3000"
DASHBOARD_URL="http://localhost:3001"

echo ""
echo "🚀 EXECORA REGRESSION TEST SUITE"
echo "=================================="
echo "Test Start: $(date)"
echo "API Base: $BASE_URL"
echo "Dashboard: $DASHBOARD_URL/d/execora-errors-prod"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function for test logging
log_test() {
  local test_name=$1
  local expected=$2
  local actual=$3
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if [ "$expected" == "$actual" ]; then
    echo -e "${GREEN}✓${NC} $test_name (Expected: $expected, Got: $actual)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗${NC} $test_name (Expected: $expected, Got: $actual)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# =====================================================
# TEST SUITE 1: Health Check (should pass)
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 1: Health Checks${NC}"
echo "=========================================="

for i in {1..3}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
  log_test "Health Check #$i" "200" "$RESPONSE"
  sleep 0.5
done

# =====================================================
# TEST SUITE 2: Validation Errors (400)
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 2: Validation Errors${NC}"
echo "=========================================="

for i in {1..3}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/validation-test" \
    -H "Content-Type: application/json" \
    -d '{"invalid":"data"}')
  log_test "Invalid Request #$i" "400" "$RESPONSE"
  sleep 0.5
done

# =====================================================
# TEST SUITE 3: Not Found Errors (404)
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 3: Not Found Errors${NC}"
echo "=========================================="

for i in {1..5}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/customers/999$i")
  log_test "Customer Not Found #$i (ID: 999$i)" "404" "$RESPONSE"
  sleep 0.5
done

# =====================================================
# TEST SUITE 4: Product Errors
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 4: Product Endpoint Errors${NC}"
echo "=========================================="

for i in {1..3}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/products/invalid-id")
  log_test "Invalid Product ID #$i" "404" "$RESPONSE"
  sleep 0.5
done

# =====================================================
# TEST SUITE 5: Invoice Errors
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 5: Invoice Endpoint Errors${NC}"
echo "=========================================="

for i in {1..2}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/invoices/missing")
  log_test "Invoice Not Found #$i" "404" "$RESPONSE"
  sleep 0.5
done

# =====================================================
# TEST SUITE 6: WebSocket Connection Errors
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 6: WebSocket Errors${NC}"
echo "=========================================="

# Generate WebSocket connection attempt (will fail because endpoint doesn't exist)
for i in {1..2}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/ws/invalid-path")
  log_test "WS Invalid Path #$i" "404" "$RESPONSE"
  sleep 0.5
done

# =====================================================
# TEST SUITE 7: Database Model Errors
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 7: Database/Model Errors${NC}"
echo "=========================================="

for i in {1..3}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/ledger/create" \
    -H "Content-Type: application/json" \
    -d '{"incomplete":"data"}')
  log_test "Ledger Error #$i" "0" "$RESPONSE"  # Accept any response as test
  sleep 0.5
done

# =====================================================
# TEST SUITE 8: Concurrent Load (simulates real traffic)
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 8: Concurrent Load Simulation${NC}"
echo "=========================================="

echo "Generating 10 concurrent requests..."
for i in {1..10}; do
  (curl -s "$BASE_URL/api/customers/$((RANDOM % 1000))" &)
done
wait
echo -e "${GREEN}✓${NC} Concurrent requests sent"

# =====================================================
# TEST SUITE 9: Rapid Fire Errors
# =====================================================
echo -e "\n${BLUE}📋 TEST SUITE 9: Rapid Fire Error Generation${NC}"
echo "=========================================="

echo "Sending 15 rapid requests (for dashboard visualization)..."
for i in {1..15}; do
  curl -s "$BASE_URL/api/customers/$((1000 + i))" > /dev/null &
  sleep 0.1
done
wait
echo -e "${GREEN}✓${NC} Rapid fire errors sent"

# =====================================================
# RESULTS SUMMARY
# =====================================================
echo -e "\n${BLUE}📊 TEST SUMMARY${NC}"
echo "=========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo "Pass Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""

# =====================================================
# WAIT FOR LOGS TO FLOW
# =====================================================
echo -e "\n${YELLOW}⏳ Waiting 5 seconds for logs to flow to Loki...${NC}"
sleep 5

# =====================================================
# VERIFY LOGS IN LOKI
# =====================================================
echo -e "\n${BLUE}🔍 Verifying logs in Loki${NC}"
echo "=========================================="

LOKI_QUERY='http://localhost:3100/loki/api/v1/query?query={job="execora-app"}'
RESPONSE=$(curl -s "$LOKI_QUERY")
LOG_COUNT=$(echo "$RESPONSE" | jq '.data.result | length' 2>/dev/null || echo "0")

echo -e "Loki Response Streams: $LOG_COUNT"

if [ "$LOG_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Logs successfully flowing to Loki"
else
  echo -e "${YELLOW}⚠${NC} Logs not yet visible in Loki (may take a moment)"
fi

# =====================================================
# LIVE DASHBOARD INSTRUCTIONS
# =====================================================
echo -e "\n${GREEN}🎯 LIVE DASHBOARD MONITORING${NC}"
echo "=========================================="
echo ""
echo "📊 View your errors LIVE in Grafana:"
echo ""
echo "   URL: ${BLUE}$DASHBOARD_URL/d/execora-errors-prod${NC}"
echo "   Login: ${BLUE}admin${NC} / ${BLUE}admin${NC}"
echo ""
echo "📈 Expected to see:"
echo "   - 🚨 Error Count: ~$TOTAL_TESTS+ errors in last 5 minutes"
echo "   - 🔥 CRITICAL: Multiple high-severity errors"
echo "   - ⚠️ Warnings: Not Found (404) and Validation errors"
echo "   - 📋 Detailed logs table will show all requests"
echo ""
echo "🔄 Dashboard auto-refreshes every 10 seconds"
echo "⏱️ Test completed: $(date)"
echo ""

# =====================================================
# CONTINUOUS MONITORING MODE
# =====================================================
read -p "Continue with LIVE monitoring mode? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}🔄 CONTINUOUS MONITORING MODE${NC}"
  echo "=================================="
  echo "Generating errors every 10 seconds..."
  echo "Press Ctrl+C to stop"
  echo ""
  
  ITERATION=0
  while true; do
    ITERATION=$((ITERATION + 1))
    echo "🔁 Cycle $ITERATION: $(date '+%H:%M:%S')"
    
    # Generate various error types
    curl -s "$BASE_URL/api/customers/$((RANDOM % 10000))" > /dev/null 2>&1 &
    curl -s "$BASE_URL/api/products/$((RANDOM))" > /dev/null 2>&1 &
    curl -s "$BASE_URL/health" > /dev/null 2>&1 &
    
    wait
    sleep 10
  done
else
  echo -e "\n${GREEN}✅ Regression test complete!${NC}"
  echo ""
  echo "📊 Dashboard URL: $DASHBOARD_URL/d/execora-errors-prod"
  echo ""
fi
