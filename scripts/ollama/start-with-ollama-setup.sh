#!/bin/bash

echo "🚀 Starting Trusted360 with Ollama setup..."

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
echo "📦 Checking Ollama data volume..."
if ! docker volume inspect ollama_data >/dev/null 2>&1; then
    echo "   Creating external Ollama data volume..."
    docker volume create ollama_data
    echo "✅ Ollama data volume created!"
else
    echo "✅ Ollama data volume already exists!"
fi

# Start services
echo "📦 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for Ollama to be ready..."
# Wait for Ollama to start
for i in {1..60}; do
    if check_ollama_health; then
        echo "✅ Ollama is responding!"
        break
    fi
    echo "   Waiting... ($i/60)"
    sleep 2
done

if ! check_ollama_health; then
    echo "❌ Ollama failed to start properly"
    exit 1
fi

# Check if models are already installed
if check_models_installed; then
    echo "✅ Models already installed!"
else
    echo "📥 Installing Ollama models..."
    echo "   This may take several minutes for the first time..."
    
    # Make init script executable
    docker exec trusted360-ollama chmod +x /init-ollama.sh
    
    # Run the init script inside the container
    docker exec trusted360-ollama /init-ollama.sh
    
    if check_models_installed; then
        echo "✅ Models installed successfully!"
    else
        echo "⚠️  Some models may not have installed properly"
    fi
fi

# Start API and Web services (they may have failed due to Ollama healthcheck)
echo "🔄 Ensuring all services are running..."
docker start trusted360-api 2>/dev/null || true
docker start trusted360-web 2>/dev/null || true

# Wait a moment for services to stabilize
sleep 5

# Check final status
echo ""
echo "📊 Service Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep trusted360

echo ""
echo "🎉 Trusted360 is ready!"
echo ""
echo "🌐 Access URLs:"
echo "   • Dashboard: http://localhost:8088"
echo "   • API: http://localhost:3001"
echo "   • Traefik Dashboard: http://localhost:8081"
echo ""
echo "🤖 Ollama Models Available:"
docker exec trusted360-ollama ollama list 2>/dev/null | grep -E "(llama3.1:8b-instruct-q4_K_M|mistral:7b-instruct-v0.3-q4_K_M)" | sed 's/^/   • /'
echo ""
echo "💡 Tip: Models are now preserved when using 'docker compose down -v'"
echo ""
