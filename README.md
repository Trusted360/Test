# Trusted 360 - Self-Storage Security Platform

## Overview

Trusted 360 is a comprehensive security monitoring platform designed specifically for self-storage facilities. It provides real-time surveillance, automated alerts, and facility management tools to ensure the safety and security of storage units.

## 🚀 Current Status (Updated July 31, 2025)

✅ **Authentication System**: Fully operational with native bcrypt implementation
✅ **Dashboard UI**: Working with Material-UI components and mobile-first design
✅ **API Infrastructure**: RESTful + GraphQL endpoints ready
✅ **Database**: PostgreSQL with multi-tenant support (Pre-SOP clean state)
✅ **Docker Setup**: Complete containerization with rollback-clean images
✅ **Mobile Optimization**: Full mobile-first responsive design with PWA features
✅ **Production Deployment**: AWS ECS with clean rollback images (`api-rollback-v1`, `dashboard-rollback-v1`)
❌ **SOP Management System**: REMOVED - System rolled back to pre-SOP state due to critical authentication issues

### ⚠️ Critical System Notice
The SOP (Standard Operating Procedures) management system has been **completely removed** from the production environment due to critical authentication failures caused by bcrypt library incompatibilities and database migration corruption. The system has been restored to its pre-SOP working state with all authentication functionality confirmed operational.

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 18+
- Git

### Running the Application

1. **Start all services**:
```bash
docker-compose up -d
```

2. **Start development dashboard** (for hot reload):
```bash
cd src/dashboard
npm run dev
```

3. **Access the application**:
- Dashboard: http://localhost:5173 (development)
- API: http://localhost:3001
- GraphQL: http://localhost:3001/graphql

### Login Credentials (Post-Rollback - Confirmed Working)
- **Demo User**: demo_user@example.com / demo123
- **Demo Admin**: demo_admin@example.com / admin123
- **Demo Manager**: demo_manager@example.com / manager123

### Current Production Environment
- **API**: `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:api-rollback-v1`
- **Dashboard**: `119268833526.dkr.ecr.us-east-2.amazonaws.com/trusted360:dashboard-rollback-v1`
- **Cluster**: `node-app-cluster` (AWS ECS Fargate)
- **Task Definition**: `trusted360-rollback:4`
- **Database**: Aurora PostgreSQL (clean pre-SOP state)
- **Authentication**: Native bcrypt implementation (reverted from bcryptjs)

## Architecture

### Technology Stack
- **Frontend**: React, TypeScript, Material-UI, Vite
- **Backend**: Node.js, Express, GraphQL
- **Database**: PostgreSQL with Knex.js migrations
- **Caching**: Redis
- **Containerization**: Docker & Docker Compose
- **Authentication**: Session-based with native bcrypt password hashing (reverted from bcryptjs)

### Project Structure
```
trusted360/
├── src/
│   ├── api/           # Backend API service
│   │   ├── src/
│   │   │   ├── controllers/    # API controllers (SOP controllers removed)
│   │   │   ├── routes/         # API routes (SOP routes removed)
│   │   │   └── services/       # Business logic services
│   │   └── migrations/         # Database migrations (SOP migrations removed)
│   └── dashboard/     # React frontend application
│       └── src/
│           ├── pages/          # Core application pages (SOP pages removed)
│           ├── services/       # Frontend services (SOP service removed)
│           ├── types/          # TypeScript definitions (SOP types removed)
│           └── components/     # Reusable UI components
├── database/          # Database schemas and migrations
├── artifacts/         # Documentation and specifications
├── config/            # Configuration files
└── docker-compose.yml # Container orchestration
```

## Features

### Current (Production Ready)
- ✅ User authentication and authorization
- ✅ Multi-tenant data isolation
- ✅ Activity logging and audit trail
- ✅ Protected routes and API endpoints
- ✅ Mobile-first responsive dashboard UI
- ✅ Progressive Web App (PWA) capabilities
- ✅ **Core Checklist System**:
  - Step-by-step task management
  - Mobile camera capture for validation
  - Property-based assignments
  - Scheduling and completion tracking
- ✅ **Property Management**:
  - Multi-property support
  - Property-specific assignments
  - Mobile-optimized interfaces

### Planned Features
- 🚧 Real-time camera feed monitoring
- 🚧 AI-powered incident detection
- 🚧 Automated alert system
- 🚧 Advanced compliance reporting
- 🚧 Integration with external security systems

## Development

### Local Development Setup
```bash
# Clone the repository
git clone [repository-url]
cd trusted360

# Install dependencies
cd src/api && npm install
cd ../dashboard && npm install

# Start services
docker-compose up -d

# Run development servers
cd src/dashboard && npm run dev
```

### Key Commands
- `docker-compose up -d` - Start all services
- `docker-compose down` - Stop all services
- `docker-compose logs [service]` - View service logs
- `npm run dev` - Start development server
- `npm run build` - Build for production

### Environment Variables
See `.env.example` for required configuration. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Session security (not using JWT despite name)
- `NODE_ENV` - Environment (development/production)

## Documentation

- [Development Guide](DEVELOPMENT.md) - Detailed setup instructions
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Cross-platform deployment instructions
- [Baseline Setup](BASELINE_SETUP_COMPLETE.md) - Current implementation status
- [Authentication](artifacts/architecture/AUTHENTICATION_ANALYSIS.md) - Auth system details
- [Database Migrations](DATABASE_MIGRATION_AUDIT.md) - Migration best practices
- [Mobile Deployment Status](MOBILE_DEPLOYMENT_STATUS.md) - Mobile optimization details
- [Property Manager System Summary](PROPERTY_MANAGER_SYSTEM_SUMMARY.md) - Property management features

## Troubleshooting

### Common Issues

**Cannot login / No network requests**
- Make sure you're accessing http://localhost:5173 (NOT port 8088)
- The development server must be running: `cd src/dashboard && npm run dev`

**Services won't start**
```bash
docker-compose down
docker-compose up -d
docker-compose ps  # Check service status
```

**Database connection errors**
- Ensure PostgreSQL is running: `docker ps`
- Check DATABASE_URL in docker-compose.yml
- Verify no port conflicts on 5432

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits

## License

[License Type] - See LICENSE file for details

## Support

For issues and questions:
- Check the [troubleshooting guide](#troubleshooting)
- Review [documentation](#documentation)
- Submit an issue on GitHub

---

**Current Version**: 1.0.0 (Production Ready)
**Last Updated**: July 31, 2025

## Recent Updates

### v1.0.1 - SOP System Rollback (July 31, 2025)
- ❌ **SOP Management System REMOVED**: Complete rollback due to critical authentication issues
- ✅ **Authentication System Restored**: Reverted from bcryptjs back to native bcrypt
- ✅ **Database Migration Cleanup**: Removed problematic SOP migration files
- ✅ **Production Deployment**: Clean rollback images deployed to AWS ECS
- ✅ **System Stability**: All core functionality confirmed working
- ✅ **Documentation**: Comprehensive incident report and lessons learned documented

#### Critical Technical Details:
- **Root Cause**: bcrypt/bcryptjs incompatibility broke password authentication
- **Migration Issues**: Database migration corruption when rolling back to pre-SOP state
- **Resolution**: Complete SOP code removal and native bcrypt restoration
- **Current Images**: `api-rollback-v1` and `dashboard-rollback-v1` in production
- **Authentication Method**: Native bcrypt with existing password hashes preserved

### v1.0.0 - SOP Management System (July 2025) [ROLLED BACK]
- ❌ **REMOVED**: Complete SOP system due to authentication incompatibility
- ❌ **REMOVED**: All SOP-related database migrations
- ❌ **REMOVED**: SOP controllers, services, and UI components
- **Lessons Learned**: Documented in comprehensive incident report

### v0.9.0 - Mobile Optimization (June 2025)
- ✅ Mobile-first responsive design overhaul
- ✅ Progressive Web App (PWA) implementation
- ✅ Touch-friendly interfaces and gestures
- ✅ Mobile camera capture functionality
- ✅ Offline capabilities with service workers
- ✅ Mobile-optimized navigation systems