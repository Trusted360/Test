#!/bin/bash

# Trusted 360 Development Startup Script

echo "🚀 Starting Trusted 360 development environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start database and Redis services
echo "🗄️ Starting database and Redis services..."
docker compose up postgres redis -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run ./setup-local-dev.sh first."
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
cd src/api
npm run migrate
cd ../..

echo "✅ Development environment is ready!"
echo ""
echo "🔧 To start the services:"
echo "1. API Server: cd src/api && npm run dev"
echo "2. Dashboard: cd src/dashboard && npm run dev"
echo ""
echo "🌐 Access points:"
echo "- Dashboard: http://localhost:5173"
echo "- API: http://localhost:3001"
echo "- API Health: http://localhost:3001/api/health"
