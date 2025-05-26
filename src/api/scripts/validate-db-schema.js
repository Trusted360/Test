#!/usr/bin/env node

/**
 * Database schema validation script
 * 
 * This script checks all models against the actual database schema
 * to identify mismatches and inconsistencies.
 */

const path = require('path');
const fs = require('fs');
const knex = require('knex');
const config = require('../src/config');
const logger = require('../src/utils/logger');
const colors = require('colors/safe');

// Setup database connection
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: config.database.host || 'postgres',
    port: config.database.port || 5432,
    user: config.database.user || 'simmer',
    password: config.database.password || 'simmer_password',
    database: config.database.database || 'simmer'
  }
});

// Track results
const results = {
  missingTables: [],
  duplicateTables: [],
  columnMismatches: {},
  pluralizationIssues: []
};

// Get all model files
async function getModelFiles() {
  const modelsDir = path.join(__dirname, '../src/models');
  const files = fs.readdirSync(modelsDir)
    .filter(file => file.endsWith('.model.js') && file !== 'index.js');
  
  return files.map(file => path.join(modelsDir, file));
}

// Extract table name from model file
async function getTableNameFromModel(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const tableNameMatches = content.match(/this\.tableName\s*=\s*['"]([^'"]+)['"]/);
    
    if (tableNameMatches && tableNameMatches[1]) {
      return tableNameMatches[1];
    }
    
    // Try to infer from filename
    const fileName = path.basename(filePath, '.model.js');
    if (fileName === 'user-activity') {
      return 'user_activities'; // Special case we fixed
    }
    
    // Convert camelCase to snake_case and pluralize
    const snakeCase = fileName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    return snakeCase + 's'; // Simple pluralization
  } catch (error) {
    logger.error(`Error analyzing model file ${filePath}: ${error.message}`);
    return null;
  }
}

// Check if table exists in database
async function checkTableExists(tableName) {
  try {
    const result = await db.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ?
      )`, [tableName]);
    
    return result.rows[0].exists;
  } catch (error) {
    logger.error(`Error checking if table ${tableName} exists: ${error.message}`);
    return false;
  }
}

// Get table columns from database
async function getTableColumns(tableName) {
  try {
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ?
      ORDER BY ordinal_position`, [tableName]);
    
    return columns.rows;
  } catch (error) {
    logger.error(`Error getting columns for table ${tableName}: ${error.message}`);
    return [];
  }
}

// Check if singular version of table exists
async function checkSingularExists(tableName) {
  // Simple depluralization logic
  const singularName = tableName.endsWith('ies') 
    ? tableName.replace(/ies$/, 'y')
    : tableName.endsWith('s') 
      ? tableName.slice(0, -1) 
      : tableName;
  
  if (singularName === tableName) return false;
  
  const exists = await checkTableExists(singularName);
  return exists ? singularName : false;
}

// Extract expected columns from model (rough heuristic)
async function getModelColumns(filePath, tableName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for common patterns where columns are referenced
    // This is a heuristic and may not catch everything
    const columnPatterns = [
      // Insert/update operations
      new RegExp(`${tableName}\\)\\s*\\.insert\\(\\{([^}]+)\\}`, 'g'),
      new RegExp(`${tableName}\\)\\s*\\.update\\(\\{([^}]+)\\}`, 'g'),
      // Object definitions with properties matching DB columns
      new RegExp(`const [a-zA-Z]+ = {([^}]+)}`, 'g'),
      // Direct references
      new RegExp(`${tableName}\\.([a-zA-Z_]+)`, 'g')
    ];
    
    const columns = new Set();
    
    // Apply each pattern
    for (const pattern of columnPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const properties = match[1].split(',');
          for (const prop of properties) {
            const keyValue = prop.split(':');
            if (keyValue.length > 0) {
              const key = keyValue[0].trim().replace(/['"]/g, '');
              if (key && !key.includes('(') && !key.includes(')')) {
                columns.add(key);
              }
            }
          }
        }
      }
    }
    
    return Array.from(columns);
  } catch (error) {
    logger.error(`Error extracting columns from model file ${filePath}: ${error.message}`);
    return [];
  }
}

// Main validation function
async function validateDatabaseSchema() {
  console.log(colors.cyan('\n=== Database Schema Validation ===\n'));
  
  const modelFiles = await getModelFiles();
  console.log(colors.white(`Found ${modelFiles.length} model files to check`));
  
  // Keep track of tables we've seen to check for duplicates
  const seenTables = {};
  
  for (const filePath of modelFiles) {
    const modelName = path.basename(filePath, '.model.js');
    process.stdout.write(colors.white(`Checking model ${modelName}... `));
    
    const tableName = await getTableNameFromModel(filePath);
    
    if (!tableName) {
      console.log(colors.yellow(`Could not determine table name`));
      continue;
    }
    
    // Check for duplicates
    if (seenTables[tableName]) {
      console.log(colors.red(`DUPLICATE - ${seenTables[tableName]} is also using ${tableName}`));
      results.duplicateTables.push({
        table: tableName,
        models: [seenTables[tableName], modelName]
      });
      continue;
    }
    
    seenTables[tableName] = modelName;
    
    // Check if table exists
    const tableExists = await checkTableExists(tableName);
    
    if (!tableExists) {
      console.log(colors.red(`MISSING - Table ${tableName} not found in database`));
      results.missingTables.push(tableName);
      
      // Check if a singular version exists
      const singularExists = await checkSingularExists(tableName);
      if (singularExists) {
        console.log(colors.yellow(`  Possible match found: ${singularExists} (singular form)`));
        results.pluralizationIssues.push({
          modelTableName: tableName,
          actualTableName: singularExists,
          model: modelName
        });
      }
      
      continue;
    }
    
    // Table exists, now check columns
    const dbColumns = await getTableColumns(tableName);
    const modelColumns = await getModelColumns(filePath, tableName);
    
    const dbColumnNames = dbColumns.map(col => col.column_name);
    const missingColumns = modelColumns.filter(col => !dbColumnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(colors.yellow(`MISMATCH - Missing ${missingColumns.length} columns`));
      results.columnMismatches[tableName] = {
        model: modelName,
        missingColumns
      };
    } else {
      console.log(colors.green(`OK - Table exists with all expected columns`));
    }
  }
  
  // Print summary
  console.log(colors.cyan('\n=== Validation Summary ===\n'));
  
  if (results.missingTables.length > 0) {
    console.log(colors.red(`Missing Tables (${results.missingTables.length}):`));
    results.missingTables.forEach(table => {
      console.log(`  - ${table}`);
    });
    console.log('');
  }
  
  if (results.duplicateTables.length > 0) {
    console.log(colors.red(`Duplicate Tables (${results.duplicateTables.length}):`));
    results.duplicateTables.forEach(({ table, models }) => {
      console.log(`  - ${table} used by: ${models.join(', ')}`);
    });
    console.log('');
  }
  
  if (Object.keys(results.columnMismatches).length > 0) {
    console.log(colors.yellow(`Column Mismatches (${Object.keys(results.columnMismatches).length} tables):`));
    Object.entries(results.columnMismatches).forEach(([table, { model, missingColumns }]) => {
      console.log(`  - ${table} (${model}):`);
      missingColumns.forEach(col => {
        console.log(`    - Missing column: ${col}`);
      });
    });
    console.log('');
  }
  
  if (results.pluralizationIssues.length > 0) {
    console.log(colors.yellow(`Pluralization Issues (${results.pluralizationIssues.length}):`));
    results.pluralizationIssues.forEach(({ modelTableName, actualTableName, model }) => {
      console.log(`  - Model ${model} expects '${modelTableName}' but found '${actualTableName}'`);
    });
    console.log('');
  }
  
  if (
    results.missingTables.length === 0 && 
    results.duplicateTables.length === 0 && 
    Object.keys(results.columnMismatches).length === 0 &&
    results.pluralizationIssues.length === 0
  ) {
    console.log(colors.green('All models match their database tables. No issues found.'));
  } else {
    console.log(colors.yellow('Recommendation: Standardize on Knex migrations and update models to match database schema.'));
  }
}

// Run the validation
validateDatabaseSchema()
  .then(() => {
    console.log(colors.cyan('\nDatabase validation complete.\n'));
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Validation failed: ${error.message}`);
    process.exit(1);
  }); 