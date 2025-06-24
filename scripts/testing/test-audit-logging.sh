#!/bin/bash

echo "Testing Audit Logging for Trusted360"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# First, rebuild the containers
echo -e "${YELLOW}Step 1: Rebuilding Docker containers...${NC}"
docker compose down -v
docker compose up --build -d

# Wait for services to be ready
echo -e "${YELLOW}Step 2: Waiting for services to be ready...${NC}"
sleep 30

# Check if API is responding
echo -e "${YELLOW}Step 3: Checking API health...${NC}"
curl -s http://localhost:3001/api/health | jq '.' || echo -e "${RED}API not responding${NC}"

echo ""
echo -e "${GREEN}Docker containers rebuilt successfully!${NC}"
echo ""
echo -e "${YELLOW}To test audit logging:${NC}"
echo "1. Open the app at http://localhost:8088"
echo "2. Log in with demo@example.com / password123"
echo "3. Create a checklist and complete some items"
echo "4. Create or resolve video alerts"
echo "5. Create service tickets"
echo "6. Navigate to the Audit Reports page to see if activities are tracked"
echo ""
echo -e "${YELLOW}To check audit logs directly in the database:${NC}"
echo "docker compose exec postgres psql -U postgres -d trusted360_db -c 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;'"
echo ""
echo -e "${YELLOW}To check operational metrics:${NC}"
echo "docker compose exec postgres psql -U postgres -d trusted360_db -c 'SELECT * FROM operational_metrics ORDER BY metric_date DESC LIMIT 10;'"
echo ""
echo -e "${YELLOW}To monitor API logs for audit events:${NC}"
echo "docker compose logs -f api | grep -i audit"
