# Trusted360 Cross-Platform Deployment Guide

## Overview
This guide helps you deploy Trusted360 on different systems (macOS, Linux servers, ARM devices like Jetson).

## Pre-Deployment Checklist

### 1. System Requirements
- **Minimum RAM**: 4GB (8GB recommended)
- **ARM64 systems**: 2GB minimum, 4GB recommended
- **Docker**: 20.10+ with Docker Compose
- **Available ports**: 3001, 5432, 6379, 8088, 8090, 8443, 11434

### 2. Platform-Specific Setup

#### macOS/Linux x86_64
```bash
# Standard deployment
docker-compose up -d
```

#### ARM64 (Jetson, Raspberry Pi, etc.)
```bash
# Use ARM64-optimized configuration
docker-compose -f docker-compose.yml -f docker-compose.arm64.yml up -d
```

### 3. Port Conflict Resolution
If you encounter port conflicts, modify the `.env` file:

```bash
# Copy environment template
cp .env.example .env

# Edit ports as needed
nano .env
```

Common alternative ports:
- API: 3001 → 3002, 3003
- PostgreSQL: 5432 → 5433, 5434
- Redis: 6379 → 6380, 6381
- Web UI: 8088 → 8089, 8090

## Deployment Steps

### 1. Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd trusted360

# Create environment file
cp .env.example .env

# Edit configuration for your environment
nano .env
```

### 2. Platform Selection

#### For x86_64 Systems (Intel/AMD)
```bash
docker-compose up -d
```

#### For ARM64 Systems
```bash
# Use optimized ARM configuration
docker-compose -f docker-compose.yml -f docker-compose.arm64.yml up -d
```

### 3. Verify Deployment
```bash
# Check all services are running
docker-compose ps

# View logs if issues occur
docker-compose logs -f

# Test API endpoint
curl http://localhost:3001/api/health
```

## Troubleshooting Common Issues

### Port Conflicts
**Error**: "Port already in use"
**Solution**: 
1. Edit `.env` file to change conflicting ports
2. Update any hardcoded references
3. Restart services: `docker-compose down && docker-compose up -d`

### ARM64 Performance Issues
**Symptoms**: Slow response, timeouts, OOM errors
**Solutions**:
1. Use ARM64 override: `docker-compose -f docker-compose.yml -f docker-compose.arm64.yml up -d`
2. Reduce Ollama model size in `.env`:
   ```
   OLLAMA_MODEL_PRIMARY=llama3.2:1b-instruct-q4_K_M
   ```
3. Adjust memory limits in `docker-compose.arm64.yml`

### Database Connection Issues
**Error**: "Connection refused" or "Database not ready"
**Solutions**:
1. Ensure PostgreSQL is healthy: `docker-compose ps`
2. Check database credentials in `.env`
3. Verify network connectivity: `docker network ls`

### Ollama Model Loading Issues
**Error**: "Model not found" or timeouts
**Solutions**:
1. Allow more time for model download on first run
2. Pre-download models: `docker-compose exec ollama ollama pull llama3.2:3b-instruct-q4_K_M`
3. Use smaller models on ARM64 systems

## Network Configuration

### Local Development
- Access via: http://localhost:8088
- API: http://localhost:3001/api

### Server Deployment
1. Update `APP_DOMAIN` in `.env`
2. Configure firewall to allow required ports
3. Consider using reverse proxy (nginx) for production

### Container-to-Container Communication
All services communicate via the `trusted360-network` bridge network. No external network configuration required.

## Backup and Migration

### Data Backup
```bash
# Backup volumes
docker run --rm -v trusted360_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
docker run --rm -v trusted360_ollama_data:/data -v $(pwd):/backup alpine tar czf /backup/ollama_backup.tar.gz -C /data .
```

### Data Restore
```bash
# Restore volumes
docker run --rm -v trusted360_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
docker run --rm -v trusted360_ollama_data:/data -v $(pwd):/backup alpine tar xzf /backup/ollama_backup.tar.gz -C /data
```

## Platform-Specific Notes

### Jetson Devices
- Use `docker-compose.arm64.yml` overlay
- Consider using smaller models (1B parameters)
- Monitor temperature and throttling
- Enable swap if needed: `sudo dphys-swapfile setup`

### Linux Servers
- Run as non-root user when possible
- Configure systemd service for auto-start
- Use log rotation for container logs
- Set up monitoring (htop, docker stats)

### macOS
- Ensure Docker Desktop has sufficient resources allocated
- File sharing permissions may need adjustment
- Use `host.docker.internal` for host access if needed

## Security Considerations

### Production Deployment
- Change default passwords in `.env`
- Use environment-specific secrets management
- Enable firewall rules
- Consider TLS termination at reverse proxy
- Regular security updates

### Container Security
- Run containers as non-root where possible
- Limit container capabilities
- Use read-only filesystems where appropriate
- Regular image updates

## Performance Optimization

### Resource Monitoring
```bash
# Monitor resource usage
docker stats

# Check container health
docker-compose ps
```

### Tuning for Different Hardware
- **High-end systems**: Increase memory limits, use larger models
- **ARM64 systems**: Use ARM64 overrides, smaller models
- **Low-memory systems**: Reduce context windows, limit parallel processes

## Support and Troubleshooting

### Log Collection
```bash
# Collect all service logs
docker-compose logs --no-color > deployment_logs.txt

# Service-specific logs
docker-compose logs api
docker-compose logs ollama
```

### Health Checks
```bash
# API health
curl http://localhost:3001/api/health

# Database connectivity
docker-compose exec postgres pg_isready -U trusted360

# Redis connectivity  
docker-compose exec redis redis-cli ping
```

### Complete Reset
```bash
# Nuclear option - removes all data
docker-compose down -v
docker system prune -af
docker-compose up -d
```