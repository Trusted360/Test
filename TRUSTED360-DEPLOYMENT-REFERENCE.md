# Trusted360 Deployment Reference Guide

## Critical Information - READ BEFORE EVERY DEPLOYMENT

### AWS Configuration
- **AWS Account ID**: `119268833526`
- **Region**: `us-east-2` (Ohio)
- **ECR Repository**: `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360`
- **ECS Cluster**: `trusted360-dev-cluster` 
- **ECS Service**: `trusted360-dev-service`

### Repository Structure
- **API Images**: `trusted360:api-dev-v{version}` → `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-dev-v{version}`
- **Dashboard Images**: `trusted360:dashboard-dev-v{version}` → `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-dev-v{version}`

### Deployment Process

#### 1. Build API Image
```bash
cd src/api
docker build -f Dockerfile -t trusted360:api-dev-v{NEW_VERSION} .
```

#### 2. Tag and Push to ECR
```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 119268833526.dkr.ecr.us-east-2.amazonaws.com

# Tag image
docker tag trusted360:api-dev-v{NEW_VERSION} 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-dev-v{NEW_VERSION}

# Push image
docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-dev-v{NEW_VERSION}
```

#### 3. Create Task Definition
- Update `task-definition-dev-v{NEW_VERSION}.json`
- API Image: `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-dev-v{NEW_VERSION}`
- Dashboard Image: `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-dev-v24` (current stable)

#### 4. Register and Deploy
```bash
# Register task definition
aws ecs register-task-definition --region us-east-2 --cli-input-json file://task-definition-dev-v{NEW_VERSION}.json

# Update service
aws ecs update-service --region us-east-2 --cluster trusted360-dev-cluster --service trusted360-dev-service --task-definition trusted360-dev:{NEW_VERSION}
```

### Database Configuration
- **Host**: `trusted360-dev-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com`
- **Database**: `postgres`
- **Username**: `trusted360`
- **Password**: `password123!`
- **Port**: `5432`

### Current Deployment Status
- **Latest API Version**: v34 (Simplified SOP system with checklist pattern)
- **Latest Dashboard Version**: v24 (stable routing fixes)
- **Current Task Definition**: trusted360-dev:34

### Common Mistakes to Avoid
1. ❌ **WRONG ACCOUNT ID**: `381492232276` 
2. ❌ **WRONG REGION**: `us-east-1`
3. ❌ **WRONG REPOSITORY**: `trusted360-dev`
4. ❌ **WRONG CLUSTER**: `trusted360-dev`
5. ❌ **WRONG SERVICE**: `trusted360-dev`

### Test Endpoints
- **Health Check**: `https://dev.trusted360.io/api/health`
- **SOP Test**: `https://dev.trusted360.io/api/sops` (with Bearer token)

## ALWAYS DOUBLE-CHECK THESE VALUES BEFORE DEPLOYMENT!