const bcrypt = require('bcrypt');

/**
 * Create demo accounts for testing and development
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if demo accounts already exist
  const adminExists = await knex('users').where('email', 'admin@trusted360.com').first();
  const userExists = await knex('users').where('email', 'user@trusted360.com').first();
  
  // Hash the demo password
  const hashedPassword = await bcrypt.hash('demo123', 12);
  
  // Create admin account if it doesn't exist
  if (!adminExists) {
    await knex('users').insert({
      email: 'admin@trusted360.com',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      admin_level: 'super_admin',
      email_verified: true,
      tenant_id: 'default',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    console.log('✅ Created admin demo account: admin@trusted360.com / demo123');
  } else {
    console.log('ℹ️  Admin demo account already exists');
  }
  
  // Create user account if it doesn't exist
  if (!userExists) {
    await knex('users').insert({
      email: 'user@trusted360.com',
      password: hashedPassword,
      first_name: 'Demo',
      last_name: 'User',
      role: 'user',
      admin_level: 'none',
      email_verified: true,
      tenant_id: 'default',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    console.log('✅ Created user demo account: user@trusted360.com / demo123');
  } else {
    console.log('ℹ️  User demo account already exists');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove demo accounts
  await knex('users').where('email', 'admin@trusted360.com').del();
  await knex('users').where('email', 'user@trusted360.com').del();
  console.log('🗑️  Removed demo accounts');
};
