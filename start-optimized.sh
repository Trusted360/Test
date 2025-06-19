#!/bin/bash

echo "🚀 Starting Trusted360 with optimized Ollama setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

# Function to check if Ollama is responding
check_ollama_health() {
    curl -s http://localhost:11434/ > /dev/null 2>&1
    return $?
}

# Function to check if models are installed
check_models_installed() {
    local models=$(docker exec trusted360-ollama ollama list 2>/dev/null | grep -E "(llama3.1:8b-instruct-q4_K_M|mistral:7b-instruct-v0.3-q4_K_M)" | wc -l)
    [ "$models" -ge 2 ]
}

# Create external volume for Ollama data if it doesn't exist
print_status "info" "Checking Ollama data volume..."
if ! docker volume inspect ollama_data >/dev/null 2>&1; then
    print_status "warning" "Creating external Ollama data volume..."
    docker volume create ollama_data
    print_status "success" "Ollama data volume created!"
else
    print_status "success" "Ollama data volume already exists!"
fi

# Stop existing containers if running
print_status "info" "Stopping existing containers..."
docker compose -f docker-compose-optimized.yml down

# Start services with the optimized configuration
print_status "info" "Starting Docker services with optimized configuration..."
docker compose -f docker-compose-optimized.yml up -d

# Wait for Ollama to be ready
print_status "info" "Waiting for Ollama to be ready..."
for i in {1..60}; do
    if check_ollama_health; then
        print_status "success" "Ollama is responding!"
        break
    fi
    echo "   Waiting... ($i/60)"
    sleep 2
done

if ! check_ollama_health; then
    print_status "error" "Ollama failed to start properly"
    print_status "info" "Checking Ollama logs..."
    docker logs --tail 50 trusted360-ollama
    exit 1
fi

# Check if models need to be installed
if check_models_installed; then
    print_status "success" "Models already installed!"
else
    print_status "warning" "Installing Ollama models..."
    print_status "info" "This may take several minutes for the first time..."
    
    # Make init script executable
    docker exec trusted360-ollama chmod +x /init-ollama.sh
    
    # Run the init script inside the container
    docker exec trusted360-ollama /init-ollama.sh
    
    if check_models_installed; then
        print_status "success" "Models installed successfully!"
    else
        print_status "error" "Failed to install models"
        print_status "info" "Checking Ollama logs..."
        docker logs --tail 50 trusted360-ollama
    fi
fi

# Restart API and dashboard services to ensure they connect properly
print_status "info" "Restarting API and dashboard services..."
docker restart trusted360-api trusted360-web

# Wait for services to stabilize
sleep 10

# Check final status
echo ""
print_status "info" "📊 Service Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep trusted360

# Check if all services are running
RUNNING_SERVICES=$(docker ps --format "{{.Names}}" | grep trusted360 | wc -l)
if [ "$RUNNING_SERVICES" -eq 6 ]; then
    print_status "success" "All services are running!"
else
    print_status "warning" "Some services may not be running properly"
fi

echo ""
print_status "success" "🎉 Trusted360 is ready!"
echo ""
echo "🌐 Access URLs:"
echo "   • Dashboard: http://localhost:8088"
echo "   • API: http://localhost:3001"
echo "   • Traefik Dashboard: http://localhost:8081"
echo "   • Ollama API: http://localhost:11434"
echo ""

# Show available models if Ollama is working
if check_ollama_health; then
    echo "🤖 Ollama Models Available:"
    docker exec trusted360-ollama ollama list 2>/dev/null | grep -E "(llama3.1:8b-instruct-q4_K_M|mistral:7b-instruct-v0.3-q4_K_M)" | sed 's/^/   • /'
else
    print_status "warning" "Ollama is not responding properly - models may not be available"
fi

echo ""
echo "💡 Tips:"
echo "   • To preserve Ollama models, use: docker compose -f docker-compose-optimized.yml down"
echo "   • To completely reset (including models), use: docker compose -f docker-compose-optimized.yml down -v && docker volume rm ollama_data"
echo "   • To check logs: docker logs trusted360-ollama"
echo ""
