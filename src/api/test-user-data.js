const knex = require('knex');

const db = knex({
  client: 'postgresql',
  connection: {
    host: 'trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com',
    port: 5432,
    user: 'trusted360',
    password: '#~!]dN[EYGGrrUv!sivs1gj$O~bL',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  }
});

async function testUserData() {
  try {
    console.log('Testing database connection...');
    
    // Check if users table exists
    const tableExists = await db.schema.hasTable('users');
    console.log('Users table exists:', tableExists);
    
    if (!tableExists) {
      console.log('ERROR: Users table does not exist!');
      return;
    }
    
    // Get table schema
    console.log('\nUsers table columns:');
    const columns = await db('information_schema.columns')
      .select('column_name', 'data_type', 'is_nullable')
      .where({
        table_name: 'users',
        table_schema: 'public'
      });
    
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Count total users
    const userCount = await db('users').count('* as count').first();
    console.log(`\nTotal users: ${userCount.count}`);
    
    if (parseInt(userCount.count) === 0) {
      console.log('ERROR: No users found in database!');
      return;
    }
    
    // Check for users with missing passwords
    const usersWithoutPassword = await db('users')
      .whereNull('password')
      .orWhere('password', '')
      .count('* as count')
      .first();
    
    console.log(`Users with missing/empty passwords: ${usersWithoutPassword.count}`);
    
    // Get sample user data (without showing actual passwords)
    const sampleUsers = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'tenant_id')
      .select(db.raw('CASE WHEN password IS NULL THEN \'NULL\' WHEN password = \'\' THEN \'EMPTY\' ELSE \'HAS_VALUE\' END as password_status'))
      .select(db.raw('LENGTH(password) as password_length'))
      .limit(5);
    
    console.log('\nSample users:');
    sampleUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Password: ${user.password_status} (length: ${user.password_length})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

testUserData();