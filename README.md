# Trusted360 - Storage Facility Management System

Trusted360 is a comprehensive SaaS platform for managing storage unit facilities, built by transforming the Simmer application architecture.

## Features

- **Multi-Facility Management**: Manage multiple storage facilities from a single dashboard
- **AI-Powered Video Surveillance**: Automatic detection of security events and anomalies
- **Unit Management**: Track occupancy, contracts, and tenant information
- **Maintenance Ticketing**: Complete maintenance workflow management
- **Real-time Alerts**: Instant notifications for security and operational events
- **Analytics Dashboard**: Insights into facility performance and trends

## Architecture

Trusted360 is built on a modern microservices architecture:

- **PostgreSQL** with PostGIS for spatial data
- **Redis** for caching and real-time features
- **Node.js API** with Express
- **React Dashboard** with Vite
- **Video Processing Service** with AI/ML capabilities
- **Traefik** for routing and load balancing

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Run `docker-compose up -d`
4. Run database migrations: `docker-compose exec api npm run migrate`
5. Access the dashboard at `http://localhost`

## Migration from Simmer

This project was created by transforming the Simmer recipe management application. Key transformations include:

- Recipes → Facilities
- Ingredients → Storage Units
- Recipe Images → Camera Feeds
- User reviews → Maintenance tickets

## Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Run tests
docker-compose exec api npm test

# Create new migration
docker-compose exec api npx knex migrate:make migration_name
```

## License

[Your License Here]