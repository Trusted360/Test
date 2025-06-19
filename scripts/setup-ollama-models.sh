#!/bin/bash

echo "Setting up Ollama models for Trusted360..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Please install it first:"
    echo "curl -fsSL https://ollama.ai/install.sh | sh"
    exit 1
fi

# Start Ollama service
echo "Starting Ollama service..."
ollama serve &
sleep 5

# Pull models based on environment
if [ "$NODE_ENV" = "production" ]; then
    echo "Installing production models..."
    ollama pull llama3.2:3b-instruct-q4_K_M
    ollama pull gemma2:2b-instruct-q4_K_M
else
    echo "Installing demo models..."
    ollama pull llama3.1:8b-instruct-q4_K_M
    ollama pull mistral:7b-instruct-v0.3-q4_K_M
fi

echo "Model installation complete!"
echo "Available models:"
ollama list
