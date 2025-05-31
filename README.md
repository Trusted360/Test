# Trusted 360 - Self-Storage Security Platform

## Overview

Trusted 360 is a comprehensive security monitoring platform designed specifically for self-storage facilities. It provides real-time surveillance, automated alerts, and facility management tools to ensure the safety and security of storage units.

## 🚀 Current Status

✅ **Authentication System**: Fully operational with database-backed sessions  
✅ **Dashboard UI**: Working with Material-UI components  
✅ **API Infrastructure**: RESTful + GraphQL endpoints ready  
✅ **Database**: PostgreSQL with multi-tenant support  
✅ **Docker Setup**: Complete containerization  

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

### Login Credentials
- **Admin**: admin@trusted360.com / demo123!
- **User**: user@trusted360.com / demo123

## Architecture

### Technology Stack
- **Frontend**: React, TypeScript, Material-UI, Vite
- **Backend**: Node.js, Express, GraphQL
- **Database**: PostgreSQL with Knex.js migrations
- **Caching**: Redis
- **Containerization**: Docker & Docker Compose
- **Authentication**: Session-based with bcrypt password hashing

### Project Structure
```
trusted360/
├── src/
│   ├── api/           # Backend API service
│   └── dashboard/     # React frontend application
├── database/          # Database schemas and migrations
├── artifacts/         # Documentation and specifications
├── config/            # Configuration files
└── docker-compose.yml # Container orchestration
```

## Features

### Current (Baseline)
- ✅ User authentication and authorization
- ✅ Multi-tenant data isolation
- ✅ Activity logging and audit trail
- ✅ Protected routes and API endpoints
- ✅ Responsive dashboard UI

### Planned Features
- 🚧 Real-time camera feed monitoring
- 🚧 AI-powered incident detection
- 🚧 Mobile security audits with geo-stamping
- 🚧 Automated alert system
- 🚧 Facility management tools
- 🚧 Compliance reporting

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
- [Baseline Setup](BASELINE_SETUP_COMPLETE.md) - Current implementation status
- [Authentication](artifacts/architecture/AUTHENTICATION_ANALYSIS.md) - Auth system details
- [Database Migrations](DATABASE_MIGRATION_AUDIT.md) - Migration best practices

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

**Current Version**: 0.1.0 (Baseline)  
**Last Updated**: May 31, 2025