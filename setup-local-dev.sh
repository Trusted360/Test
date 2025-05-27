#!/bin/bash

# Trusted 360 Local Development Setup Script

echo "🚀 Setting up Trusted 360 for local development..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Trusted 360 Environment Configuration

# Server Configuration
NODE_ENV=development
API_PORT=3000
BASE_URL=http://localhost:3001

# Database Configuration
DATABASE_URL=postgres://trusted360:trusted360_password@localhost:5432/trusted360

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=trusted360-development-secret-key-change-in-production
JWT_EXPIRATION=24h

# Session Configuration
SESSION_SECRET=trusted360-session-secret-key-change-in-production
SESSION_EXPIRATION_DAYS=14

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:8088,http://localhost:3000

# Ollama Configuration (for AI features)
OLLAMA_URL=http://localhost:11434

# Email Configuration (optional for development)
EMAIL_ENABLED=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM="Trusted 360" <noreply@trusted360.app>

# Multi-tenancy
DEFAULT_TENANT=default

# Logging
LOG_LEVEL=info
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Install API dependencies
echo "📦 Installing API dependencies..."
cd src/api
npm install
cd ../..

# Install Dashboard dependencies
echo "📦 Installing Dashboard dependencies..."
cd src/dashboard
npm install
cd ../..

echo "🎉 Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Start the database and Redis: docker-compose up postgres redis -d"
echo "2. Run database migrations: cd src/api && npm run migrate"
echo "3. Start the API: cd src/api && npm run dev"
echo "4. Start the Dashboard: cd src/dashboard && npm run dev"
echo ""
echo "🌐 Access points:"
echo "- Dashboard: http://localhost:5173"
echo "- API: http://localhost:3001"
echo "- Database: localhost:5432"
echo "- Redis: localhost:6379" 