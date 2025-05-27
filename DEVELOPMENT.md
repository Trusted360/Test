# Trusted 360 - Development Setup Guide

## Overview

Trusted 360 is a self-storage security platform that provides audit management, facility monitoring, and edge device integration. This guide will help you set up the development environment and get the application running locally.

## Architecture

- **Frontend**: React + TypeScript + Material-UI (Vite)
- **Backend**: Node.js + Express + PostgreSQL + Redis
- **Authentication**: JWT-based with session management
- **Database**: PostgreSQL with Knex.js migrations
- **Caching**: Redis
- **AI Integration**: Ollama (optional for development)

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Git

## Quick Start

### 1. Initial Setup

```bash
# Clone and navigate to the project
cd trusted360

# Run the setup script
./setup-local-dev.sh
```

This script will:
- Create a `.env` file with development configuration
- Install all dependencies for both API and Dashboard
- Provide next steps for starting services

### 2. Start Infrastructure Services

```bash
# Start database and Redis
./start-dev.sh
```

This script will:
- Start PostgreSQL and Redis containers
- Run database migrations
- Verify services are ready

### 3. Start Application Services

Open two terminal windows:

**Terminal 1 - API Server:**
```bash
cd src/api
npm run dev
```

**Terminal 2 - Dashboard:**
```bash
cd src/dashboard
npm run dev
```

## Access Points

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **GraphQL Playground**: http://localhost:3001/graphql

## Demo Accounts

For testing authentication:

- **Admin**: admin@trusted360.com / demo123
- **User**: user@trusted360.com / demo123

## Project Structure

```
trusted360/
├── src/
│   ├── api/                 # Backend API
│   │   ├── src/
│   │   │   ├── controllers/ # Route controllers
│   │   │   ├── models/      # Database models
│   │   │   ├── routes/      # API routes
│   │   │   ├── services/    # Business logic
│   │   │   └── middleware/  # Express middleware
│   │   └── package.json
│   └── dashboard/           # Frontend React app
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── pages/       # Page components
│       │   ├── context/     # React context
│       │   └── services/    # API services
│       └── package.json
├── database/
│   └── migrations/          # Database migrations
├── docker-compose.yml       # Infrastructure services
└── README.md
```

## Available Scripts

### API (src/api)
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run migrate:rollback` - Rollback last migration

### Dashboard (src/dashboard)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run serve` - Preview production build
- `npm test` - Run tests

## Environment Variables

The `.env` file contains all necessary configuration for local development:

```env
# Server Configuration
NODE_ENV=development
API_PORT=3000
BASE_URL=http://localhost:3001

# Database Configuration
DATABASE_URL=postgres://trusted360:trusted360_password@localhost:5432/trusted360

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=trusted360-development-secret-key-change-in-production
JWT_EXPIRATION=24h

# Session Configuration
SESSION_SECRET=trusted360-session-secret-key-change-in-production
SESSION_EXPIRATION_DAYS=14

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:8088,http://localhost:3000
```

## Database

### Migrations

The application uses Knex.js for database migrations. Migrations are located in `database/migrations/`.

```bash
# Run all pending migrations
cd src/api && npm run migrate

# Check migration status
cd src/api && npm run migrate:status

# Rollback last migration
cd src/api && npm run migrate:rollback
```

### Schema

Key tables:
- `users` - User accounts and authentication
- `user_sessions` - Active user sessions
- `user_activity` - User activity tracking
- `two_factor_auth` - 2FA settings
- `email_verification` - Email verification tokens
- `password_reset` - Password reset tokens

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Health Checks
- `GET /health` - Basic health check
- `GET /api/health` - API health check

## Frontend Features

### Current Pages
- **Dashboard** - Security overview with audit status, alerts, site monitoring
- **Settings** - Facility information and notification preferences
- **Login/Register** - Authentication pages

### Components
- **Layout** - Main application layout with navigation
- **ProtectedRoute** - Route protection for authenticated users
- **AuthContext** - Authentication state management

## Development Workflow

1. **Start Infrastructure**: `./start-dev.sh`
2. **Start API**: `cd src/api && npm run dev`
3. **Start Dashboard**: `cd src/dashboard && npm run dev`
4. **Make Changes**: Edit code with hot reload
5. **Test**: Use demo accounts to test authentication
6. **Database Changes**: Create migrations for schema changes

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill processes on specific ports
lsof -ti:3001 | xargs kill -9  # API port
lsof -ti:5173 | xargs kill -9  # Dashboard port
```

**Database Connection Issues**
```bash
# Restart database container
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

**Redis Connection Issues**
```bash
# Restart Redis container
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

**Migration Issues**
```bash
# Check migration status
cd src/api && npm run migrate:status

# Reset database (WARNING: This will delete all data)
docker-compose down -v
docker-compose up postgres redis -d
cd src/api && npm run migrate
```

## Next Steps for Development

With this baseline setup, you can now begin building:

1. **Audit System** - Dynamic checklists, geo-stamped entries
2. **Facility Management** - Site profiles, device monitoring
3. **Alert System** - Real-time incident detection
4. **Edge Device Integration** - Jetson Orin Nano monitoring
5. **Reporting** - Security reports and analytics
6. **Vision AI** - Camera feed analysis and incident detection

## Support

For development questions or issues, refer to the project documentation in the `artifacts/` directory or create an issue in the project repository. 