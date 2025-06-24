# Ollama Optimization Guide

## Problem Solved

The original setup had several issues:
1. Ollama container was failing health checks due to checking `/api/tags` before models were loaded
2. Using `docker compose down -v` was removing the ollama_data volume, causing models to be re-downloaded
3. No proper initialization script for models
4. API service depended on Ollama being "healthy" which was failing

## Solution Implemented

### 1. **External Volume for Ollama Data**
- Created `ollama_data` as an external volume that persists across `docker compose down -v`
- Models are now preserved even when destroying containers

### 2. **Improved Health Check**
- Changed from checking `/api/tags` to just checking if service responds at `/`
- Added longer start period (120s) to allow Ollama to initialize
- Changed API dependency from `service_healthy` to `service_started`

### 3. **Initialization Script**
- Created `/scripts/init-ollama.sh` that:
  - Checks if models already exist before downloading
  - Has retry logic for model downloads
  - Is idempotent (safe to run multiple times)

### 4. **Optimized Startup Script**
- `start-optimized.sh` handles:
  - Creating external volume if needed
  - Better error handling and colored output
  - Model installation only when needed
  - Service health monitoring

## Migration Steps

1. **Stop current services:**
   ```bash
   docker compose down -v
   ```

2. **Use the optimized setup:**
   ```bash
   ./start-optimized.sh
   ```

   First run will:
   - Create external ollama_data volume
   - Download models (one-time operation)
   - Start all services

3. **For subsequent runs:**
   ```bash
   # To stop (preserves Ollama models):
   docker compose -f docker-compose-optimized.yml down
   
   # To start again (models already cached):
   ./start-optimized.sh
   ```

## Key Commands

### Normal Operations
```bash
# Start services
./start-optimized.sh

# Stop services (preserves data)
docker compose -f docker-compose-optimized.yml down

# View logs
docker logs trusted360-ollama
docker compose -f docker-compose-optimized.yml logs -f
```

### Complete Reset
```bash
# Remove everything including cached models
docker compose -f docker-compose-optimized.yml down -v
docker volume rm ollama_data
```

### Check Model Status
```bash
# List installed models
docker exec trusted360-ollama ollama list

# Check Ollama health
curl http://localhost:11434/
```

## Performance Benefits

1. **Faster Rebuilds**: Models are cached in external volume
2. **Reliable Startup**: Better health checks prevent false failures
3. **Idempotent**: Safe to run multiple times without re-downloading
4. **Better Error Handling**: Clear status messages and error reporting

## Troubleshooting

If Ollama fails to start:
1. Check logs: `docker logs trusted360-ollama`
2. Ensure port 11434 is not in use: `lsof -i :11434`
3. Check disk space for model storage: `docker system df`
4. Try complete reset if needed (see commands above)

## Next Steps

Once you've migrated to the optimized setup, you can update your workflow to use:
- `docker-compose-optimized.yml` instead of `docker-compose.yml`
- `start-optimized.sh` instead of `start-with-ollama-setup.sh`

The original files are preserved if you need to reference them.
