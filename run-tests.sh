#!/bin/bash

echo "🧪 Running All Test Suites"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build project first
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Test 1: Fuzzy Matching Engine
echo "🧪 Test Suite 1: Fuzzy Matching Engine"
echo "---------------------------------------"
npx ts-node src/lib/indian-fuzzy-match.test.ts

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Fuzzy matching tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Fuzzy matching tests passed${NC}"
echo ""

# Test 2: Conversation Memory
echo "🧪 Test Suite 2: Conversation Memory Integration"
echo "------------------------------------------------"
npx ts-node src/business/conversation-memory.service.test.ts

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Conversation memory tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Conversation memory tests passed${NC}"
echo ""

# Summary
echo "================================"
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Test Summary:"
echo "  ✅ Fuzzy Matching Engine: 31 tests"
echo "  ✅ Conversation Memory: 45+ tests"
echo ""
echo "Ready for deployment! 🚀"
