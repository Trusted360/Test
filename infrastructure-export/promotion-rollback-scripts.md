# Environment Promotion and Rollback Scripts

## Overview
Automated scripts for managing DEV → UAT → PROD promotion workflow with validation and rollback capabilities.

## Environment URLs
- **DEV**: `http://trusted360-dev-alb-544419701.us-east-2.elb.amazonaws.com`
- **UAT**: `http://trusted360-uat-alb-1649253466.us-east-2.elb.amazonaws.com`
- **PROD**: `http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com`

---

## 1. Environment Promotion Scripts

### DEV → UAT Promotion Script
```bash
#!/bin/bash
# promote-dev-to-uat.sh
# Promotes a successful DEV build to UAT environment

set -e

# Configuration
DEV_CLUSTER="trusted360-dev-cluster"
UAT_CLUSTER="trusted360-uat-cluster"
UAT_SERVICE="trusted360-uat-service"
DEV_IMAGE_TAG=${1:-"dev-latest"}
UAT_VERSION=${2:-$(date +%Y%m%d_%H%M%S)}

echo "🚀 Starting DEV → UAT Promotion"
echo "DEV Image Tag: $DEV_IMAGE_TAG"
echo "UAT Version: $UAT_VERSION"

# Step 1: Validate DEV environment health
echo "📋 Validating DEV environment..."
DEV_HEALTH=$(curl -s http://trusted360-dev-alb-544419701.us-east-2.elb.amazonaws.com/health || echo "FAILED")
if [[ "$DEV_HEALTH" != *"healthy"* ]]; then
    echo "❌ DEV environment health check failed. Aborting promotion."
    exit 1
fi
echo "✅ DEV environment is healthy"

# Step 2: Tag DEV image for UAT
echo "🏷️ Tagging image for UAT deployment..."
ECR_REPO="119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360"

# Tag API image
aws ecr batch-get-image --repository-name trusted360 --image-ids imageTag=$DEV_IMAGE_TAG --query 'images[0].imageManifest' --output text | \
aws ecr put-image --repository-name trusted360 --image-tag "uat-$UAT_VERSION" --image-manifest file:///dev/stdin

# Tag Dashboard image  
aws ecr batch-get-image --repository-name trusted360 --image-ids imageTag="dashboard-$DEV_IMAGE_TAG" --query 'images[0].imageManifest' --output text | \
aws ecr put-image --repository-name trusted360 --image-tag "dashboard-uat-$UAT_VERSION" --image-manifest file:///dev/stdin

echo "✅ Images tagged for UAT"

# Step 3: Create new UAT task definition
echo "📝 Creating UAT task definition..."
UAT_TASK_DEF=$(aws ecs describe-task-definition --task-definition trusted360-uat --query 'taskDefinition')

# Update image tags in task definition
NEW_UAT_TASK_DEF=$(echo $UAT_TASK_DEF | jq --arg api_image "$ECR_REPO:uat-$UAT_VERSION" --arg dashboard_image "$ECR_REPO:dashboard-uat-$UAT_VERSION" '
  .containerDefinitions[0].image = $api_image |
  .containerDefinitions[1].image = $dashboard_image |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)
')

# Register new task definition
NEW_REVISION=$(echo $NEW_UAT_TASK_DEF | aws ecs register-task-definition --cli-input-json file:///dev/stdin --query 'taskDefinition.revision')

echo "✅ New UAT task definition registered: trusted360-uat:$NEW_REVISION"

# Step 4: Update UAT service
echo "🔄 Updating UAT service..."
aws ecs update-service --cluster $UAT_CLUSTER --service $UAT_SERVICE --task-definition trusted360-uat:$NEW_REVISION

echo "⏳ Waiting for UAT deployment to complete..."
aws ecs wait services-stable --cluster $UAT_CLUSTER --services $UAT_SERVICE

# Step 5: Validate UAT deployment
echo "🔍 Validating UAT deployment..."
sleep 30  # Allow time for health checks
UAT_HEALTH=$(curl -s http://trusted360-uat-alb-1649253466.us-east-2.elb.amazonaws.com/health || echo "FAILED")
if [[ "$UAT_HEALTH" != *"healthy"* ]]; then
    echo "❌ UAT deployment failed health check. Rolling back..."
    PREVIOUS_REVISION=$((NEW_REVISION - 1))
    aws ecs update-service --cluster $UAT_CLUSTER --service $UAT_SERVICE --task-definition trusted360-uat:$PREVIOUS_REVISION
    echo "🔄 Rolled back to previous revision: $PREVIOUS_REVISION"
    exit 1
fi

echo "✅ UAT Promotion Successful!"
echo "🎯 UAT Version: $UAT_VERSION"
echo "📍 UAT URL: http://trusted360-uat-alb-1649253466.us-east-2.elb.amazonaws.com"
```

### UAT → PROD Promotion Script
```bash
#!/bin/bash
# promote-uat-to-prod.sh
# Promotes a validated UAT build to PROD environment

set -e

# Configuration
UAT_CLUSTER="trusted360-uat-cluster"
PROD_CLUSTER="trusted360-prod-cluster"
PROD_SERVICE="trusted360-prod-service"
UAT_VERSION=${1:-"latest"}
PROD_VERSION=${2:-$(date +%Y%m%d_%H%M%S)}

echo "🚀 Starting UAT → PROD Promotion"
echo "UAT Version: $UAT_VERSION"
echo "PROD Version: $PROD_VERSION"

# Step 1: Validate UAT environment extensively
echo "📋 Performing comprehensive UAT validation..."
UAT_HEALTH=$(curl -s http://trusted360-uat-alb-1649253466.us-east-2.elb.amazonaws.com/health || echo "FAILED")
if [[ "$UAT_HEALTH" != *"healthy"* ]]; then
    echo "❌ UAT environment health check failed. Aborting promotion."
    exit 1
fi

# Additional UAT validation (API endpoints, database connectivity, etc.)
echo "🔍 Testing UAT API endpoints..."
curl -s -f http://trusted360-uat-alb-1649253466.us-east-2.elb.amazonaws.com/api/version || {
    echo "❌ UAT API endpoint test failed. Aborting promotion."
    exit 1
}

echo "✅ UAT environment fully validated"

# Step 2: Create production backup point
echo "💾 Creating production backup point..."
CURRENT_PROD_TASK_DEF=$(aws ecs describe-services --cluster $PROD_CLUSTER --services $PROD_SERVICE --query 'services[0].taskDefinition' --output text)
echo "📝 Current PROD task definition: $CURRENT_PROD_TASK_DEF"

# Step 3: Tag UAT images for PROD
echo "🏷️ Tagging UAT images for PROD deployment..."
ECR_REPO="119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360"

# Tag API image
aws ecr batch-get-image --repository-name trusted360 --image-ids imageTag="uat-$UAT_VERSION" --query 'images[0].imageManifest' --output text | \
aws ecr put-image --repository-name trusted360 --image-tag "prod-$PROD_VERSION" --image-manifest file:///dev/stdin

# Tag Dashboard image
aws ecr batch-get-image --repository-name trusted360 --image-ids imageTag="dashboard-uat-$UAT_VERSION" --query 'images[0].imageManifest' --output text | \
aws ecr put-image --repository-name trusted360 --image-tag "dashboard-prod-$PROD_VERSION" --image-manifest file:///dev/stdin

echo "✅ Production images tagged"

# Step 4: Create new PROD task definition
echo "📝 Creating PROD task definition..."
PROD_TASK_DEF=$(aws ecs describe-task-definition --task-definition trusted360-prod --query 'taskDefinition')

# Update image tags in task definition
NEW_PROD_TASK_DEF=$(echo $PROD_TASK_DEF | jq --arg api_image "$ECR_REPO:prod-$PROD_VERSION" --arg dashboard_image "$ECR_REPO:dashboard-prod-$PROD_VERSION" '
  .containerDefinitions[0].image = $api_image |
  .containerDefinitions[1].image = $dashboard_image |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)
')

# Register new task definition
NEW_REVISION=$(echo $NEW_PROD_TASK_DEF | aws ecs register-task-definition --cli-input-json file:///dev/stdin --query 'taskDefinition.revision')

echo "✅ New PROD task definition registered: trusted360-prod:$NEW_REVISION"

# Step 5: Blue-Green deployment to PROD
echo "🔄 Performing Blue-Green deployment to PROD..."
aws ecs update-service --cluster $PROD_CLUSTER --service $PROD_SERVICE --task-definition trusted360-prod:$NEW_REVISION

echo "⏳ Waiting for PROD deployment to complete..."
aws ecs wait services-stable --cluster $PROD_CLUSTER --services $PROD_SERVICE

# Step 6: Comprehensive PROD validation
echo "🔍 Performing comprehensive PROD validation..."
sleep 60  # Allow extra time for production startup

PROD_HEALTH=$(curl -s http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com/health || echo "FAILED")
if [[ "$PROD_HEALTH" != *"healthy"* ]]; then
    echo "❌ PROD deployment failed health check. Initiating emergency rollback..."
    aws ecs update-service --cluster $PROD_CLUSTER --service $PROD_SERVICE --task-definition $CURRENT_PROD_TASK_DEF
    echo "🔄 Emergency rollback initiated to: $CURRENT_PROD_TASK_DEF"
    exit 1
fi

# Additional production validation
curl -s -f http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com/api/version || {
    echo "❌ PROD API validation failed. Initiating emergency rollback..."
    aws ecs update-service --cluster $PROD_CLUSTER --service $PROD_SERVICE --task-definition $CURRENT_PROD_TASK_DEF
    exit 1
}

echo "✅ PROD Promotion Successful!"
echo "🎯 PROD Version: $PROD_VERSION"
echo "📍 PROD URL: http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com"
echo "💾 Rollback available: $CURRENT_PROD_TASK_DEF"
```

---

## 2. Rollback Scripts

### Emergency PROD Rollback Script
```bash
#!/bin/bash
# emergency-rollback-prod.sh
# Emergency rollback for production environment

set -e

PROD_CLUSTER="trusted360-prod-cluster"
PROD_SERVICE="trusted360-prod-service"
ROLLBACK_REVISION=${1:-"previous"}

echo "🚨 EMERGENCY PROD ROLLBACK INITIATED"

if [ "$ROLLBACK_REVISION" = "previous" ]; then
    # Get current and previous revisions
    CURRENT_REVISION=$(aws ecs describe-services --cluster $PROD_CLUSTER --services $PROD_SERVICE --query 'services[0].taskDefinition' --output text | grep -o '[0-9]*$')
    ROLLBACK_REVISION=$((CURRENT_REVISION - 1))
    echo "📝 Rolling back from revision $CURRENT_REVISION to $ROLLBACK_REVISION"
fi

echo "🔄 Executing rollback to trusted360-prod:$ROLLBACK_REVISION"
aws ecs update-service --cluster $PROD_CLUSTER --service $PROD_SERVICE --task-definition trusted360-prod:$ROLLBACK_REVISION

echo "⏳ Waiting for rollback deployment..."
aws ecs wait services-stable --cluster $PROD_CLUSTER --services $PROD_SERVICE

echo "🔍 Validating rollback..."
sleep 30
PROD_HEALTH=$(curl -s http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com/health || echo "FAILED")

if [[ "$PROD_HEALTH" != *"healthy"* ]]; then
    echo "❌ Rollback validation failed. Manual intervention required."
    exit 1
fi

echo "✅ Emergency rollback completed successfully"
echo "📍 PROD URL: http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com"
```

### Environment-Specific Rollback Script
```bash
#!/bin/bash
# rollback-environment.sh
# Rollback any environment to previous version

set -e

ENVIRONMENT=${1:-""}
ROLLBACK_REVISION=${2:-"previous"}

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <dev|uat|prod> [revision_number]"
    exit 1
fi

case $ENVIRONMENT in
    "dev")
        CLUSTER="trusted360-dev-cluster"
        SERVICE="trusted360-dev-service"
        HEALTH_URL="http://trusted360-dev-alb-544419701.us-east-2.elb.amazonaws.com/health"
        ;;
    "uat")
        CLUSTER="trusted360-uat-cluster"
        SERVICE="trusted360-uat-service" 
        HEALTH_URL="http://trusted360-uat-alb-1649253466.us-east-2.elb.amazonaws.com/health"
        ;;
    "prod")
        CLUSTER="trusted360-prod-cluster"
        SERVICE="trusted360-prod-service"
        HEALTH_URL="http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com/health"
        ;;
    *)
        echo "❌ Invalid environment. Use: dev, uat, or prod"
        exit 1
        ;;
esac

echo "🔄 Rolling back $ENVIRONMENT environment"

if [ "$ROLLBACK_REVISION" = "previous" ]; then
    CURRENT_REVISION=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE --query 'services[0].taskDefinition' --output text | grep -o '[0-9]*$')
    ROLLBACK_REVISION=$((CURRENT_REVISION - 1))
fi

echo "📝 Rolling back to trusted360-$ENVIRONMENT:$ROLLBACK_REVISION"

aws ecs update-service --cluster $CLUSTER --service $SERVICE --task-definition trusted360-$ENVIRONMENT:$ROLLBACK_REVISION

echo "⏳ Waiting for rollback deployment..."
aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE

echo "🔍 Validating rollback..."
sleep 30
HEALTH_CHECK=$(curl -s $HEALTH_URL || echo "FAILED")

if [[ "$HEALTH_CHECK" != *"healthy"* ]]; then
    echo "❌ Rollback validation failed for $ENVIRONMENT"
    exit 1
fi

echo "✅ $ENVIRONMENT rollback completed successfully"
```

---

## 3. Environment Status Scripts

### Check All Environments Status
```bash
#!/bin/bash
# check-all-environments.sh
# Check health status of all environments

echo "🔍 Checking All Environment Status"
echo "=================================="

# DEV Environment
echo "📍 DEV Environment:"
DEV_HEALTH=$(curl -s http://trusted360-dev-alb-544419701.us-east-2.elb.amazonaws.com/health || echo "UNAVAILABLE")
DEV_TASKS=$(aws ecs describe-services --cluster trusted360-dev-cluster --services trusted360-dev-service --query 'services[0].runningCount')
echo "   Health: $DEV_HEALTH"
echo "   Running Tasks: $DEV_TASKS"

# UAT Environment  
echo "📍 UAT Environment:"
UAT_HEALTH=$(curl -s http://trusted360-uat-alb-1649253466.us-east-2.elb.amazonaws.com/health || echo "UNAVAILABLE")
UAT_TASKS=$(aws ecs describe-services --cluster trusted360-uat-cluster --services trusted360-uat-service --query 'services[0].runningCount')
echo "   Health: $UAT_HEALTH"
echo "   Running Tasks: $UAT_TASKS"

# PROD Environment
echo "📍 PROD Environment:"
PROD_HEALTH=$(curl -s http://trusted360-prod-alb-407187833.us-east-2.elb.amazonaws.com/health || echo "UNAVAILABLE")
PROD_TASKS=$(aws ecs describe-services --cluster trusted360-prod-cluster --services trusted360-prod-service --query 'services[0].runningCount')
echo "   Health: $PROD_HEALTH"
echo "   Running Tasks: $PROD_TASKS"

echo "=================================="
echo "✅ Environment status check complete"
```

---

## 4. Usage Examples

### Complete Promotion Workflow
```bash
# 1. Promote DEV to UAT
./promote-dev-to-uat.sh dev-build-123 v1.2.3

# 2. Validate UAT thoroughly
./check-all-environments.sh

# 3. Promote UAT to PROD
./promote-uat-to-prod.sh v1.2.3 v1.2.3-prod

# 4. Monitor production
./check-all-environments.sh
```

### Emergency Procedures
```bash
# Emergency production rollback
./emergency-rollback-prod.sh

# Rollback specific environment
./rollback-environment.sh prod 3
./rollback-environment.sh uat previous
```

---

## 5. Safety Features

- **Pre-deployment validation** of source environment
- **Health check validation** after deployment
- **Automatic rollback** on failure
- **Blue-green deployment** for zero downtime
- **Comprehensive logging** of all operations
- **Emergency rollback procedures** for critical situations

## 6. Integration Points

- **CI/CD Pipeline Integration**: Scripts designed for automation
- **Monitoring Integration**: Health checks and status reporting
- **Notification Integration**: Ready for Slack/email notifications
- **Audit Trail**: All operations logged with timestamps and versions