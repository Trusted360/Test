# Trusted360 - Admin Portal Design Specification

**Document Version**: 1.1  
**Created**: June 7, 2025  
**Updated**: June 7, 2025  
**Status**: MOSTLY IMPLEMENTED (Minimal Version)  
**Implementation**: Phase 1-2 Core Features Completed  

## Overview

The Admin Portal is an integrated administrative interface within the existing Trusted360 dashboard that provides developers, system administrators, and authorized users with direct access to system internals including database operations, API monitoring, logs, and performance metrics.

## 🚨 CURRENT IMPLEMENTATION STATUS (June 7, 2025)

### ✅ COMPLETED FEATURES
- **SQL Console**: Fully functional with safety controls and audit logging
- **System Health Dashboard**: Real-time metrics for database, Redis, API, and system resources
- **Admin Authentication**: Role-based access control with admin_level field
- **Backend API**: All admin endpoints operational and tested
- **Frontend Components**: AdminDashboard, SqlConsole, SystemHealth pages implemented
- **Security**: Query validation, audit logging, session-based authentication
- **Database Schema**: admin_level field added to users table
- **Demo Account**: admin@trusted360.com with super_admin privileges

### 🚨 CRITICAL ISSUE
**Admin Portal Menu Not Displaying**: The "Admin Portal" menu item is not visible in the sidebar navigation despite:
- ✅ Correct implementation of visibility logic
- ✅ User data containing admin_level field
- ✅ All admin pages functional via direct URL access
- ✅ Backend authentication working properly

**Workaround**: Admin portal accessible via direct URL: http://localhost:8088/admin

### 📊 IMPLEMENTATION PROGRESS
- **Phase 1 (Foundation)**: ✅ 100% Complete
- **Phase 2 (Core Features)**: ✅ 80% Complete (SQL Console + Health Dashboard)
- **Phase 3 (Advanced Features)**: ⏸️ Pending (Log Viewer, API Monitor)
- **Phase 4 (Polish)**: ⏸️ Pending

### 🎯 VALUE DELIVERED
Despite the menu visibility issue, the admin portal provides immediate value:
- **Development Efficiency**: Direct database access eliminates debugging bottlenecks
- **System Visibility**: Real-time health monitoring for proactive issue detection
- **Security**: Controlled access with comprehensive audit trails
- **Foundation**: Extensible architecture for additional admin features

See `ADMIN_PORTAL_STATUS.md` for detailed technical implementation status.

## Design Principles

- **Seamless Integration**: Built into existing React dashboard, no separate applications
- **Role-Based Access**: Leverages existing authentication with enhanced admin roles
- **Security First**: All operations audited and protected with appropriate safeguards
- **Consistent UX**: Maintains Material-UI design patterns and navigation structure
- **Real-Time Capabilities**: Live monitoring and streaming where applicable

## Target Users

- **Primary**: System administrators and DevOps teams
- **Secondary**: Senior developers with admin privileges
- **Access Control**: Role-based using existing authentication system

## Core Features Specification

### 1. SQL Query Interface

**Purpose**: Direct database query execution and management

**Features**:
- Interactive SQL editor with syntax highlighting (Monaco Editor or CodeMirror)
- Query execution with paginated result tables
- Query history storage and management
- Favorite queries bookmarking
- Result export capabilities (CSV, JSON, Excel)
- Query validation and error handling
- Execution time tracking
- Row count and affected rows display

**Security Measures**:
- Parameterized query enforcement
- Query whitelisting for destructive operations
- Read-only mode toggle
- Query audit logging
- Transaction rollback capabilities

**UI Components**:
```
SqlConsole/
├── QueryEditor.tsx           # Main SQL editor component
├── ResultsTable.tsx          # Query results display
├── QueryHistory.tsx          # Historical queries panel
├── QueryFavorites.tsx        # Saved queries management
└── ExportDialog.tsx          # Results export functionality
```

### 2. Real-Time Log Viewer

**Purpose**: Live system log monitoring and analysis

**Features**:
- WebSocket-based real-time log streaming
- Multi-level filtering (error, warn, info, debug)
- Search and highlight functionality
- Auto-scroll with pause capability
- Log export and download
- Timestamp filtering and date range selection
- Log source filtering (API, Auth, Database, System)

**Technical Implementation**:
- WebSocket connection for live streaming
- Log aggregation from multiple sources
- Client-side filtering and search
- Configurable refresh rates

**UI Components**:
```
LogViewer/
├── LogStream.tsx             # Main log display component
├── LogFilters.tsx            # Filtering controls
├── LogSearch.tsx             # Search functionality
└── LogExport.tsx             # Export capabilities
```

### 3. API Endpoint Monitor

**Purpose**: API discovery, testing, and performance monitoring

**Features**:
- Auto-discovery of available REST and GraphQL endpoints
- Interactive API testing interface (Postman-like)
- Request/response logging and history
- Endpoint performance metrics
- Usage statistics and analytics
- Response time monitoring
- Error rate tracking
- Authentication testing with different user roles

**Technical Implementation**:
- Express route introspection
- GraphQL schema introspection
- Request intercepting and logging
- Performance metrics collection

**UI Components**:
```
ApiMonitor/
├── EndpointExplorer.tsx      # Available endpoints browser
├── ApiTester.tsx             # Interactive testing interface
├── RequestHistory.tsx        # Previous requests log
├── PerformanceMetrics.tsx    # Response time charts
└── UsageAnalytics.tsx        # Endpoint usage statistics
```

### 4. System Health Dashboard

**Purpose**: Real-time system performance and health monitoring

**Metrics Tracked**:
- Database connection status and query performance
- Redis cache hit/miss rates and memory usage
- Active user sessions and authentication metrics
- API response times and error rates
- Docker container health and resource usage
- Memory and CPU utilization (where accessible)
- Disk space and I/O metrics

**Visualization**:
- Real-time charts using Chart.js or Recharts
- Status indicators and alerts
- Historical trend analysis
- Configurable refresh intervals

**UI Components**:
```
SystemHealth/
├── HealthOverview.tsx        # Main dashboard view
├── DatabaseMetrics.tsx       # Database performance
├── CacheMetrics.tsx          # Redis cache statistics
├── ApiMetrics.tsx            # API performance charts
├── ResourceUsage.tsx         # System resource monitoring
└── AlertsPanel.tsx           # System alerts and warnings
```

### 5. Database Schema Explorer

**Purpose**: Interactive database schema browsing and analysis

**Features**:
- Table and column explorer with search
- Relationship visualization and ER diagrams
- Index information and optimization suggestions
- Table statistics (row counts, sizes, growth trends)
- Migration history viewer
- Foreign key relationship mapping
- Data type analysis and validation

**Technical Implementation**:
- Query PostgreSQL information_schema
- Knex.js integration for migration history
- D3.js or similar for relationship visualization

**UI Components**:
```
SchemaExplorer/
├── TableBrowser.tsx          # Table listing and search
├── TableDetails.tsx          # Column and index details
├── RelationshipViewer.tsx    # ER diagram visualization
├── MigrationHistory.tsx      # Database migration log
└── SchemaStatistics.tsx      # Table statistics and metrics
```

## Technical Architecture

### Frontend Structure
```
src/dashboard/src/pages/Admin/
├── AdminDashboard.tsx          # Main admin landing page
├── components/                 # Shared admin components
│   ├── AdminLayout.tsx         # Admin-specific layout wrapper
│   ├── AdminNavigation.tsx     # Admin navigation menu
│   └── PermissionGuard.tsx     # Role-based access control
├── SqlConsole/                 # SQL query interface
├── LogViewer/                  # Real-time log viewer
├── ApiMonitor/                 # API testing and monitoring
├── SystemHealth/               # Health metrics dashboard
└── SchemaExplorer/             # Database schema browser
```

### Backend Extensions
```
src/api/src/routes/admin/       # Admin-specific API routes
├── index.js                    # Admin routes aggregator
├── sql.routes.js               # SQL execution endpoints
├── logs.routes.js              # Log streaming endpoints
├── health.routes.js            # System health endpoints
├── schema.routes.js            # Database schema endpoints
└── middleware/
    ├── adminAuth.js            # Admin role verification
    ├── sqlSafety.js            # SQL query validation
    └── auditLogger.js          # Admin action logging
```

### Database Schema Extensions
```sql
-- Extend existing users table
ALTER TABLE users ADD COLUMN admin_level VARCHAR(20) DEFAULT 'none';
-- Values: 'none', 'read_only', 'admin', 'super_admin'

-- Admin activity logging
CREATE TABLE admin_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_details JSONB,
    ip_address INET,
    user_agent TEXT,
    tenant_id VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query history storage
CREATE TABLE admin_query_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    query_text TEXT NOT NULL,
    execution_time_ms INTEGER,
    rows_affected INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    tenant_id VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Implementation

### Access Control
- **Role Verification**: Middleware to verify admin privileges on all admin routes
- **Audit Logging**: Comprehensive logging of all admin actions
- **Session Validation**: Enhanced session checking for admin operations
- **IP Logging**: Track IP addresses for admin activities

### SQL Safety Measures
- **Query Parsing**: Analyze queries for destructive operations
- **Whitelist Approach**: Pre-approved query patterns for sensitive operations
- **Transaction Control**: Automatic rollback capabilities for data modifications
- **Read-Only Mode**: Toggle for limiting to SELECT operations only

### API Security
- **Rate Limiting**: Prevent abuse of resource-intensive admin operations
- **Request Validation**: Strict input validation for all admin endpoints
- **CORS Configuration**: Appropriate CORS settings for admin routes
- **Authentication Headers**: Enhanced token validation for admin operations

## Integration Points

### Navigation Integration
- Add "Admin Portal" menu item in main navigation
- Role-based visibility using existing AuthContext
- Breadcrumb navigation for admin sections
- Quick access toolbar for common admin tasks

### Authentication Integration
- Extend existing user roles with admin levels
- Leverage current JWT token system
- Maintain session consistency across admin and regular features
- Role-based component rendering

### Styling Integration
- Consistent Material-UI theme application
- Existing color palette and typography
- Responsive design patterns
- Dark/light theme support if implemented

## Development Phases

### Phase 1: Foundation (Week 1-2)
**Deliverables**:
- [ ] Extend user authentication with admin roles
- [ ] Create admin route structure and navigation
- [ ] Implement basic admin dashboard layout
- [ ] Set up admin-specific middleware and security

**Files to Create/Modify**:
- `src/dashboard/src/pages/Admin/AdminDashboard.tsx`
- `src/api/src/routes/admin/index.js`
- `src/api/src/middleware/adminAuth.js`
- Database migration for admin roles

### Phase 2: Core Features (Week 3-5)
**Deliverables**:
- [ ] SQL console with query execution
- [ ] Basic system health monitoring
- [ ] Database schema explorer
- [ ] Admin activity logging

**Priority Order**:
1. SQL Console (highest priority)
2. System Health Dashboard
3. Database Schema Explorer

### Phase 3: Advanced Features (Week 6-8)
**Deliverables**:
- [ ] Real-time log streaming
- [ ] API endpoint discovery and testing
- [ ] Advanced health metrics and alerting
- [ ] Export capabilities across all features

### Phase 4: Polish and Optimization (Week 9-10)
**Deliverables**:
- [ ] Performance optimizations
- [ ] Advanced security features
- [ ] User experience enhancements
- [ ] Comprehensive testing and documentation

## Success Metrics

### Functional Requirements
- [ ] Admin users can execute SQL queries safely
- [ ] Real-time logs are viewable and searchable
- [ ] API endpoints are discoverable and testable
- [ ] System health metrics are accurate and timely
- [ ] Database schema is browsable and informative

### Performance Requirements
- [ ] SQL query execution under 5 seconds for typical queries
- [ ] Log streaming with less than 1 second latency
- [ ] Health dashboard updates every 30 seconds
- [ ] Schema explorer loads under 3 seconds

### Security Requirements
- [ ] All admin actions are logged and auditable
- [ ] SQL injection prevention is effective
- [ ] Role-based access control is enforced
- [ ] No unauthorized access to admin features

## Risk Assessment

### High Risk
- **SQL Injection**: Mitigated by parameterized queries and validation
- **Data Exposure**: Controlled by role-based access and audit logging
- **Performance Impact**: Managed by rate limiting and query optimization

### Medium Risk
- **UI Complexity**: Addressed by phased development and user testing
- **Integration Issues**: Minimized by leveraging existing patterns
- **Scalability**: Monitored through performance metrics

### Low Risk
- **Browser Compatibility**: Handled by existing React/Material-UI stack
- **Maintenance Overhead**: Reduced by consistent architecture patterns

## Future Enhancements

### Potential Phase 5+ Features
- **Advanced Analytics**: Custom dashboards and reporting
- **Automated Alerts**: Configurable system alerts and notifications
- **Backup Management**: Database backup and restore capabilities
- **User Management**: Advanced user administration features
- **Integration APIs**: External tool integration capabilities

## Conclusion

This Admin Portal design provides a comprehensive, secure, and user-friendly administrative interface that integrates seamlessly with the existing Trusted360 platform. The phased approach ensures manageable development while delivering immediate value to system administrators and developers.

The design prioritizes security, usability, and maintainability while providing powerful tools for system management and troubleshooting. Implementation can begin immediately following approval of this specification.
