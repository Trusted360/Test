#!/bin/bash

# Setup script for Trusted360 project structure

echo "🏗️ Setting up Trusted360 project structure..."

# Create all necessary directories
mkdir -p {database/{migrations,seeds},src/{api/{controllers,services,middleware,routes},dashboard/{src/{components/{facilities,units,cameras,maintenance},pages,services},public},video-processor/{src,models}},config/{traefik,nginx},scripts,docs}

# Create initial package.json for API
cat > src/api/package.json << 'EOF'
{
  "name": "trusted360-api",
  "version": "1.0.0",
  "description": "Trusted360 Storage Facility Management API",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "migrate": "knex migrate:latest",
    "seed": "knex seed:run"
  },
  "dependencies": {
    "express": "^4.18.2",
    "knex": "^2.5.1",
    "pg": "^8.11.3",
    "redis": "^4.6.7",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "socket.io": "^4.6.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.4"
  }
}
EOF

# Create knexfile.js
cat > database/knexfile.js << 'EOF'
module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      database: 'trusted360_dev',
      user: 'trusted360_user',
      password: 'trusted360_password'
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};
EOF

echo "✅ Trusted360 project structure created!" 