#!/bin/bash

# This wrapper ensures the external ollama_data volume exists before running docker-compose commands

# Create external volume for Ollama data if it doesn't exist
if ! docker volume inspect ollama_data >/dev/null 2>&1; then
    echo "Creating external Ollama data volume..."
    docker volume create ollama_data
fi

# Pass all arguments to docker-compose
docker-compose "$@"
