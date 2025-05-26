# Database Schema Tools

This directory contains tools to help validate and consolidate your database schema.

## Prerequisites

Before running these scripts, make sure you have the required dependencies installed:

```bash
cd /app  # Inside the Docker container
npm install colors
```

## Validate Database Schema

The `validate-db-schema.js` script analyzes your model files and compares them with the actual database schema to identify issues:

```bash
# Make the script executable if needed
chmod +x scripts/validate-db-schema.js

# Run the script
./scripts/validate-db-schema.js
```

This will output a report showing:
- Missing tables (tables referenced in models but not in the database)
- Duplicate tables (multiple models referencing the same table)
- Column mismatches (models using columns that don't exist in the database)
- Pluralization issues (models using plural names when singular exists or vice versa)

## Generate Knex Migrations

The `generate-migrations.js` script creates Knex migration files from your existing database schema:

```bash
# Make the script executable if needed
chmod +x scripts/generate-migrations.js

# Run the script
./scripts/generate-migrations.js
```

This will:
1. Connect to your database
2. Extract the schema for all tables
3. Generate properly formatted Knex migration files in the `/app/migrations` directory

**Important:** 
- Review the generated migration files before running them
- You may need to manually adjust the file timestamps to ensure migrations run in the correct order
- These migrations represent your *current* schema, not incremental changes

## Standardizing on Knex Migrations

To standardize on Knex migrations and resolve schema inconsistencies:

1. Run `validate-db-schema.js` to identify issues
2. Decide whether to update your model files or your database schema
3. If updating the database schema, run `generate-migrations.js` to create new migrations
4. Review and modify the generated migrations as needed
5. Update your models to match the actual database schema
6. For future schema changes, create new Knex migrations instead of using SQL scripts

## Running Migrations

To apply Knex migrations:

```bash
npx knex migrate:latest
```

To roll back the most recent migration:

```bash
npx knex migrate:rollback
```

To see migration status:

```bash
npx knex migrate:status
``` 