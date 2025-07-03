#!/bin/bash
# Test script to validate chatbot conciseness and accuracy

echo "Testing Trusted360 Chatbot Improvements"
echo "======================================="
echo ""

# Test questions to check conciseness and accuracy
TEST_QUESTIONS=(
  "What properties are configured?"
  "List all checklist templates"
  "How many properties exist?"
  "What is the status of StorageMart Downtown?"
  "Show me recent alerts"
  "What templates are available for monthly inspections?"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}NOTE: This script provides test questions to validate chatbot behavior.${NC}"
echo -e "${YELLOW}Run these through the chat interface and verify:${NC}"
echo ""
echo "1. Responses are concise (1-3 sentences)"
echo "2. Only mentions data that actually exists"
echo "3. No hallucinated properties or templates"
echo "4. Says 'I don't have that information' when appropriate"
echo ""
echo -e "${GREEN}Test Questions:${NC}"
echo "==============="

for i in "${!TEST_QUESTIONS[@]}"; do
  echo "$((i+1)). ${TEST_QUESTIONS[$i]}"
done

echo ""
echo -e "${GREEN}Expected Behaviors:${NC}"
echo "==================="
echo "- Lists only actual properties from database"
echo "- Lists only actual templates from database"
echo "- Provides exact counts, not estimates"
echo "- Short, factual responses"
echo "- No speculation or examples"
echo ""
echo -e "${YELLOW}After testing, verify the chatbot meets all criteria above.${NC}"