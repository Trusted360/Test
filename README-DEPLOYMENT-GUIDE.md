# Trusted360 AWS ECS Deployment Guide

## 📖 Complete Step-by-Step Deployment Instructions

This guide provides exact commands and procedures used to successfully deploy the Trusted360 application to AWS ECS. Follow these steps precisely to replicate the deployment for any environment (DEV, UAT, PROD).

## 🎯 Overview

This deployment process creates a containerized application running on AWS ECS Fargate with:
- API container (Node.js) on port 3000
- Dashboard container (Vite/React) on port 80
- Aurora PostgreSQL database connection
- Public IP access with security group configuration

## 📋 Prerequisites

### Required Tools
- AWS CLI configured with appropriate permissions
- Docker (for local testing if needed)
- Access to the Trusted360 source code repository

### Required AWS Resources
Before starting, ensure these resources exist:
- ECS Cluster (e.g., `trusted360-dev-cluster`)
- Aurora PostgreSQL cluster (e.g., `trusted360-dev-aurora`)
- ECR repository (`trusted360`)
- VPC with public subnets
- Security group
- IAM roles: `ecsTaskExecutionRole`

## 🚀 Step-by-Step Deployment Process

### Step 1: Infrastructure Audit and Preparation

First, audit the existing infrastructure to understand the current state:

```bash
# Check ECS cluster status
aws ecs describe-clusters --clusters trusted360-dev-cluster

# Check existing services
aws ecs describe-services --cluster trusted360-dev-cluster --services trusted360-dev-service

# Check current task definitions
aws ecs list-task-definitions --family-prefix trusted360-dev --sort DESC

# Check ECR repository
aws ecr describe-repositories --repository-names trusted360

# Check Aurora cluster status
aws rds describe-db-clusters --db-cluster-identifier trusted360-dev-aurora
```

### Step 2: Build Fresh Container Images

Build new container images from the current codebase:

```bash
# Navigate to the App directory
cd App

# Build API image
docker build -t trusted360:api-dev-latest ./src/api

# Build Dashboard image  
docker build -t trusted360:dashboard-dev-latest ./src/dashboard

# Tag images for ECR (replace ACCOUNT_ID and REGION)
docker tag trusted360:api-dev-latest 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-dev-latest
docker tag trusted360:dashboard-dev-latest 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-dev-latest
```

### Step 3: Push Images to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 119268833526.dkr.ecr.us-east-2.amazonaws.com

# Push API image
docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-dev-latest

# Push Dashboard image
docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-dev-latest
```

### Step 4: Database Password Configuration

**CRITICAL**: Ensure the database password matches your task definition. If needed, reset the Aurora cluster password:

```bash
# Reset Aurora cluster password (ONLY if needed)
aws rds modify-db-cluster --db-cluster-identifier trusted360-dev-aurora --master-user-password "password123!" --apply-immediately
```

⚠️ **Wait for the password change to complete before proceeding**

### Step 5: Create Corrected Task Definition

Create a new task definition file with the correct database credentials:

**File: `task-definition-dev-corrected.json`**
```json
{
  "family": "trusted360-dev",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::119268833526:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "trusted360-api",
      "image": "119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-dev-latest",
      "cpu": 512,
      "memory": 1536,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://trusted360:password123!@trusted360-dev-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com:5432/postgres"
        },
        {
          "name": "SKIP_MIGRATIONS",
          "value": "true"
        },
        {
          "name": "DB_USERNAME",
          "value": "trusted360"
        },
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "JWT_SECRET",
          "value": "development-jwt-secret-key-dev"
        },
        {
          "name": "NODE_ENV",
          "value": "development"
        },
        {
          "name": "DB_NAME",
          "value": "postgres"
        },
        {
          "name": "DB_HOST",
          "value": "trusted360-dev-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com"
        },
        {
          "name": "DB_PASSWORD",
          "value": "password123!"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/trusted360-dev",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-2",
          "awslogs-stream-prefix": "api"
        }
      }
    },
    {
      "name": "trusted360-dashboard",
      "image": "119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-dev-latest",
      "cpu": 512,
      "memory": 512,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "hostPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "VITE_API_BASE_URL",
          "value": "http://trusted360-dev-alb-544419701.us-east-2.elb.amazonaws.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/trusted360-dev",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-2",
          "awslogs-stream-prefix": "dashboard"
        }
      }
    }
  ]
}
```

### Step 6: Register New Task Definition

```bash
# Register the corrected task definition
aws ecs register-task-definition --cli-input-json file://task-definition-dev-corrected.json
```

Note the revision number returned (e.g., `trusted360-dev:11`)

### Step 7: Update ECS Service

```bash
# Update service to use new task definition (replace :11 with your revision)
aws ecs update-service --cluster trusted360-dev-cluster --service trusted360-dev-service --task-definition trusted360-dev:11
```

### Step 8: Configure Security Group Rules

**CRITICAL**: The security group must allow inbound traffic on ports 80 and 3000:

```bash
# Get the security group ID from your task
# First, get running task details:
aws ecs list-tasks --cluster trusted360-dev-cluster --service-name trusted360-dev-service

# Then describe the task to get network interface ID:
aws ecs describe-tasks --cluster trusted360-dev-cluster --tasks [TASK-ID]

# Get security group from network interface:
aws ec2 describe-network-interfaces --network-interface-ids [ENI-ID]

# Add HTTP rule (port 80) for dashboard
aws ec2 authorize-security-group-ingress --group-id sg-0064af207f65ff858 --protocol tcp --port 80 --cidr 0.0.0.0/0

# Add API rule (port 3000) for API
aws ec2 authorize-security-group-ingress --group-id sg-0064af207f65ff858 --protocol tcp --port 3000 --cidr 0.0.0.0/0
```

### Step 9: Run Database Migrations

Create migration override file:

**File: `migration-task-overrides.json`**
```json
{
  "containerOverrides": [
    {
      "name": "trusted360-api",
      "command": ["npm", "run", "migrate"]
    }
  ]
}
```

Execute migration task:
```bash
# Run one-time migration task
aws ecs run-task --cluster trusted360-dev-cluster --task-definition trusted360-dev:11 --overrides file://c:/path/to/migration-task-overrides.json --network-configuration "awsvpcConfiguration={subnets=[subnet-080ec5ff039084016,subnet-0e1a2f79a6109df55,subnet-0af19ebfd1221899f],securityGroups=[sg-0064af207f65ff858],assignPublicIp=ENABLED}" --launch-type FARGATE
```

### Step 10: Verify Deployment

Check service status:
```bash
# Verify service is stable
aws ecs describe-services --cluster trusted360-dev-cluster --services trusted360-dev-service

# Get public IP address
aws ecs list-tasks --cluster trusted360-dev-cluster --service-name trusted360-dev-service
aws ecs describe-tasks --cluster trusted360-dev-cluster --tasks [TASK-ID]
aws ec2 describe-network-interfaces --network-interface-ids [ENI-ID]
```

Test endpoints:
```bash
# Test dashboard (replace with your public IP)
powershell -Command "Invoke-WebRequest -Uri http://18.225.55.17 -Method Head"

# Test API health check
powershell -Command "Invoke-WebRequest -Uri http://18.225.55.17:3000/api/health -Method Get"
```

## 🔧 Environment-Specific Configurations

### For UAT Environment

Replace these values when deploying to UAT:

1. **Cluster Name**: `trusted360-uat-cluster`
2. **Service Name**: `trusted360-uat-service` 
3. **Task Definition Family**: `trusted360-uat`
4. **Database Cluster**: `trusted360-uat-aurora`
5. **ECR Image Tags**: `api-uat-latest`, `dashboard-uat-latest`
6. **Environment Variables**:
   - `NODE_ENV`: `staging`
   - `JWT_SECRET`: Use UAT-specific secret
   - Database credentials: Use UAT database details
   - `VITE_API_BASE_URL`: Point to UAT load balancer

### For PROD Environment

Replace these values when deploying to PROD:

1. **Cluster Name**: `trusted360-prod-cluster`
2. **Service Name**: `trusted360-prod-service`
3. **Task Definition Family**: `trusted360-prod`
4. **Database Cluster**: `trusted360-prod-aurora`
5. **ECR Image Tags**: `api-prod-latest`, `dashboard-prod-latest`
6. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Use production-specific secret
   - Database credentials: Use production database details
   - `VITE_API_BASE_URL`: Point to production load balancer

## ⚠️ Critical Success Factors

### Database Authentication
- **Username**: Must be `trusted360` (not `postgres`)
- **Password**: Must match exactly between Aurora cluster and task definition
- **Connection String**: Must use cluster endpoint, not instance endpoint

### Security Group Configuration
- **Port 80**: Required for dashboard access
- **Port 3000**: Required for API access
- **Outbound Rules**: Must allow all traffic for container communication

### Container Images
- **Fresh Builds**: Always build from current codebase, not old rollback images
- **Correct Tags**: Use environment-specific tags (dev, uat, prod)
- **ECR Push**: Ensure images are successfully pushed before deployment

### Network Configuration
- **Public IP**: Must be enabled for Fargate tasks
- **Subnets**: Use public subnets across multiple AZs
- **VPC**: Ensure VPC has internet gateway for public access

## 🧪 Testing and Validation

### Required Health Checks
1. **Dashboard**: HTTP 200 OK response with HTML content
2. **API Health**: `{"status":"ok","api":true}` response
3. **Database**: No "relation does not exist" errors in logs
4. **Service Stability**: ECS service shows "ACTIVE" and "STABLE"

### Common Issues and Solutions

**Issue**: Dashboard not accessible via public IP
- **Solution**: Add security group rule for port 80

**Issue**: API not responding
- **Solution**: Add security group rule for port 3000

**Issue**: Database connection errors
- **Solution**: Verify username is `trusted360` and password matches

**Issue**: Missing database tables
- **Solution**: Run migration task with `npm run migrate` command

## 📁 File Structure

After deployment, you should have these files:
```
├── task-definition-dev-corrected.json
├── migration-task-overrides.json
├── TRUSTED360-DEV-DEPLOYMENT.md
└── README-DEPLOYMENT-GUIDE.md (this file)
```

## 🎉 Success Criteria

Deployment is successful when:
- ✅ ECS service shows 1 running task
- ✅ Dashboard responds with HTTP 200 at `http://[PUBLIC-IP]`
- ✅ API responds with HTTP 200 at `http://[PUBLIC-IP]:3000/api/health`
- ✅ No database connection errors in CloudWatch logs
- ✅ Service status is "ACTIVE" and deployment status is "STABLE"

Follow this guide exactly for consistent, successful deployments across all environments.