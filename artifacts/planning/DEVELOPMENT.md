# Trusted 360 - Development Guide

This guide provides detailed instructions for setting up and developing the Trusted 360 self-storage security platform.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Docker Desktop** (latest version)
- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Git**
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript
  - Docker

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 10GB free space
- **OS**: macOS, Windows 10/11, or Linux

## Initial Setup

### 1. Clone the Repository
```bash
git clone [repository-url]
cd trusted360
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Key variables are already set for local development
```

### 3. Install Dependencies
```bash
# API dependencies
cd src/api
npm install

# Dashboard dependencies  
cd ../dashboard
npm install

# Return to project root
cd ../..
```

### 4. Start Infrastructure
```bash
# Start all Docker services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 5. Database Setup
The database is automatically initialized with the baseline schema. Demo accounts are pre-created:
- **Admin**: admin@trusted360.com / demo123!
- **User**: user@trusted360.com / demo123

## Development Workflow

### Starting Development

1. **Start Infrastructure** (if not already running):
```bash
docker-compose up -d
```

2. **Start Dashboard Development Server**:
```bash
cd src/dashboard
npm run dev
```

3. **Access the Application**:
- Dashboard: http://localhost:5173 ✅ (Use this for development)
- API: http://localhost:3001
- GraphQL Playground: http://localhost:3001/graphql

⚠️ **Important**: Always use port 5173 for development. Port 8088 is the production build and won't have hot reload or proper API proxying.

### Code Structure

```
src/
├── api/                    # Backend API
│   ├── src/
│   │   ├── controllers/   # HTTP request handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── middleware/    # Express middleware
│   └── migrations/        # Database migrations
│
└── dashboard/             # Frontend React app
    ├── src/
    │   ├── pages/         # Page components
    │   ├── components/    # Reusable components
    │   ├── context/       # React contexts
    │   ├── services/      # API client services
    │   └── utils/         # Helper functions
    └── public/            # Static assets
```

### Making Changes

#### Frontend Development
1. The Vite dev server provides hot module replacement
2. Changes to React components update instantly
3. TypeScript errors appear in the browser console
4. Use Chrome DevTools for debugging

#### Backend Development
1. API changes require container restart:
```bash
docker-compose restart api
```

2. View API logs:
```bash
docker-compose logs -f api
```

3. Test endpoints with curl or Postman:
```bash
curl http://localhost:3001/api/health
```

#### Database Changes
1. Create a new migration:
```bash
cd src/api
npx knex migrate:make your_migration_name
```

2. Run migrations:
```bash
docker exec trusted360-api npx knex migrate:latest
```

3. Roll back migrations:
```bash
docker exec trusted360-api npx knex migrate:rollback
```

### Authentication System

The authentication system is fully operational with:
- Session-based authentication (not JWT despite some naming)
- bcrypt password hashing
- Database-backed sessions with expiration
- Activity tracking for all auth events
- Multi-tenant support via tenant_id

Key files:
- `src/api/src/services/auth.service.js` - Core auth logic
- `src/dashboard/src/context/AuthContext.tsx` - Frontend auth state
- `src/api/src/models/user.model.js` - User data access

## Architecture Overview

### Technology Stack
- **Frontend**: React 18, TypeScript, Material-UI, Vite
- **Backend**: Node.js, Express, GraphQL (Apollo Server)
- **Database**: PostgreSQL 16 with Knex.js
- **Caching**: Redis 7
- **Container**: Docker & Docker Compose
- **Proxy**: Nginx (production), Vite proxy (development)

### Key Design Decisions
1. **Integer IDs** instead of UUIDs for simplicity
2. **Session tokens** instead of JWT for better control
3. **Multi-tenant** via tenant_id column (default: 'default')
4. **Activity logging** for complete audit trail

### API Structure
- RESTful endpoints under `/api/*`
- GraphQL endpoint at `/graphql`
- Health check at `/api/health`
- WebSocket support (planned)

## Common Tasks

### Adding a New API Endpoint
1. Create controller method in `src/api/src/controllers/`
2. Add service logic in `src/api/src/services/`
3. Define route in `src/api/src/routes/`
4. Update API documentation

### Adding a New Page
1. Create component in `src/dashboard/src/pages/`
2. Add route in `src/dashboard/src/App.tsx`
3. Update navigation if needed
4. Wrap with ProtectedRoute for auth

### Running Tests
```bash
# API tests
cd src/api
npm test

# Dashboard tests
cd src/dashboard
npm test
```

### Building for Production
```bash
# Build dashboard
cd src/dashboard
npm run build

# Build API
cd src/api
npm run build

# Or use Docker
docker-compose build
```

## Troubleshooting

### Cannot Login / No Network Calls
- **Solution**: Access http://localhost:5173, NOT http://localhost:8088
- The dev server must be running: `cd src/dashboard && npm run dev`

### Port Already in Use
```bash
# Find process using port
lsof -i :5173  # Mac/Linux
netstat -ano | findstr :5173  # Windows

# Kill process or change port in vite.config.ts
```

### Database Connection Failed
1. Check if PostgreSQL is running:
```bash
docker-compose ps
docker-compose logs postgres
```

2. Verify connection string in .env

3. Ensure no local PostgreSQL conflicts on port 5432

### API Not Responding
1. Check container status:
```bash
docker-compose ps
docker logs trusted360-api
```

2. Restart the service:
```bash
docker-compose restart api
```

### Migration Errors
1. Check migration status:
```bash
docker exec trusted360-api npx knex migrate:status
```

2. View migration history:
```bash
docker exec trusted360-postgres psql -U trusted360 -d trusted360 -c "SELECT * FROM knex_migrations;"
```

### Hot Reload Not Working
1. Ensure you're using the Vite dev server (port 5173)
2. Check for TypeScript errors blocking compilation
3. Try restarting the dev server

## Best Practices

### Code Style
- Use TypeScript for type safety
- Follow ESLint rules
- Format with Prettier
- Write meaningful commit messages

### Security
- Never commit secrets to git
- Use environment variables
- Validate all user input
- Use parameterized queries

### Performance
- Optimize database queries
- Use Redis for caching
- Implement pagination
- Lazy load components

### Testing
- Write unit tests for services
- Test API endpoints
- Use React Testing Library
- Maintain >80% coverage

## Resources

- [Project Documentation](./artifacts/)
- [API Documentation](http://localhost:3001/graphql)
- [Material-UI Docs](https://mui.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Knex.js Guide](http://knexjs.org/)

---

**Need Help?** Check the troubleshooting section or refer to the architecture documentation in the artifacts folder. 