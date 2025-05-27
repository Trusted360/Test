# Trusted360 - Security Audit Platform

## Project Intent

Trusted360 is being transformed from a meal planning application into a comprehensive security audit platform. The goal is to leverage the existing infrastructure while completely replacing the domain logic.

## Target System Architecture

### Core Modules
- **Audit Engine**: Core business logic for security audits and compliance checking
- **Camera Ingest**: Real-time video/image processing and analysis pipeline
- **Alert Queue**: Event-driven notification and escalation system
- **Edge Box Integration**: Communication with on-premise security devices
- **PMS Integration**: Property Management System connectivity
- **Notification Services**: Email/SMS alerting capabilities

### Key Features
- Real-time security monitoring
- Automated compliance auditing
- Multi-tenant property management
- Role-based access control
- Alert escalation workflows
- Audit trail and reporting

## Technology Stack (Retained)

### Infrastructure (Keep)
- **Backend**: Node.js with Express and GraphQL
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT-based with role/claims middleware
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Traefik (migrating from nginx)

### Frontend (Rebuild)
- **Framework**: React with TypeScript (keep framework, rebuild components)
- **State Management**: Context API or Redux (TBD)
- **UI Library**: Material-UI or similar (TBD)

## Migration Strategy

1. **Phase 1**: Infrastructure cleanup and security hardening
2. **Phase 2**: Authentication system validation and enhancement
3. **Phase 3**: Domain model replacement (audit entities)
4. **Phase 4**: API contract redesign for audit workflows
5. **Phase 5**: Frontend rebuild for security dashboard
6. **Phase 6**: Integration testing and deployment pipeline

## Success Criteria

- Single command deployment (`docker-compose up`)
- Proper authentication with role-based access
- API-first architecture (no UI bypassing backend)
- Comprehensive testing suite
- Production-ready observability
- Secure configuration management 