#!/bin/bash

echo "🔍 Verifying Trusted360 setup..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check directory structure
echo -e "\n📁 Checking directory structure..."
DIRS=("database/migrations" "src/api" "src/dashboard" "config" "scripts")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir exists"
    else
        echo -e "${RED}✗${NC} $dir missing"
    fi
done

# Check key files
echo -e "\n📄 Checking key files..."
FILES=("docker-compose.yml" ".env.example" "README.md")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file missing"
    fi
done

# Check migrations
echo -e "\n🗄️ Checking database migrations..."
MIGRATIONS=("001_initial_schema.js" "002_facilities_and_units.js" "003_camera_feeds.js" "004_maintenance_tickets.js" "005_alerts_and_notifications.js")
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "database/migrations/$migration" ]; then
        echo -e "${GREEN}✓${NC} $migration exists"
    else
        echo -e "${RED}✗${NC} $migration missing"
    fi
done

echo -e "\n✅ Setup verification complete!" 