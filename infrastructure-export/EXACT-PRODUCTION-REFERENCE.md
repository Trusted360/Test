# EXACT PRODUCTION CONFIGURATION REFERENCE

## CRITICAL: This document contains the EXACT specifications that MUST be replicated in all environments

### ECS Task Definition: `trusted360-rollback:4`

#### **Task-Level Specifications**
- **Family**: `trusted360-rollback`
- **Execution Role**: `arn:aws:iam::119268833526:role/ecsTaskExecutionRole`
- **Network Mode**: `awsvpc`
- **Requires Compatibilities**: `["FARGATE"]`
- **CPU**: `"1024"` (TOTAL)
- **Memory**: `"2048"` (TOTAL)

#### **API Container: `trusted360-api`**
- **Image**: `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-rollback-v1`
- **CPU**: `512`
- **Memory**: `1536`
- **Port Mappings**: 
  - Container Port: `3000`
  - Host Port: `3000`
  - Protocol: `tcp`
- **Essential**: `true`

**Environment Variables** (EXACT):
```
DATABASE_URL: postgresql://trusted360:%23~%21%5DdN%5BEYGGrrUv%21sivs1gj%24O~bL@trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com:5432/postgres
SKIP_MIGRATIONS: true
DB_USERNAME: trusted360
PORT: 3000
JWT_SECRET: production-jwt-secret-key-87432
NODE_ENV: development
DB_NAME: postgres
DB_HOST: trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com
DB_PASSWORD: #~!]dN[EYGGrrUv!sivs1gj$O~bL
```

**Log Configuration**:
- **Driver**: `awslogs`
- **Group**: `/ecs/trusted360-rollback`
- **Create Group**: `true`
- **Region**: `us-east-2`
- **Stream Prefix**: `api`

#### **Dashboard Container: `trusted360-dashboard`**
- **Image**: `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-rollback-v1`
- **CPU**: `512`
- **Memory**: `512`
- **Port Mappings**: 
  - Container Port: `80`
  - Host Port: `80`
  - Protocol: `tcp`
- **Essential**: `true`

**Environment Variables** (EXACT):
```
VITE_API_BASE_URL: http://trusted360-alb-1477321.us-east-2.elb.amazonaws.com
```

**Log Configuration**:
- **Driver**: `awslogs`
- **Group**: `/ecs/trusted360-rollback`
- **Create Group**: `true`
- **Region**: `us-east-2`
- **Stream Prefix**: `dashboard`

### ECS Service Configuration

#### **Service: `trusted360-service`**
- **Cluster**: `node-app-cluster`
- **Launch Type**: `FARGATE`
- **Platform Version**: `1.4.0`
- **Platform Family**: `Linux`
- **Desired Count**: `1`
- **Deployment Configuration**:
  - **Circuit Breaker**: enabled=`true`, rollback=`true`
  - **Maximum Percent**: `200`
  - **Minimum Healthy Percent**: `100`
  - **Strategy**: `ROLLING`

#### **Load Balancer Configuration**
- **Target Group ARN**: `arn:aws:elasticloadbalancing:us-east-2:119268833526:targetgroup/trusted360-targets/eb8a12b13375cb81`
- **Container Name**: `trusted360-dashboard`
- **Container Port**: `80`

#### **Network Configuration**
- **VPC Mode**: `awsvpc`
- **Security Groups**: `["sg-03fb9f8713c9a5c5b"]`
- **Subnets**: 
  - `subnet-080ec5ff039084016`
  - `subnet-0e1a2f79a6109df55`
  - `subnet-0af19ebfd1221899f`
- **Assign Public IP**: `ENABLED`

### Aurora Database Configuration
- **Cluster Identifier**: `trusted360-aurora`
- **Endpoint**: `trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com`
- **Port**: `5432`
- **Engine**: `aurora-postgresql`
- **Database Name**: `postgres`
- **Master Username**: `trusted360`
- **Master Password**: `#~!]dN[EYGGrrUv!sivs1gj$O~bL`

### Load Balancer Details
- **DNS Name**: `trusted360-alb-1477321.us-east-2.elb.amazonaws.com`
- **Target Group**: `trusted360-targets`

---

## ENVIRONMENT-SPECIFIC VARIATIONS

Each environment (DEV/UAT/PROD) MUST have IDENTICAL specifications with ONLY these differences:

### DEV Environment Modifications
- **Database endpoint**: `trusted360-dev-aurora.cluster-xxx.us-east-2.rds.amazonaws.com`
- **Load balancer URL**: Environment-specific ALB DNS name
- **JWT Secret**: `development-jwt-secret-key-dev`
- **NODE_ENV**: `development`
- **Log Group**: `/ecs/trusted360-dev`

### UAT Environment Modifications
- **Database endpoint**: `trusted360-uat-aurora.cluster-xxx.us-east-2.rds.amazonaws.com`
- **Load balancer URL**: Environment-specific ALB DNS name
- **JWT Secret**: `uat-jwt-secret-key-uat`
- **NODE_ENV**: `staging`
- **Log Group**: `/ecs/trusted360-uat`

### PROD Environment Modifications
- **Database endpoint**: `trusted360-prod-aurora.cluster-xxx.us-east-2.rds.amazonaws.com`
- **Load balancer URL**: Environment-specific ALB DNS name
- **JWT Secret**: `production-jwt-secret-key-prod`
- **NODE_ENV**: `production`
- **Log Group**: `/ecs/trusted360-prod`

---

## NON-NEGOTIABLE REQUIREMENTS

1. **CPU/Memory allocation MUST be identical**: 1024/2048 total, 512/1536 API, 512/512 Dashboard
2. **All environment variables MUST be present** with correct naming
3. **Network configuration MUST match** production subnets and security groups
4. **Load balancer configuration MUST be identical** except for DNS names
5. **Aurora databases MUST have identical engine and configuration**
6. **Container images MUST use the same production tags**: `api-rollback-v1`, `dashboard-rollback-v1`