const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { graphqlHTTP } = require('express-graphql');

const config = require('./config');
const schema = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const routesFn = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { setupDatabase } = require('./database');
const logger = require('./utils/logger');
const { User } = require('./models');
const Session = require('./models/session.model');
const UserActivity = require('./models/user-activity.model');
const AuthService = require('./services/auth.service');
const PropertyService = require('./services/property.service');
const ChecklistService = require('./services/checklist.service');
const VideoAnalysisService = require('./services/videoAnalysis.service');
const ChatService = require('./services/chat.service');
const AuditService = require('./services/audit.service');
const SOPService = require('./services/sop.service');
const SOPModel = require('./models/sop.model');
const SchedulerService = require('./services/scheduler.service');
const emailService = require('./services/email.service');
const auditMiddleware = require('./middleware/auditMiddleware');

// Initialize service instances
let db;
let userModel;
let sessionModel;
let userActivityModel;
let authServiceInstance;

// Initialize Express app
const app = express();

// Apply middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(cors({
  origin: ['http://localhost:8088', 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  credentials: true,
  exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', api: true });
});

// Direct test route
app.get('/directtest', (req, res) => {
  res.json({ test: 'direct', time: new Date().toISOString() });
});

// API test route
app.get('/api/directtest', (req, res) => {
  res.json({ test: 'api-direct', time: new Date().toISOString() });
});

// API routes - mount the routes with the /api prefix
// app.use('/api', routes); // Old way

// Initialize services and inject them into resolvers context
function initializeServices(db) {
  userModel = new User(db);
  sessionModel = new Session(db);
  userActivityModel = new UserActivity(db);
  
  authServiceInstance = AuthService.initialize(userModel, sessionModel, userActivityModel, emailService);
  
  // Initialize AuditService with database connection
  const auditServiceInstance = new AuditService(db);
  
  // Inject audit service into auth service after initialization
  if (authServiceInstance) {
    authServiceInstance.auditService = auditServiceInstance;
  }
  
  // Initialize PropertyService with database connection and inject audit service
  const propertyServiceInstance = new PropertyService(db);
  propertyServiceInstance.auditService = auditServiceInstance;
  
  // Initialize ChecklistService with database connection and inject audit service
  const checklistServiceInstance = new ChecklistService(db);
  checklistServiceInstance.auditService = auditServiceInstance;
  
  // Initialize VideoAnalysisService with database connection and inject audit service
  const videoAnalysisServiceInstance = new VideoAnalysisService(db);
  videoAnalysisServiceInstance.auditService = auditServiceInstance;
  
  // Initialize ChatService with database connection
  const chatServiceInstance = new ChatService(db);
  
  // Initialize SOP model and service
  let sopServiceInstance;
  try {
    const sopModelInstance = new SOPModel(db);
    sopServiceInstance = new SOPService(sopModelInstance);
    sopServiceInstance.auditService = auditServiceInstance;
    logger.info('SOP service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize SOP service:', error);
    throw error;
  }
  
  // Initialize SchedulerService with database connection and checklist service
  const schedulerServiceInstance = new SchedulerService(db, checklistServiceInstance);
  
  logger.info('Services initialized');
  
  const services = {
    authService: authServiceInstance,
    PropertyService: propertyServiceInstance,
    ChecklistService: checklistServiceInstance,
    VideoAnalysisService: videoAnalysisServiceInstance,
    ChatService: chatServiceInstance,
    AuditService: auditServiceInstance,
    sopService: sopServiceInstance,
    SchedulerService: schedulerServiceInstance,
    // Make other models/services available if needed by other routes
    userModel,
    sessionModel,
    userActivityModel
  };
  return services;
}

// GraphQL endpoint
app.use('/graphql', graphqlHTTP((req) => {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  return {
    schema,
    rootValue: resolvers,
    graphiql: true, // Enable GraphiQL for easy testing
    context: { 
      tenantId: tenantId,
      user: req.user,
      services: {
        authService: authServiceInstance
      }
    },
    customFormatErrorFn: (err) => {
      logger.error('GraphQL Error:', err);
      // Return a more client-friendly error
      return {
        message: err.message,
        locations: err.locations,
        path: err.path
      };
    }
  };
}));

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Conditionally setup database
    if (process.env.SKIP_DATABASE !== 'true') {
      db = await setupDatabase();
      logger.info('Database connection established');
    } else {
      logger.info('Database setup skipped (SKIP_DATABASE=true)');
      // Create a mock database object for services that expect it
      db = {
        query: () => Promise.resolve([]),
        raw: () => Promise.resolve([]),
        select: () => Promise.resolve([]),
        insert: () => Promise.resolve([]),
        update: () => Promise.resolve([]),
        delete: () => Promise.resolve([])
      };
    }

    // Redis has been completely removed from the application
    logger.info('Redis removed - application now uses direct database queries');

    const services = initializeServices(db);
    
    // Only start scheduler if database is available
    if (process.env.SKIP_DATABASE !== 'true') {
      services.SchedulerService.start(60); // Run every hour
      logger.info('Checklist scheduler started');
    } else {
      logger.info('Scheduler skipped (SKIP_DATABASE=true)');
    }
    
    // Apply audit middleware to capture request context
    app.use('/api', auditMiddleware(services.AuditService));
    
    // Setup routes with services
    try {
      const appRoutes = routesFn(services); // Call the routes function with services
      app.use('/api', appRoutes); // Mount the configured routes
      logger.info('All routes registered successfully');
    } catch (error) {
      logger.error('Failed to register routes:', error);
      throw error;
    }

    resolvers._services = services;

    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`GraphQL endpoint available at http://localhost:${config.port}/graphql`);
      if (process.env.SKIP_DATABASE === 'true') {
        logger.info('Running in no-database mode - some features may be limited');
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Log more details about the error
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    if (error.code) {
      logger.error('Error code:', error.code);
    }
    if (error.message) {
      logger.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

// Only start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };