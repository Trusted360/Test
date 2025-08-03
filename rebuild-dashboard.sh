#!/bin/bash

# Exit on any error
set -e

echo "Building updated dashboard image with nginx fixes..."

# Navigate to the dashboard directory
cd src/dashboard

# Build the dashboard image with a new version tag
docker build -t trusted360:dashboard-dev-v50 .

# Tag for ECR
docker tag trusted360:dashboard-dev-v50 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-dev-v50

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 119268833526.dkr.ecr.us-east-2.amazonaws.com

# Push the new dashboard image
echo "Pushing dashboard image to ECR..."
docker push 119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-dev-v50

echo "Dashboard image successfully built and pushed!"
echo ""
echo "Next steps:"
echo "1. Update your task definition to use the new dashboard image tag: dashboard-dev-v50"
echo "2. Register the updated task definition"
echo "3. Update the ECS service"