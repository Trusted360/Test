const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL || 'postgresql://trusted360:#~!]dN[EYGGrrUv!sivs1gj$O~bL@trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  }
});

async function verifyDatabase() {
  try {
    console.log('🔍 Connecting to Aurora PostgreSQL database...');
    
    // Check if we can connect
    await db.raw('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // List all tables
    console.log('\n📋 Checking database tables...');
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('❌ No tables found - migrations may not have run');
      return;
    }
    
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check specific critical tables
    const criticalTables = ['users', 'tenants', 'properties', 'checklists'];
    console.log('\n🔍 Verifying critical tables...');
    
    for (const tableName of criticalTables) {
      try {
        const count = await db(tableName).count('* as count').first();
        console.log(`✅ ${tableName}: ${count.count} records`);
      } catch (error) {
        console.log(`❌ ${tableName}: Table missing or error - ${error.message}`);
      }
    }
    
    // Check migration table
    console.log('\n📊 Migration status...');
    try {
      const migrations = await db('knex_migrations')
        .select('name', 'migration_time')
        .orderBy('migration_time', 'desc')
        .limit(5);
      
      console.log(`✅ Found ${migrations.length} recent migrations:`);
      migrations.forEach(m => {
        console.log(`   - ${m.name} (${m.migration_time})`);
      });
    } catch (error) {
      console.log(`❌ Migration table error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  } finally {
    await db.destroy();
    console.log('\n🔚 Database connection closed');
  }
}

verifyDatabase();