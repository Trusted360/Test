#!/usr/bin/env node

// Test script to validate configuration changes
console.log('=== CONFIGURATION VALIDATION TEST ===');

// Test 1: Verify knexfile.js fails without DATABASE_URL
console.log('\n🧪 Test 1: Testing knexfile.js without DATABASE_URL...');
delete process.env.DATABASE_URL;

try {
  const knexConfig = require('./knexfile.js');
  console.log('❌ FAIL: knexfile.js should have thrown an error without DATABASE_URL');
  process.exit(1);
} catch (error) {
  if (error.message.includes('DATABASE_URL environment variable is required')) {
    console.log('✅ PASS: knexfile.js correctly throws error when DATABASE_URL is missing');
  } else {
    console.log('❌ FAIL: Unexpected error:', error.message);
    process.exit(1);
  }
}

// Test 2: Verify knexfile.js works with DATABASE_URL
console.log('\n🧪 Test 2: Testing knexfile.js with DATABASE_URL...');
process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5432/testdb';

try {
  // Clear require cache to reload module
  delete require.cache[require.resolve('./knexfile.js')];
  const knexConfig = require('./knexfile.js');
  
  if (knexConfig.development.connection === process.env.DATABASE_URL &&
      knexConfig.test.connection === process.env.DATABASE_URL &&
      knexConfig.production.connection === process.env.DATABASE_URL) {
    console.log('✅ PASS: knexfile.js correctly uses DATABASE_URL from environment');
  } else {
    console.log('❌ FAIL: knexfile.js is not using DATABASE_URL correctly');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ FAIL: knexfile.js threw unexpected error:', error.message);
  process.exit(1);
}

// Test 3: Verify src/config/index.js builds DATABASE_URL correctly
console.log('\n🧪 Test 3: Testing config/index.js database URL building...');

// Set individual DB components
process.env.DB_USERNAME = 'testuser';
process.env.DB_PASSWORD = 'testpass';
process.env.DB_HOST = 'testhost.com';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'testdb';
delete process.env.DATABASE_URL; // Remove to test building from components

try {
  // Clear require cache
  delete require.cache[require.resolve('./src/config/index.js')];
  const config = require('./src/config/index.js');
  
  const expectedUrl = 'postgresql://testuser:testpass@testhost.com:5432/testdb';
  if (config.database.url === expectedUrl) {
    console.log('✅ PASS: config/index.js correctly builds DATABASE_URL from components');
  } else {
    console.log('❌ FAIL: config/index.js built incorrect URL');
    console.log('Expected:', expectedUrl);
    console.log('Got:', config.database.url);
    process.exit(1);
  }
} catch (error) {
  console.log('❌ FAIL: config/index.js threw error:', error.message);
  process.exit(1);
}

console.log('\n🎉 ALL CONFIGURATION TESTS PASSED!');
console.log('\n✅ Summary:');
console.log('  - knexfile.js properly validates DATABASE_URL requirement');
console.log('  - knexfile.js uses environment variable correctly');
console.log('  - config/index.js builds DATABASE_URL from components');
console.log('\n🚀 Configuration is ready for deployment!');