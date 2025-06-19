#!/bin/bash

# This script initializes Ollama with required models
# It's designed to be idempotent and only download models if they don't exist

echo "Initializing Ollama..."

# Function to check if a model exists
model_exists() {
    ollama list 2>/dev/null | grep -q "$1"
}

# Function to pull a model with retry logic
pull_model() {
    local model=$1
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        echo "Pulling model: $model (attempt $((retry+1))/$max_retries)..."
        if ollama pull "$model"; then
            echo "✅ Successfully pulled $model"
            return 0
        else
            echo "⚠️  Failed to pull $model, retrying..."
            retry=$((retry+1))
            sleep 5
        fi
    done
    
    echo "❌ Failed to pull $model after $max_retries attempts"
    return 1
}

# Wait for Ollama service to be ready
echo "Waiting for Ollama service to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:11434/ > /dev/null 2>&1; then
        echo "✅ Ollama service is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Check and pull primary model
if model_exists "llama3.1:8b-instruct-q4_K_M"; then
    echo "✅ Primary model already exists: llama3.1:8b-instruct-q4_K_M"
else
    pull_model "llama3.1:8b-instruct-q4_K_M"
fi

# Check and pull fallback model
if model_exists "mistral:7b-instruct-v0.3-q4_K_M"; then
    echo "✅ Fallback model already exists: mistral:7b-instruct-v0.3-q4_K_M"
else
    pull_model "mistral:7b-instruct-v0.3-q4_K_M"
fi

echo "✅ Ollama initialization complete!"
echo "Available models:"
ollama list
