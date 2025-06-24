#!/bin/bash

# Migration script to transform Simmer into Trusted360
# This script copies Simmer and transforms it into a storage facility management system

# Get the script's directory and set paths relative to it
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TRUSTED360_DIR="$(dirname "$SCRIPT_DIR")"
SIMMER_DIR="$TRUSTED360_DIR/../simmer"

echo "🚀 Starting Simmer to Trusted360 migration..."
echo "📍 Simmer directory: $SIMMER_DIR"
echo "📍 Trusted360 directory: $TRUSTED360_DIR"

# Check if Simmer directory exists
if [ ! -d "$SIMMER_DIR" ]; then
    echo "❌ Error: Simmer directory not found at $SIMMER_DIR"
    echo "Please ensure Simmer is located at ../simmer relative to trusted360"
    exit 1
fi

# Create Trusted360 directory structure
echo "📁 Creating Trusted360 directory structure..."
cd "$TRUSTED360_DIR"
mkdir -p {database/migrations,src/{api,dashboard,video-processor},config,scripts}

# Copy base files from Simmer
echo "📋 Copying base configuration files..."
if [ -f "$SIMMER_DIR/docker-compose.yml" ]; then
    cp "$SIMMER_DIR/docker-compose.yml" "$TRUSTED360_DIR/docker-compose.yml"
fi
if [ -f "$SIMMER_DIR/.env.example" ]; then
    cp "$SIMMER_DIR/.env.example" "$TRUSTED360_DIR/.env.example"
fi
if [ -d "$SIMMER_DIR/config" ]; then
    cp -r "$SIMMER_DIR/config/"* "$TRUSTED360_DIR/config/" 2>/dev/null || true
fi

# Copy source directories
echo "📦 Copying source code..."
if [ -d "$SIMMER_DIR/src/api" ]; then
    cp -r "$SIMMER_DIR/src/api/"* "$TRUSTED360_DIR/src/api/" 2>/dev/null || true
fi
if [ -d "$SIMMER_DIR/src/web" ]; then
    cp -r "$SIMMER_DIR/src/web/"* "$TRUSTED360_DIR/src/dashboard/" 2>/dev/null || true
fi
if [ -d "$SIMMER_DIR/database" ]; then
    cp -r "$SIMMER_DIR/database/"* "$TRUSTED360_DIR/database/" 2>/dev/null || true
fi

# Copy Dockerfiles if they exist
echo "🐳 Copying Docker configurations..."
for dockerfile in "$SIMMER_DIR"/Dockerfile.*; do
    if [ -f "$dockerfile" ]; then
        cp "$dockerfile" "$TRUSTED360_DIR/"
    fi
done

echo "✅ Base files copied. Starting transformation..."

# Transform docker-compose.yml
if [ -f "$TRUSTED360_DIR/docker-compose.yml" ]; then
    echo "🔄 Transforming docker-compose.yml..."
    sed -i 's/simmer/trusted360/g' "$TRUSTED360_DIR/docker-compose.yml"
    sed -i 's/web:/dashboard:/g' "$TRUSTED360_DIR/docker-compose.yml"
    sed -i 's/Dockerfile\.web/Dockerfile.dashboard/g' "$TRUSTED360_DIR/docker-compose.yml"
fi

# Rename Dockerfile.web to Dockerfile.dashboard if it exists
if [ -f "$TRUSTED360_DIR/Dockerfile.web" ]; then
    mv "$TRUSTED360_DIR/Dockerfile.web" "$TRUSTED360_DIR/Dockerfile.dashboard"
fi

# Update environment variables
echo "🔧 Creating Trusted360 environment variables..."
cat > "$TRUSTED360_DIR/.env.example" << 'EOF'
# Database
POSTGRES_PASSWORD=trusted360_secure_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Application
NODE_ENV=production
JWT_SECRET=your-jwt-secret-here
DOMAIN=trusted360.local

# API URLs
VITE_API_URL=https://api.trusted360.local
VITE_WEBSOCKET_URL=wss://api.trusted360.local/ws

# Video Processing
VIDEO_MODEL_TYPE=yolov8
VIDEO_CONFIDENCE_THRESHOLD=0.7
MAX_VIDEO_RETENTION_DAYS=30

# Multi-tenancy
ENABLE_MULTI_TENANT=true
DEFAULT_ORGANIZATION_SLUG=default

# Storage
S3_BUCKET=trusted360-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
EOF

echo "✅ Migration complete! Next steps:"
echo "1. cd $TRUSTED360_DIR"
echo "2. Review and update the transformed files"
echo "3. Run database migrations"
echo "4. Update API endpoints and frontend components" 