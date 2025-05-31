#!/bin/bash

# Migration Cleanup Script for Trusted360
# This script organizes migrations and removes conflicting/unnecessary ones

echo "🧹 Cleaning up Trusted360 migrations..."

# Create archive directory
mkdir -p archived

# Archive conflicting UUID-based migrations
echo "📦 Archiving UUID-based migrations..."
mv 20240506000000_enable_extensions.js archived/ 2>/dev/null
mv 20240507000000_create_*.js archived/ 2>/dev/null
mv 20240508*.js archived/ 2>/dev/null

# Archive food/recipe system migrations
echo "📦 Archiving food/recipe system migrations..."
mv 20250508194*.js archived/ 2>/dev/null
mv *meal*.js archived/ 2>/dev/null
mv *recipe*.js archived/ 2>/dev/null
mv *food*.js archived/ 2>/dev/null
mv *pantry*.js archived/ 2>/dev/null
mv *shopping*.js archived/ 2>/dev/null
mv *ingredient*.js archived/ 2>/dev/null
mv *diet*.js archived/ 2>/dev/null

# Archive duplicate session/activity migrations
echo "📦 Archiving duplicate migrations..."
mv 20250523000000_create_sessions_table.js archived/ 2>/dev/null
mv 20250523000001_create_user_household_members_table.js archived/ 2>/dev/null
mv 20250523000002_create_user_activities_table.js archived/ 2>/dev/null

# Archive the poorly designed separate migrations (if using consolidated version)
echo "📦 Archiving poorly designed migrations..."
# Comment these out if you want to keep the separate migrations
# mv 20250531000000_create_basic_auth_tables.js archived/ 2>/dev/null
# mv 20250531000001_add_tenant_id_to_tables.js archived/ 2>/dev/null
# mv 20250531000002_add_tenant_id_to_auth_tables.js archived/ 2>/dev/null

echo ""
echo "✅ Migrations cleaned up!"
echo ""
echo "📋 Remaining migrations:"
ls -la *.js | grep -v archived

echo ""
echo "📁 Archived migrations are in: $(pwd)/archived/"
echo ""
echo "⚠️  Note: The three separate auth migrations are currently still active."
echo "   Uncomment lines in this script to archive them if using the consolidated version." 