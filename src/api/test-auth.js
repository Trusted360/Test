require('dotenv').config({ path: '../../.env' });
const knex = require('knex')({ client: 'pg', connection: process.env.DATABASE_URL });
const bcrypt = require('bcrypt');

(async () => {
  try {
    console.log('=== AUTHENTICATION TEST ===');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');
    
    // Check if users exist
    const userCount = await knex('users').count('* as count').first();
    console.log('Users in database:', userCount.count);
    
    // Test admin login
    const admin = await knex('users').where('email', 'admin@trusted360.com').first();
    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    console.log('✅ Admin user found:', admin.email);
    
    // Test password
    const validPassword = await bcrypt.compare('demo123', admin.password);
    console.log('Password test result:', validPassword ? '✅ VALID' : '❌ INVALID');
    
    // Test wrong password
    const invalidPassword = await bcrypt.compare('wrongpassword', admin.password);
    console.log('Wrong password test:', invalidPassword ? '❌ SHOULD FAIL' : '✅ CORRECTLY REJECTED');
    
    await knex.destroy();
    console.log('=== TEST COMPLETE ===');
    
    if (validPassword && !invalidPassword) {
      console.log('🎉 ALL TESTS PASSED - Authentication is working!');
      process.exit(0);
    } else {
      console.log('❌ TESTS FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})(); 