#!/bin/bash

# Create the external Ollama volume if it doesn't exist
if ! docker volume inspect ollama_data >/dev/null 2>&1; then
    echo "Creating external Ollama data volume..."
    docker volume create ollama_data
    echo "✅ Ollama data volume created!"
else
    echo "✅ Ollama data volume already exists!"
fi
