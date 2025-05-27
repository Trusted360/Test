const config = require('./src/config');

module.exports = {
  development: {
    client: 'pg',
    connection: config.database.url,
    pool: config.database.pool,
    migrations: {
      directory: '../../database/migrations'
    }
  },
  test: {
    client: 'pg',
    connection: config.database.url,
    pool: config.database.pool,
    migrations: {
      directory: '../../database/migrations'
    }
  },
  production: {
    client: 'pg',
    connection: config.database.url,
    pool: config.database.pool,
    migrations: {
      directory: '../../database/migrations'
    }
  }
}; 