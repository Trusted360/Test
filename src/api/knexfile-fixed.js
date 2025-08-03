module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgresql://trusted360:#~!]dN[EYGGrrUv!sivs1gj$O~bL@trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com:5432/postgres',
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
    connection: process.env.DATABASE_URL || 'postgresql://trusted360:#~!]dN[EYGGrrUv!sivs1gj$O~bL@trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com:5432/postgres',
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
    connection: process.env.DATABASE_URL || 'postgresql://trusted360:#~!]dN[EYGGrrUv!sivs1gj$O~bL@trusted360-aurora.cluster-c7ayucwkc59f.us-east-2.rds.amazonaws.com:5432/postgres',
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  }
};
