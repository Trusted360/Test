# Required AWS Permissions for Multi-Environment Setup

## Current User: arn:aws:iam::119268833526:user/ecr-docker-user

## Successfully Working Permissions:
✅ **ECS Permissions**:
- ecs:ListClusters
- ecs:DescribeClusters 
- ecs:ListServices
- ecs:DescribeServices
- ecs:DescribeTaskDefinition

## Additional Permissions Needed:

### RDS Permissions (for database cloning):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds:DescribeDBClusters",
                "rds:DescribeDBInstances",
                "rds:DescribeDBClusterParameterGroups",
                "rds:DescribeDBParameters",
                "rds:CreateDBCluster",
                "rds:CreateDBInstance",
                "rds:RestoreDBClusterFromSnapshot"
            ],
            "Resource": "*"
        }
    ]
}
```

### Load Balancer Permissions:
```json
{
    "Version": "2012-10-17", 
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:DescribeLoadBalancers",
                "elasticloadbalancing:DescribeTargetGroups",
                "elasticloadbalancing:DescribeListeners",
                "elasticloadbalancing:CreateLoadBalancer",
                "elasticloadbalancing:CreateTargetGroup",
                "elasticloadbalancing:CreateListener"
            ],
            "Resource": "*"
        }
    ]
}
```

### VPC/Networking Permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow", 
            "Action": [
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeRouteTables",
                "ec2:CreateSecurityGroup",
                "ec2:AuthorizeSecurityGroupIngress"
            ],
            "Resource": "*"
        }
    ]
}
```

### ECR Permissions (for image management):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:DescribeRepositories",
                "ecr:ListImages",
                "ecr:BatchGetImage",
                "ecr:GetDownloadUrlForLayer",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload"
            ],
            "Resource": "arn:aws:ecr:us-east-2:119268833526:repository/trusted360"
        }
    ]
}
```

## Priority Order:
1. **VPC/Networking** - Essential for infrastructure discovery
2. **Load Balancer** - Needed for ALB configuration export  
3. **RDS** - Required for database cloning
4. **ECR** - For complete image management

## Instructions:
Please apply these permissions to the `ecr-docker-user` as we encounter the access denials.