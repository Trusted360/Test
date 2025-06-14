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
const { setupRedis } = require('./services/redis');
const logger = require('./utils/logger');
const { User } = require('./models');
const Session = require('./models/session.model');
const UserActivity = require('./models/user-activity.model');
const AuthService = require('./services/auth.service');
const PropertyService = require('./services/property.service');
const ChecklistService = require('./services/checklist.service');
const VideoAnalysisService = require('./services/videoAnalysis.service');
const ChatService = require('./services/chat.service');
const emailService = require('./services/email.service');

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
  
  // Initialize PropertyService with database connection
  const propertyServiceInstance = new PropertyService(db);
  
  // Initialize ChecklistService with database connection
  const checklistServiceInstance = new ChecklistService(db);
  
  // Initialize VideoAnalysisService with database connection
  const videoAnalysisServiceInstance = new VideoAnalysisService(db);
  
  // Initialize ChatService with database connection
  const chatServiceInstance = new ChatService(db);
  
  logger.info('Services initialized');
  
  const services = {
    authService: authServiceInstance,
    PropertyService: propertyServiceInstance,
    ChecklistService: checklistServiceInstance,
    VideoAnalysisService: videoAnalysisServiceInstance,
    ChatService: chatServiceInstance,
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
    db = await setupDatabase();
    logger.info('Database connection established');

    await setupRedis();
    logger.info('Redis connection established');

    const services = initializeServices(db);
    
    // Setup routes with services
    const appRoutes = routesFn(services); // Call the routes function with services
    app.use('/api', appRoutes); // Mount the configured routes

    resolvers._services = services;

    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`GraphQL endpoint available at http://localhost:${config.port}/graphql`);
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
    process.exit(1);
  }
}

// Only start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
