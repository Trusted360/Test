require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const config = {
  // Server configuration
  port: process.env.API_PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://simmer.home',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    }
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-key',
    expiresIn: process.env.JWT_EXPIRATION || '24h'
  },
  
  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // External services
  ollama: {
    url: process.env.OLLAMA_URL || 'http://ollama-backend:11434'
  },
  
  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || '"Trusted 360 App" <noreply@trusted360.app>'
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'development-session-secret-key',
    expiresInDays: parseInt(process.env.SESSION_EXPIRATION_DAYS) || 14
  },
  
  // Multi-tenancy
  defaultTenant: process.env.DEFAULT_TENANT || 'default',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Validate required configuration
function validateConfig() {
  const requiredVars = [
    'database.url',
    'redis.url',
    'jwt.secret'
  ];
  
  const missingVars = requiredVars.filter(path => {
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
      if (current[key] === undefined || current[key] === null || current[key] === '') {
        return true;
      }
      current = current[key];
    }
    
    return false;
  });
  
  if (missingVars.length > 0) {
    if (config.nodeEnv === 'production') {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    } else {
      console.warn(`Warning: Missing recommended environment variables: ${missingVars.join(', ')}`);
    }
  }
}

// Only validate in production to allow development without all variables
if (config.nodeEnv === 'production') {
  validateConfig();
}

module.exports = config;
