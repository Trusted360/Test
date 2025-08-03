function getDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required but not set');
  }
  return process.env.DATABASE_URL;
}

module.exports = {
  development: {
    client: 'pg',
    connection: getDatabaseConnection(),
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  },
  test: {
    client: 'pg',
    connection: getDatabaseConnection(),
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  },
  production: {
    client: 'pg',
    connection: getDatabaseConnection(),
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  }
};