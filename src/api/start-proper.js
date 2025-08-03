#!/usr/bin/env node
// Set DATABASE_URL if needed
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
  const username = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'postgres';
  process.env.DATABASE_URL = `postgresql://${username}:${password}@${host}:${port}/${database}`;
}

console.log('Starting with DATABASE_URL:', process.env.DATABASE_URL);

// Load the app and CALL startServer
const { startServer } = require('./src/index.js');
startServer();
