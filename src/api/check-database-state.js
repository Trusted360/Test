const knex = require('knex');
const config = require('./src/config');

async function checkDatabaseState() {
  console.log('Checking current database state...\n');
  
  // Create knex instance
  const db = knex({
    client: 'pg',
    connection: config.database.url,
    pool: config.database.pool
  });

  try {
    // Test connection
    await db.raw('SELECT 1');
    console.log('Database connection successful\n');

    // Get all tables
    const result = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const existingTables = result.rows.map(row => row.table_name);
    
    console.log('Existing tables:');
    if (existingTables.length === 0) {
      console.log('   No tables found');
    } else {
      existingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
    
    console.log('\nRequired tables for Properties and Checklists:');
    const requiredTables = [
      'users',
      'sessions',
      'property_types',
      'properties',
      'checklist_templates',
      'checklist_items',
      'property_checklists',
      'checklist_responses',
      'checklist_attachments',
      'checklist_approvals',
      'checklist_comments',
      'template_property_types',
      'scheduled_checklist_generations'
    ];
    
    const missingTables = [];
    
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      const status = exists ? '[OK]' : '[MISSING]';
      console.log(`   ${status} ${table}`);
      if (!exists) {
        missingTables.push(table);
      }
    });
    
    if (missingTables.length > 0) {
      console.log('\nMissing tables:');
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    } else {
      console.log('\nAll required tables exist!');
    }
    
    // Check migrations table
    console.log('\nMigration status:');
    try {
      const migrations = await db('knex_migrations').select('*').orderBy('batch', 'desc');
      if (migrations.length > 0) {
        console.log('   Last migrations run:');
        migrations.slice(0, 5).forEach(migration => {
          console.log(`   - ${migration.name} (batch ${migration.batch})`);
        });
      } else {
        console.log('   No migrations have been run');
      }
    } catch (error) {
      console.log('   No migrations table found or error accessing it');
    }
    
    return {
      connected: true,
      existingTables,
      missingTables,
      allTablesExist: missingTables.length === 0
    };
    
  } catch (error) {
    console.error('Database error:', error.message);
    return {
      connected: false,
      error: error.message
    };
  } finally {
    await db.destroy();
  }
}

// Run the check
if (require.main === module) {
  checkDatabaseState()
    .then(result => {
      if (result.connected) {
        process.exit(result.allTablesExist ? 0 : 1);
      } else {
        process.exit(2);
      }
    })
    .catch(error => {
      console.error('Script error:', error);
      process.exit(3);
    });
}

module.exports = checkDatabaseState;