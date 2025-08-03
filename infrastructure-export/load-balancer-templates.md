# Load Balancer Configuration Templates for Multi-Environment Setup

## Environment-Specific Load Balancer Parameters

### DEV Environment Load Balancer
```bash
# Application Load Balancer Configuration
ALB_NAME="trusted360-dev-alb"
ALB_SCHEME="internet-facing"
ALB_TYPE="application"
ALB_IP_ADDRESS_TYPE="ipv4"
SUBNETS="subnet-080ec5ff039084016,subnet-0e1a2f79a6109df55,subnet-0af19ebfd1221899f"
SECURITY_GROUPS="sg-dev-alb"

# Target Group Configuration
TARGET_GROUP_NAME="trusted360-dev-targets"
TARGET_GROUP_PROTOCOL="HTTP"
TARGET_GROUP_PORT=80
TARGET_GROUP_TARGET_TYPE="ip"
VPC_ID="vpc-XXXXX"
HEALTH_CHECK_PATH="/health"
HEALTH_CHECK_PROTOCOL="HTTP"
HEALTH_CHECK_PORT="traffic-port"
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=5
HEALTHY_THRESHOLD=2
UNHEALTHY_THRESHOLD=5
```

### UAT Environment Load Balancer
```bash
# Application Load Balancer Configuration
ALB_NAME="trusted360-uat-alb"
ALB_SCHEME="internet-facing"
ALB_TYPE="application"
ALB_IP_ADDRESS_TYPE="ipv4"
SUBNETS="subnet-080ec5ff039084016,subnet-0e1a2f79a6109df55,subnet-0af19ebfd1221899f"
SECURITY_GROUPS="sg-uat-alb"

# Target Group Configuration
TARGET_GROUP_NAME="trusted360-uat-targets"
TARGET_GROUP_PROTOCOL="HTTP"
TARGET_GROUP_PORT=80
TARGET_GROUP_TARGET_TYPE="ip"
VPC_ID="vpc-XXXXX"
HEALTH_CHECK_PATH="/health"
HEALTH_CHECK_PROTOCOL="HTTP"
HEALTH_CHECK_PORT="traffic-port"
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=5
HEALTHY_THRESHOLD=2
UNHEALTHY_THRESHOLD=3
```

### PROD Environment Load Balancer
```bash
# Application Load Balancer Configuration
ALB_NAME="trusted360-prod-alb"
ALB_SCHEME="internet-facing"
ALB_TYPE="application"
ALB_IP_ADDRESS_TYPE="ipv4"
SUBNETS="subnet-080ec5ff039084016,subnet-0e1a2f79a6109df55,subnet-0af19ebfd1221899f"
SECURITY_GROUPS="sg-prod-alb"

# Target Group Configuration
TARGET_GROUP_NAME="trusted360-prod-targets"
TARGET_GROUP_PROTOCOL="HTTP"
TARGET_GROUP_PORT=80
TARGET_GROUP_TARGET_TYPE="ip"
VPC_ID="vpc-XXXXX"
HEALTH_CHECK_PATH="/health"
HEALTH_CHECK_PROTOCOL="HTTP"
HEALTH_CHECK_PORT="traffic-port"
HEALTH_CHECK_INTERVAL=15
HEALTH_CHECK_TIMEOUT=5
HEALTHY_THRESHOLD=2
UNHEALTHY_THRESHOLD=2
```

## Load Balancer Creation Scripts

### Create DEV Load Balancer
```bash
#!/bin/bash
# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name trusted360-dev-alb \
    --subnets subnet-080ec5ff039084016 subnet-0e1a2f79a6109df55 subnet-0af19ebfd1221899f \
    --security-groups sg-dev-alb \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create Target Group
TG_ARN=$(aws elbv2 create-target-group \
    --name trusted360-dev-targets \
    --protocol HTTP \
    --port 80 \
    --vpc-id vpc-XXXXX \
    --target-type ip \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 5 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create Listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo "DEV Load Balancer ARN: $ALB_ARN"
echo "DEV Target Group ARN: $TG_ARN"
```

### Create UAT Load Balancer
```bash
#!/bin/bash
# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name trusted360-uat-alb \
    --subnets subnet-080ec5ff039084016 subnet-0e1a2f79a6109df55 subnet-0af19ebfd1221899f \
    --security-groups sg-uat-alb \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create Target Group
TG_ARN=$(aws elbv2 create-target-group \
    --name trusted360-uat-targets \
    --protocol HTTP \
    --port 80 \
    --vpc-id vpc-XXXXX \
    --target-type ip \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create Listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo "UAT Load Balancer ARN: $ALB_ARN"
echo "UAT Target Group ARN: $TG_ARN"
```

### Create PROD Load Balancer
```bash
#!/bin/bash
# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name trusted360-prod-alb \
    --subnets subnet-080ec5ff039084016 subnet-0e1a2f79a6109df55 subnet-0af19ebfd1221899f \
    --security-groups sg-prod-alb \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create Target Group
TG_ARN=$(aws elbv2 create-target-group \
    --name trusted360-prod-targets \
    --protocol HTTP \
    --port 80 \
    --vpc-id vpc-XXXXX \
    --target-type ip \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 15 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 2 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create Listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo "PROD Load Balancer ARN: $ALB_ARN"  
echo "PROD Target Group ARN: $TG_ARN"
```

## Security Group Templates

### DEV ALB Security Group
```bash
# Create security group for DEV ALB
aws ec2 create-security-group \
    --group-name trusted360-dev-alb-sg \
    --description "Security group for Trusted360 DEV ALB" \
    --vpc-id vpc-XXXXX

# Allow HTTP traffic from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id sg-dev-alb \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Allow HTTPS traffic from anywhere  
aws ec2 authorize-security-group-ingress \
    --group-id sg-dev-alb \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

### UAT ALB Security Group
```bash
# Create security group for UAT ALB
aws ec2 create-security-group \
    --group-name trusted360-uat-alb-sg \
    --description "Security group for Trusted360 UAT ALB" \
    --vpc-id vpc-XXXXX

# Allow HTTP traffic from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id sg-uat-alb \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Allow HTTPS traffic from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id sg-uat-alb \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

### PROD ALB Security Group
```bash
# Create security group for PROD ALB
aws ec2 create-security-group \
    --group-name trusted360-prod-alb-sg \
    --description "Security group for Trusted360 PROD ALB" \
    --vpc-id vpc-XXXXX

# Allow HTTP traffic from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id sg-prod-alb \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Allow HTTPS traffic from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id sg-prod-alb \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

## Environment URLs
- **DEV**: `http://trusted360-dev-alb-XXXXX.us-east-2.elb.amazonaws.com`
- **UAT**: `http://trusted360-uat-alb-XXXXX.us-east-2.elb.amazonaws.com`  
- **PROD**: `http://trusted360-prod-alb-XXXXX.us-east-2.elb.amazonaws.com`

## SSL Certificate Configuration (Future Enhancement)
```bash
# Request SSL certificates for each environment
aws acm request-certificate \
    --domain-name dev.trusted360.com \
    --validation-method DNS

aws acm request-certificate \
    --domain-name uat.trusted360.com \
    --validation-method DNS

aws acm request-certificate \
    --domain-name trusted360.com \
    --validation-method DNS