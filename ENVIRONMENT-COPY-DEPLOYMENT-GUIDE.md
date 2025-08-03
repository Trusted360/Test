# Trusted360 Environment Copy and Deployment Guide

## 📁 Directory Structure and Copy Process

This guide assumes you have successfully deployed the DEV environment and now want to replicate that success to UAT and PROD by copying the working `App` folder and making environment-specific modifications.

### Expected Directory Structure
```
c:\Trusted360ENV\
├── dev\
│   └── App\  (✅ WORKING - Source for copying)
├── uat\
│   └── App\  (📋 To be created by copying from dev)
└── prod\
    └── App\  (📋 To be created by copying from dev)
```

## 🔄 Step 1: Copy Working App Folder to UAT

### Copy the Entire App Directory
```bash
# Navigate to Trusted360ENV root
cd c:\Trusted360ENV

# Copy the working dev App folder to UAT
xcopy "dev\App" "uat\App" /E /I /H /Y

# Verify the copy was successful
dir uat\App
```

### Verify Critical Files Were Copied
```bash
cd uat\App

# Check that these essential files exist:
dir task-definition-dev-corrected.json
dir migration-task-overrides.json
dir TRUSTED360-DEV-DEPLOYMENT.md
dir README-DEPLOYMENT-GUIDE.md
dir src\api\Dockerfile
dir src\dashboard\Dockerfile
```

## 🔧 Step 2: Modify UAT Environment Configuration

### 2.1: Discover UAT Infrastructure
```bash
cd c:\Trusted360ENV\uat\App

# Discover UAT AWS resources
aws ecs describe-clusters --clusters trusted360-uat-cluster
aws rds describe-db-clusters --db-cluster-identifier trusted360-uat-aurora
aws elbv2 describe-load-balancers --names trusted360-uat-alb

# Get UAT VPC and networking details
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=*uat*"
aws ec2 describe-subnets --filters "Name=tag:Name,Values=*uat*"
aws ec2 describe-security-groups --filters "Name=tag:Name,Values=*uat*"
```

### 2.2: Create UAT-Specific Task Definition

**File: `c:\Trusted360ENV\uat\App\task-definition-uat-corrected.json`**

```json
{
  "family": "trusted360-uat",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::119268833526:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "trusted360-api",
      "image": "119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-uat-latest",
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
          "value": "postgresql://trusted360:password123!@[UAT-AURORA-ENDPOINT]:5432/postgres"
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
          "value": "uat-jwt-secret-key-uat"
        },
        {
          "name": "NODE_ENV",
          "value": "staging"
        },
        {
          "name": "DB_NAME",
          "value": "postgres"
        },
        {
          "name": "DB_HOST",
          "value": "[UAT-AURORA-ENDPOINT]"
        },
        {
          "name": "DB_PASSWORD",
          "value": "password123!"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/trusted360-uat",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-2",
          "awslogs-stream-prefix": "api"
        }
      }
    },
    {
      "name": "trusted360-dashboard",
      "image": "119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-uat-latest",
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
          "value": "http://[UAT-LOAD-BALANCER-DNS]"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/trusted360-uat",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-2",
          "awslogs-stream-prefix": "dashboard"
        }
      }
    }
  ]
}
```

### 2.3: Update Task Definition with Real UAT Values

```bash
# Get UAT Aurora endpoint
UAT_DB_ENDPOINT=$(aws rds describe-db-clusters --db-cluster-identifier trusted360-uat-aurora --query 'DBClusters[0].Endpoint' --output text)

# Get UAT Load Balancer DNS
UAT_LB_DNS=$(aws elbv2 describe-load-balancers --names trusted360-uat-alb --query 'LoadBalancers[0].DNSName' --output text)

# Replace placeholders in task definition
sed -i "s/\[UAT-AURORA-ENDPOINT\]/$UAT_DB_ENDPOINT/g" task-definition-uat-corrected.json
sed -i "s/\[UAT-LOAD-BALANCER-DNS\]/$UAT_LB_DNS/g" task-definition-uat-corrected.json

# Verify the replacements worked
grep -E "(DATABASE_URL|DB_HOST|VITE_API_BASE_URL)" task-definition-uat-corrected.json
```

## 🚀 Step 3: Deploy UAT Environment

### 3.1: Build UAT Container Images
```bash
cd c:\Trusted360ENV\uat\App

# Build API container with UAT tag
docker build -t trusted360:api-uat-latest ./src/api

# Build Dashboard container with UAT tag
docker build -t trusted360:dashboard-uat-latest ./src/dashboard

# Tag for ECR
docker tag trusted360:api-uat-latest 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-uat-latest
docker tag trusted360:dashboard-uat-latest 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-uat-latest
```

### 3.2: Push UAT Images to ECR
```bash
# Login to ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 119268833526.dkr.ecr.us-east-2.amazonaws.com

# Push UAT images
docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-uat-latest
docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-uat-latest
```

### 3.3: Setup UAT Database Password
```bash
# Reset UAT Aurora cluster password to match task definition
aws rds modify-db-cluster --db-cluster-identifier trusted360-uat-aurora --master-user-password "password123!" --apply-immediately

# Wait for password change to complete (check status)
aws rds describe-db-clusters --db-cluster-identifier trusted360-uat-aurora --query 'DBClusters[0].Status'
```

### 3.4: Deploy UAT Task Definition
```bash
# Register UAT task definition
aws ecs register-task-definition --cli-input-json file://task-definition-uat-corrected.json

# Get the revision number
UAT_REVISION=$(aws ecs describe-task-definition --task-definition trusted360-uat --query 'taskDefinition.revision' --output text)
echo "UAT Task Definition Revision: trusted360-uat:$UAT_REVISION"

# Update UAT service
aws ecs update-service --cluster trusted360-uat-cluster --service trusted360-uat-service --task-definition trusted360-uat:$UAT_REVISION
```

### 3.5: Configure UAT Security Groups
```bash
# Wait for service to stabilize
aws ecs wait services-stable --cluster trusted360-uat-cluster --services trusted360-uat-service

# Get UAT task details
UAT_TASK_ARN=$(aws ecs list-tasks --cluster trusted360-uat-cluster --service-name trusted360-uat-service --query 'taskArns[0]' --output text)
UAT_ENI_ID=$(aws ecs describe-tasks --cluster trusted360-uat-cluster --tasks $UAT_TASK_ARN --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
UAT_SG_ID=$(aws ec2 describe-network-interfaces --network-interface-ids $UAT_ENI_ID --query 'NetworkInterfaces[0].Groups[0].GroupId' --output text)

# Add security group rules for UAT
aws ec2 authorize-security-group-ingress --group-id $UAT_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $UAT_SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0
```

### 3.6: Run UAT Database Migrations
```bash
# Create UAT migration override file
cat > migration-task-overrides-uat.json << EOF
{
  "containerOverrides": [
    {
      "name": "trusted360-api",
      "command": ["npm", "run", "migrate"]
    }
  ]
}
EOF

# Get UAT network configuration
UAT_SUBNETS=$(aws ecs describe-services --cluster trusted360-uat-cluster --services trusted360-uat-service --query 'services[0].networkConfiguration.awsvpcConfiguration.subnets' --output text | tr '\t' ',')
UAT_SECURITY_GROUPS=$(aws ecs describe-services --cluster trusted360-uat-cluster --services trusted360-uat-service --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups' --output text)

# Run UAT migration task
aws ecs run-task --cluster trusted360-uat-cluster --task-definition trusted360-uat:$UAT_REVISION --overrides file://c:/Trusted360ENV/uat/App/migration-task-overrides-uat.json --network-configuration "awsvpcConfiguration={subnets=[$UAT_SUBNETS],securityGroups=[$UAT_SECURITY_GROUPS],assignPublicIp=ENABLED}" --launch-type FARGATE
```

### 3.7: Test UAT Deployment
```bash
# Get UAT public IP
UAT_PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $UAT_ENI_ID --query 'NetworkInterfaces[0].Association.PublicIp' --output text)

echo "UAT Environment URLs:"
echo "Dashboard: http://$UAT_PUBLIC_IP"
echo "API: http://$UAT_PUBLIC_IP:3000"
echo "Health Check: http://$UAT_PUBLIC_IP:3000/api/health"

# Test UAT endpoints
powershell -Command "Invoke-WebRequest -Uri http://$UAT_PUBLIC_IP -Method Head"
powershell -Command "Invoke-WebRequest -Uri http://$UAT_PUBLIC_IP:3000/api/health -Method Get"
```

## 🔄 Step 4: Copy and Deploy PROD Environment

### 4.1: Copy App Folder to PROD
```bash
cd c:\Trusted360ENV

# Copy the working dev App folder to PROD
xcopy "dev\App" "prod\App" /E /I /H /Y

cd prod\App
```

### 4.2: Create PROD-Specific Task Definition

**File: `c:\Trusted360ENV\prod\App\task-definition-prod-corrected.json`**

```json
{
  "family": "trusted360-prod",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::119268833526:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "trusted360-api",
      "image": "119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-prod-latest",
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
          "value": "postgresql://trusted360:password123!@[PROD-AURORA-ENDPOINT]:5432/postgres"
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
          "value": "production-jwt-secret-key-prod"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DB_NAME",
          "value": "postgres"
        },
        {
          "name": "DB_HOST",
          "value": "[PROD-AURORA-ENDPOINT]"
        },
        {
          "name": "DB_PASSWORD",
          "value": "password123!"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/trusted360-prod",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-2",
          "awslogs-stream-prefix": "api"
        }
      }
    },
    {
      "name": "trusted360-dashboard",
      "image": "119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-prod-latest",
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
          "value": "http://[PROD-LOAD-BALANCER-DNS]"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/trusted360-prod",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-2",
          "awslogs-stream-prefix": "dashboard"
        }
      }
    }
  ]
}
```

### 4.3: Deploy PROD (Same Process as UAT)
```bash
cd c:\Trusted360ENV\prod\App

# Get PROD infrastructure details
PROD_DB_ENDPOINT=$(aws rds describe-db-clusters --db-cluster-identifier trusted360-prod-aurora --query 'DBClusters[0].Endpoint' --output text)
PROD_LB_DNS=$(aws elbv2 describe-load-balancers --names trusted360-prod-alb --query 'LoadBalancers[0].DNSName' --output text)

# Update task definition
sed -i "s/\[PROD-AURORA-ENDPOINT\]/$PROD_DB_ENDPOINT/g" task-definition-prod-corrected.json
sed -i "s/\[PROD-LOAD-BALANCER-DNS\]/$PROD_LB_DNS/g" task-definition-prod-corrected.json

# Build PROD images
docker build -t trusted360:api-prod-latest ./src/api
docker build -t trusted360:dashboard-prod-latest ./src/dashboard

# Tag and push to ECR
docker tag trusted360:api-prod-latest 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-prod-latest
docker tag trusted360:dashboard-prod-latest 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-prod-latest

docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-prod-latest
docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-prod-latest

# Deploy PROD (follow same steps as UAT but with prod cluster/service names)
```

## 📋 Environment-Specific Checklist

### For Each Environment (UAT/PROD):

#### ✅ Infrastructure Discovery
- [ ] Cluster exists and is active
- [ ] Service exists (create if needed)
- [ ] Aurora database cluster exists
- [ ] Load balancer exists and is active
- [ ] VPC and subnets are properly configured
- [ ] Security groups exist

#### ✅ Configuration Files
- [ ] Task definition created with correct environment name
- [ ] Database endpoints updated in task definition
- [ ] Load balancer DNS updated in task definition
- [ ] Environment variables set correctly (NODE_ENV, JWT_SECRET)
- [ ] Image tags match environment (api-uat-latest, api-prod-latest)

#### ✅ Container Deployment
- [ ] API container built successfully
- [ ] Dashboard container built successfully
- [ ] Images tagged correctly for ECR
- [ ] Images pushed to ECR successfully
- [ ] ECR images visible in repository

#### ✅ Database Configuration
- [ ] Aurora cluster password reset to match task definition
- [ ] Password change completed (cluster status = available)
- [ ] Database connection string formatted correctly
- [ ] Username set to "trusted360" (not "postgres")

#### ✅ ECS Deployment  
- [ ] Task definition registered successfully
- [ ] Service updated with new task definition
- [ ] Service deployment completed and stable
- [ ] Task running successfully (1/1 desired count)

#### ✅ Network Security
- [ ] Security group rules added for port 80 (dashboard)
- [ ] Security group rules added for port 3000 (API)
- [ ] Public IP assigned to task
- [ ] Network interface configuration correct

#### ✅ Database Migrations
- [ ] Migration task definition created
- [ ] Migration task executed successfully
- [ ] Migration task completed with exit code 0
- [ ] Database schema properly created

#### ✅ Testing and Validation
- [ ] Dashboard accessible via public IP (HTTP 200)
- [ ] API health check responding (HTTP 200)  
- [ ] API returning `{"status":"ok","api":true}`
- [ ] No database connection errors in logs
- [ ] Service shows ACTIVE and STABLE status

## 🚨 Common Issues and Solutions

### Issue: Task Definition Registration Fails
**Solution**: Check JSON syntax and verify all placeholders are replaced

### Issue: Container Images Not Found
**Solution**: Verify images were pushed to ECR and tags match task definition

### Issue: Database Connection Errors
**Solution**: 
1. Verify password was reset correctly
2. Check username is "trusted360" not "postgres"  
3. Confirm database endpoint is correct

### Issue: Dashboard/API Not Accessible
**Solution**: Add security group rules for ports 80 and 3000

### Issue: Migration Fails
**Solution**: Check database connectivity and verify migration scripts exist

## 📁 Final Directory Structure
After completing UAT and PROD deployments:

```
c:\Trusted360ENV\
├── dev\
│   └── App\
│       ├── task-definition-dev-corrected.json
│       ├── migration-task-overrides.json
│       └── [deployment files]
├── uat\
│   └── App\
│       ├── task-definition-uat-corrected.json  
│       ├── migration-task-overrides-uat.json
│       └── [deployment files]
└── prod\
    └── App\
        ├── task-definition-prod-corrected.json
        ├── migration-task-overrides-prod.json
        └── [deployment files]
```

This guide ensures you can successfully replicate the working DEV deployment to UAT and PROD environments by copying the App folder and making the necessary environment-specific modifications.