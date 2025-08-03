# Database Configuration Templates for Multi-Environment Setup

## Environment-Specific Database Parameters

### DEV Environment Database
```bash
# Aurora PostgreSQL Cluster Configuration
CLUSTER_NAME="trusted360-dev-aurora"
DB_ENGINE="aurora-postgresql"
DB_ENGINE_VERSION="15.4"
DB_INSTANCE_CLASS="db.t4g.medium"
DB_USERNAME="trusted360"
DB_PASSWORD="dev-secure-password-123"
DB_NAME="postgres"
VPC_SECURITY_GROUP_IDS="sg-dev-database"
DB_SUBNET_GROUP_NAME="trusted360-dev-subnet-group"
BACKUP_RETENTION_PERIOD=7
PREFERRED_BACKUP_WINDOW="03:00-04:00"
PREFERRED_MAINTENANCE_WINDOW="sun:04:00-sun:05:00"
DELETION_PROTECTION=false
STORAGE_ENCRYPTED=true
```

### UAT Environment Database
```bash
# Aurora PostgreSQL Cluster Configuration  
CLUSTER_NAME="trusted360-uat-aurora"
DB_ENGINE="aurora-postgresql"
DB_ENGINE_VERSION="15.4"
DB_INSTANCE_CLASS="db.t4g.large"
DB_USERNAME="trusted360"
DB_PASSWORD="uat-secure-password-456"
DB_NAME="postgres"
VPC_SECURITY_GROUP_IDS="sg-uat-database"
DB_SUBNET_GROUP_NAME="trusted360-uat-subnet-group"
BACKUP_RETENTION_PERIOD=14
PREFERRED_BACKUP_WINDOW="03:00-04:00"
PREFERRED_MAINTENANCE_WINDOW="sun:04:00-sun:05:00"
DELETION_PROTECTION=true
STORAGE_ENCRYPTED=true
```

### PROD Environment Database
```bash
# Aurora PostgreSQL Cluster Configuration
CLUSTER_NAME="trusted360-prod-aurora"
DB_ENGINE="aurora-postgresql"
DB_ENGINE_VERSION="15.4"
DB_INSTANCE_CLASS="db.r6g.large"
DB_USERNAME="trusted360"
DB_PASSWORD="prod-secure-password-789"
DB_NAME="postgres"
VPC_SECURITY_GROUP_IDS="sg-prod-database"
DB_SUBNET_GROUP_NAME="trusted360-prod-subnet-group"
BACKUP_RETENTION_PERIOD=30
PREFERRED_BACKUP_WINDOW="03:00-04:00"
PREFERRED_MAINTENANCE_WINDOW="sun:04:00-sun:05:00"
DELETION_PROTECTION=true
STORAGE_ENCRYPTED=true
PERFORMANCE_INSIGHTS_ENABLED=true
```

## Database Creation Scripts

### Create DEV Database
```bash
#!/bin/bash
aws rds create-db-cluster \
    --db-cluster-identifier trusted360-dev-aurora \
    --engine aurora-postgresql \
    --engine-version 15.4 \
    --master-username trusted360 \
    --master-user-password dev-secure-password-123 \
    --database-name postgres \
    --vpc-security-group-ids sg-dev-database \
    --db-subnet-group-name trusted360-dev-subnet-group \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --storage-encrypted \
    --no-deletion-protection

aws rds create-db-instance \
    --db-instance-identifier trusted360-dev-aurora-1 \
    --db-instance-class db.t4g.medium \
    --engine aurora-postgresql \
    --db-cluster-identifier trusted360-dev-aurora
```

### Create UAT Database
```bash
#!/bin/bash
aws rds create-db-cluster \
    --db-cluster-identifier trusted360-uat-aurora \
    --engine aurora-postgresql \
    --engine-version 15.4 \
    --master-username trusted360 \
    --master-user-password uat-secure-password-456 \
    --database-name postgres \
    --vpc-security-group-ids sg-uat-database \
    --db-subnet-group-name trusted360-uat-subnet-group \
    --backup-retention-period 14 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --storage-encrypted \
    --deletion-protection

aws rds create-db-instance \
    --db-instance-identifier trusted360-uat-aurora-1 \
    --db-instance-class db.t4g.large \
    --engine aurora-postgresql \
    --db-cluster-identifier trusted360-uat-aurora
```

### Create PROD Database
```bash
#!/bin/bash
aws rds create-db-cluster \
    --db-cluster-identifier trusted360-prod-aurora \
    --engine aurora-postgresql \
    --engine-version 15.4 \
    --master-username trusted360 \
    --master-user-password prod-secure-password-789 \
    --database-name postgres \
    --vpc-security-group-ids sg-prod-database \
    --db-subnet-group-name trusted360-prod-subnet-group \
    --backup-retention-period 30 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --storage-encrypted \
    --deletion-protection \
    --enable-performance-insights

aws rds create-db-instance \
    --db-instance-identifier trusted360-prod-aurora-1 \
    --db-instance-class db.r6g.large \
    --engine aurora-postgresql \
    --db-cluster-identifier trusted360-prod-aurora

# Create read replica for production
aws rds create-db-instance \
    --db-instance-identifier trusted360-prod-aurora-2 \
    --db-instance-class db.r6g.large \
    --engine aurora-postgresql \
    --db-cluster-identifier trusted360-prod-aurora
```

## Database Migration Strategy

### Data Seeding for Environments
- **DEV**: Allow all migrations, seed with test data
- **UAT**: Clone from DEV with production-like data volumes
- **PROD**: Clone from current production database

### Connection String Templates
```bash
# DEV
DATABASE_URL="postgresql://trusted360:dev-secure-password-123@trusted360-dev-aurora.cluster-XXXXX.us-east-2.rds.amazonaws.com:5432/postgres"

# UAT  
DATABASE_URL="postgresql://trusted360:uat-secure-password-456@trusted360-uat-aurora.cluster-XXXXX.us-east-2.rds.amazonaws.com:5432/postgres"

# PROD
DATABASE_URL="postgresql://trusted360:prod-secure-password-789@trusted360-prod-aurora.cluster-XXXXX.us-east-2.rds.amazonaws.com:5432/postgres"
```

## Security Considerations
- Each environment uses separate database passwords
- Production has enhanced backup retention (30 days)
- Production enables Performance Insights for monitoring
- All environments use encryption at rest
- Read replicas for production performance and availability