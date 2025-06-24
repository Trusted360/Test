# Database Migration Audit Report

## 🚨 Critical Issues Found

### 1. Multiple Conflicting Migration Systems

The project has **THREE different migration systems** that conflict with each other:

1. **Knex Migrations** (`src/api/migrations/`)
   - JavaScript-based migrations
   - Expects UUID primary keys
   - Uses `password_hash` column
   - Total: 50+ migration files

2. **SQL Migrations** (`database/migrations/`)
   - Raw SQL files
   - Mixed UUID expectations
   - Different schema structure
   - Total: 11 SQL files

3. **Manual Baseline Setup**
   - Created the actual current schema
   - Uses integer auto-increment IDs
   - Uses `password` column (not `password_hash`)
   - This is what's actually running

### 2. Schema Mismatches

#### Users Table
| Column | Current DB | Knex Migration | SQL Migration |
|--------|------------|----------------|---------------|
| id | INTEGER (auto) | UUID | UUID |
| password field | password | password_hash | password |
| tenant_id | VARCHAR(50) ✓ | VARCHAR ✓ | UUID |
| Additional fields | Basic only | 15+ extra fields | Different set |

### 3. Migration Execution Status

**Currently Run Migrations (Poor Design):**
```sql
-- These 3 migrations were poorly designed - should have been ONE migration:
1. 20250531000000_create_basic_auth_tables.js     -- Created tables WITHOUT tenant_id
2. 20250531000001_add_tenant_id_to_tables.js      -- Added tenant_id to users
3. 20250531000002_add_tenant_id_to_auth_tables.js -- Added tenant_id to other tables
```

**This was bad design because:**
- Tables should be created with ALL required columns from the start
- Multiple migrations for what should be atomic changes
- Inefficient and confusing

**The Proper Approach (Created as fix):**
```javascript
// 20250531000000_create_auth_tables_complete.js
// ONE migration that creates all tables properly with tenant_id from the start
```

### 4. Unrelated Migrations

Found 20+ migrations for a food/recipe management system:
- meal_feedback_table
- food_preferences_table
- recipe_ingredients_table
- shopping_lists_table
- pantry_items_table
- meal_plans, recipes, ingredients, etc.

**These don't belong in a security monitoring platform!**

## 🔍 Root Cause Analysis

1. **Project was likely forked or copied** from another project (possibly a meal planning app)
2. **Baseline setup script created a different schema** than what migrations expect
3. **No migration cleanup** was done after the fork/copy
4. **Multiple developers** may have added conflicting migration approaches
5. **Poor migration design** when fixing issues (multiple migrations for single feature)

## ✅ Recommended Solution

### Step 1: Document Current State
Created `20240101000000_baseline_trusted360.js` that documents the actual current schema.

### Step 2: Replace Poor Migrations

**Remove these poorly designed migrations:**
```bash
20250531000000_create_basic_auth_tables.js
20250531000001_add_tenant_id_to_tables.js
20250531000002_add_tenant_id_to_auth_tables.js
```

**Replace with single proper migration:**
```bash
20250531000000_create_auth_tables_complete.js  # Creates all tables correctly
```

### Step 3: Clean Up Legacy Migrations

**Archive/Remove these:**
```bash
# Move to an archive folder
mkdir src/api/migrations/archived
mv src/api/migrations/20240507*.js src/api/migrations/archived/
mv src/api/migrations/20250508*.js src/api/migrations/archived/  # Food system
mv src/api/migrations/20250523*.js src/api/migrations/archived/  # Duplicates
```

### Step 4: Migration Best Practices Going Forward

1. **Design tables completely** before creating migrations
2. **Include all columns** in initial table creation
3. **One migration per feature**, not multiple for same tables
4. **Test migrations** in a fresh database before committing

Example of proper migration:
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('new_table', (table) => {
    // ALL columns defined at once
    table.increments('id').primary();
    table.string('tenant_id', 50).notNullable().defaultTo('default');
    table.integer('user_id').references('id').inTable('users');
    // ... all other columns ...
    
    // ALL indexes defined at once
    table.index(['user_id', 'tenant_id']);
  });
};
```

## 🎯 Action Items

1. **Immediate:** 
   - Use the consolidated migration going forward
   - Archive the three separate migrations
   - Document this as a lesson learned

2. **Short-term:**
   - Review and remove food/recipe system code
   - Create proper Trusted360 security-focused migrations
   - Establish migration standards

3. **Long-term:**
   - Implement migration testing pipeline
   - Create migration templates
   - Document schema design decisions

## ✅ Current Status

The system is working, but the migration approach was flawed. The consolidated migration (`20250531000000_create_auth_tables_complete.js`) shows the proper way to handle this - creating tables with all required columns from the start, not adding them piecemeal.

**Lesson Learned:** Always design your tables completely before writing migrations. Adding columns immediately after creating tables is a sign of poor planning. 