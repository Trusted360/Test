#!/usr/bin/env node

/**
 * Generate Knex migrations from existing database schema.
 * 
 * This script connects to the database, gets table schemas, and generates
 * Knex migration files for each table.
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

// Migration output directory
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Get all tables in the database
async function getAllTables() {
  try {
    const result = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    return result.rows.map(row => row.table_name);
  } catch (error) {
    logger.error(`Error getting tables: ${error.message}`);
    return [];
  }
}

// Get table schema
async function getTableSchema(tableName) {
  try {
    // Get columns
    const columns = await db.raw(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ?
      ORDER BY ordinal_position`, [tableName]);
    
    // Get primary key
    const primaryKey = await db.raw(`
      SELECT 
        kcu.column_name
      FROM 
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
      WHERE 
        tc.table_schema = 'public'
        AND tc.table_name = ?
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY 
        kcu.ordinal_position`, [tableName]);
    
    // Get foreign keys
    const foreignKeys = await db.raw(`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
      WHERE 
        tc.table_schema = 'public'
        AND tc.table_name = ?
        AND tc.constraint_type = 'FOREIGN KEY'`, [tableName]);
    
    // Get indexes
    const indexes = await db.raw(`
      SELECT
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        schemaname = 'public'
        AND tablename = ?`, [tableName]);
    
    return {
      columns: columns.rows,
      primaryKey: primaryKey.rows.map(row => row.column_name),
      foreignKeys: foreignKeys.rows,
      indexes: indexes.rows
    };
  } catch (error) {
    logger.error(`Error getting schema for table ${tableName}: ${error.message}`);
    return null;
  }
}

// Generate Knex column definition
function generateKnexColumnDefinition(column) {
  let columnDef = '';
  const colName = column.column_name;
  const dataType = column.data_type;
  
  // Map Postgres data types to Knex methods
  switch (dataType) {
    case 'integer':
    case 'bigint':
      columnDef = `table.integer('${colName}')`;
      break;
    case 'uuid':
      columnDef = `table.uuid('${colName}')`;
      break;
    case 'character varying':
      columnDef = `table.string('${colName}'${column.character_maximum_length ? `, ${column.character_maximum_length}` : ''})`;
      break;
    case 'text':
      columnDef = `table.text('${colName}')`;
      break;
    case 'boolean':
      columnDef = `table.boolean('${colName}')`;
      break;
    case 'timestamp with time zone':
    case 'timestamp without time zone':
      columnDef = `table.timestamp('${colName}', { useTz: ${dataType === 'timestamp with time zone'} })`;
      break;
    case 'date':
      columnDef = `table.date('${colName}')`;
      break;
    case 'time with time zone':
    case 'time without time zone':
      columnDef = `table.time('${colName}', { useTz: ${dataType === 'time with time zone'} })`;
      break;
    case 'double precision':
    case 'real':
      columnDef = `table.float('${colName}')`;
      break;
    case 'numeric':
    case 'decimal':
      columnDef = `table.decimal('${colName}')`;
      break;
    case 'jsonb':
      columnDef = `table.jsonb('${colName}')`;
      break;
    case 'json':
      columnDef = `table.json('${colName}')`;
      break;
    default:
      columnDef = `table.specificType('${colName}', '${dataType}')`;
  }
  
  // Add nullable constraint
  if (column.is_nullable === 'NO') {
    columnDef += '.notNullable()';
  }
  
  // Add default value if exists
  if (column.column_default !== null) {
    // Handle special defaults
    if (column.column_default === 'now()' || column.column_default.includes('CURRENT_TIMESTAMP')) {
      columnDef += ".defaultTo(knex.fn.now())";
    } else if (column.column_default === 'true') {
      columnDef += ".defaultTo(true)";
    } else if (column.column_default === 'false') {
      columnDef += ".defaultTo(false)";
    } else if (column.column_default.startsWith('nextval')) {
      // Skip sequence defaults, they're handled by .increments()
    } else {
      // Remove cast part from Postgres defaults
      let defaultValue = column.column_default;
      const castMatch = defaultValue.match(/'([^']*)'::[\w\s]+/);
      if (castMatch) {
        defaultValue = `'${castMatch[1]}'`;
      }
      
      columnDef += `.defaultTo(${defaultValue})`;
    }
  }
  
  return columnDef;
}

// Generate Knex migration file
function generateMigrationFile(tableName, schema) {
  // Format timestamp for filename
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  
  const fileName = `${timestamp}_create_${tableName}_table.js`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  
  // Generate migration content
  let content = `/**
 * Migration: Create ${tableName} table
 * Generated by simmer schema utility
 */
exports.up = function(knex) {
  return knex.schema.createTable('${tableName}', (table) => {
`;
  
  // Add columns
  schema.columns.forEach(column => {
    if (schema.primaryKey.includes(column.column_name) && column.data_type === 'integer' && column.column_default && column.column_default.includes('nextval')) {
      // Handle auto-incrementing primary key
      content += `    table.increments('${column.column_name}');\n`;
    } else if (schema.primaryKey.includes(column.column_name) && column.data_type === 'uuid') {
      // Handle UUID primary key
      content += `    table.uuid('${column.column_name}').primary();\n`;
    } else {
      content += `    ${generateKnexColumnDefinition(column)};\n`;
    }
  });
  
  // Add primary key if it's not an increments field
  if (schema.primaryKey.length > 0 && 
      !(schema.primaryKey.length === 1 && 
        schema.columns.find(c => c.column_name === schema.primaryKey[0] && 
                              (c.data_type === 'integer' || c.data_type === 'uuid')))) {
    content += `    table.primary([${schema.primaryKey.map(pk => `'${pk}'`).join(', ')}]);\n`;
  }
  
  // Add foreign keys
  schema.foreignKeys.forEach(fk => {
    content += `    table.foreign('${fk.column_name}').references('${fk.foreign_column_name}').inTable('${fk.foreign_table_name}');\n`;
  });
  
  // Close createTable
  content += `  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${tableName}');
};
`;

  // Write file
  fs.writeFileSync(filePath, content);
  return fileName;
}

// Main function
async function generateMigrations() {
  console.log(colors.cyan('\n=== Generating Knex Migrations ===\n'));
  
  // Ensure migrations directory exists
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }
  
  const tables = await getAllTables();
  
  if (tables.length === 0) {
    console.log(colors.red('No tables found in the database!'));
    return;
  }
  
  console.log(colors.white(`Found ${tables.length} tables`));
  
  // Sort tables to handle dependencies
  // This is a simplified approach - for complex dependencies, manual ordering might be needed
  const orderedTables = [...tables].sort((a, b) => {
    // Tables with 'users' in the name first
    if (a.includes('users') && !b.includes('users')) return -1;
    if (!a.includes('users') && b.includes('users')) return 1;
    
    // Then alphabetically
    return a.localeCompare(b);
  });
  
  const createdFiles = [];
  
  for (const tableName of orderedTables) {
    process.stdout.write(colors.white(`Generating migration for ${tableName}... `));
    
    const schema = await getTableSchema(tableName);
    
    if (!schema) {
      console.log(colors.red('FAILED'));
      continue;
    }
    
    const fileName = generateMigrationFile(tableName, schema);
    createdFiles.push(fileName);
    
    console.log(colors.green('OK'));
  }
  
  console.log(colors.cyan('\n=== Migration Generation Summary ===\n'));
  console.log(colors.green(`Generated ${createdFiles.length} migration files:`));
  
  createdFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log(colors.yellow(`\nImportant: Review these migrations before running them.`));
  console.log(colors.yellow(`The migrations are ordered alphabetically, which may not respect all foreign key dependencies.`));
  console.log(colors.yellow(`You may need to manually adjust the timestamps in the filenames to change the order.`));
}

// Run the generator
generateMigrations()
  .then(() => {
    console.log(colors.cyan('\nMigration generation complete.\n'));
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Generation failed: ${error.message}`);
    process.exit(1);
  }); 