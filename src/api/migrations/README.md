# Database Migrations in Trusted360

## Overview

This document explains the database migration system used in the Trusted360 project. Database migrations are scripts that help manage changes to your database schema over time, providing version control for your database.

## Migration System

Trusted360 uses **Knex.js** for database migrations. Knex.js is a SQL query builder that provides a structured way to evolve your database schema.

### Key Files

- `/src/api/migrations/` - Contains all database migration files
- `/src/api/knexfile.js` - Configuration for Knex migrations
- `/src/api/migrations/20240101000000_baseline_trusted360.js` - Baseline schema documentation
- `/src/api/migrations/20250531000000_create_auth_tables_complete.js` - Complete authentication tables

## How It Works

1. When the API container starts, it automatically runs any pending migrations
2. Migrations are run in order based on their timestamp prefix
3. Knex keeps track of which migrations have been run in a `knex_migrations` table
4. Each migration has an `up` function (to apply changes) and a `down` function (to revert changes)

## Running Migrations

Migrations run automatically when the API container starts. You can also run them manually:

```bash
# Run all pending migrations
docker exec trusted360-api npx knex migrate:latest

# Rollback the last batch of migrations
docker exec trusted360-api npx knex migrate:rollback

# Check migration status
docker exec trusted360-api npx knex migrate:status
```

## Creating New Migrations

To add a new database table or modify the schema:

```bash
# Create a new migration file
docker exec trusted360-api npx knex migrate:make migration_name
```

This creates a new file in `/src/api/migrations/` with timestamp prefix.

## Best Practices

1. **Always create tables with all required columns from the start**
   - Don't create a table and then immediately add columns in separate migrations
   - Include tenant_id and all necessary foreign keys in the initial creation

2. **Use integer IDs, not UUIDs**
   - The system uses auto-incrementing integer primary keys
   - This matches the existing authentication system

3. **One migration per feature**
   - Group related table changes into a single migration
   - Avoid creating multiple small migrations for the same feature

4. **Include proper indexes**
   - Add indexes for frequently queried columns
   - Always index foreign keys and tenant_id columns

5. **Test migrations**
   - Always test migrations on a fresh database before committing
   - Ensure both up and down migrations work correctly

## Example Migration

```javascript
exports.up = function(knex) {
  return knex.schema.createTable('facilities', (table) => {
    // PRIMARY KEY
    table.increments('id').primary();  // Integer primary key
    
    // REQUIRED COLUMNS
    table.string('name').notNullable();
    table.string('address');
    table.string('tenant_id', 50).notNullable().defaultTo('default');
    
    // FOREIGN KEYS
    table.integer('manager_id').references('id').inTable('users');
    
    // TIMESTAMPS
    table.timestamps(true, true);  // created_at, updated_at
    
    // INDEXES
    table.index(['tenant_id']);
    table.index(['manager_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('facilities');
};
```

## Troubleshooting

### Common Issues

1. **Migration conflicts**
   - If multiple developers create migrations with the same timestamp, rename one

2. **Failed migrations**
   - Check database connection
   - Verify table doesn't already exist
   - Look for syntax errors in migration files

3. **Rollback needed**
   - If a migration fails partway through, you may need to rollback

### Support

If you encounter issues with migrations, check:
- Docker container logs: `docker logs trusted360-api`
- Migration status: `docker exec trusted360-api npx knex migrate:status`
- Database tables: `docker exec trusted360-postgres psql -U trusted360 -d trusted360 -c "\dt"`