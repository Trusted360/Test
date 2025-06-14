const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const { knex: db } = require('../../database');
const logger = require('../../utils/logger');

const router = express.Router();

// Get available log sources
router.get('/sources', async (req, res) => {
  try {
    const logSources = [
      {
        id: 'api',
        name: 'API Server',
        description: 'Application server logs',
        available: true
      },
      {
        id: 'database',
        name: 'Database',
        description: 'PostgreSQL logs',
        available: true
      },
      {
        id: 'auth',
        name: 'Authentication',
        description: 'Login and session logs',
        available: true
      },
      {
        id: 'system',
        name: 'System',
        description: 'Docker and system logs',
        available: true
      }
    ];

    res.json({
      success: true,
      sources: logSources
    });
  } catch (error) {
    logger.error('Error fetching log sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log sources'
    });
  }
});

// Get logs with filtering
router.get('/', async (req, res) => {
  try {
    const {
      source = 'api',
      level = 'all',
      limit = 100,
      search = '',
      since = ''
    } = req.query;

    let logs = [];

    switch (source) {
      case 'api':
        logs = await readWinstonLogs(parseInt(limit), level, search, since);
        break;
      case 'database':
        logs = await readDatabaseLogs(parseInt(limit), level, search, since);
        break;
      case 'auth':
        logs = await readAuthLogs(parseInt(limit), level, search, since);
        break;
      case 'system':
        logs = await readSystemLogs(parseInt(limit), level, search, since);
        break;
      default:
        logs = await readWinstonLogs(parseInt(limit), level, search, since);
    }

    res.json({
      success: true,
      logs,
      total: logs.length,
      source,
      level,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

// Get Docker container logs
router.get('/docker/:container', async (req, res) => {
  try {
    const { container } = req.params;
    const { lines = 100 } = req.query;

    // Execute docker logs command
    const dockerLogs = await getDockerLogs(container, lines);

    res.json({
      success: true,
      logs: dockerLogs,
      container,
      lines: parseInt(lines)
    });
  } catch (error) {
    logger.error('Error fetching Docker logs:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch logs for container: ${req.params.container}`
    });
  }
});

// Stream logs via Server-Sent Events
router.get('/stream', async (req, res) => {
  const { source = 'api', level = 'all', token } = req.query;

  // Handle authentication for EventSource (which can't send custom headers)
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const config = require('../../config');
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Add user info to request for admin auth middleware
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        admin_level: decoded.admin_level,
        tenantId: decoded.tenantId || 'default'
      };
    } catch (error) {
      logger.error('Token verification failed for streaming:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
  }

  // Check admin privileges
  if (!req.user.admin_level || req.user.admin_level === 'none') {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: `Connected to ${source} log stream`,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Stream real logs instead of fake ones
  const streamInterval = setInterval(async () => {
    try {
      const recentLogs = await readWinstonLogs(1, level, '', '');
      if (recentLogs.length > 0) {
        res.write(`data: ${JSON.stringify({
          type: 'log',
          ...recentLogs[0]
        })}\n\n`);
      }
    } catch (error) {
      logger.error('Error streaming logs:', error);
    }
  }, 5000); // Check for new logs every 5 seconds

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(streamInterval);
    res.end();
  });
});

// Export logs
router.post('/export', async (req, res) => {
  try {
    const {
      source = 'api',
      level = 'all',
      format = 'json',
      limit = 1000,
      search = ''
    } = req.body;

    let logs = [];
    switch (source) {
      case 'api':
        logs = await readWinstonLogs(parseInt(limit), level, search, '');
        break;
      case 'database':
        logs = await readDatabaseLogs(parseInt(limit), level, search, '');
        break;
      case 'auth':
        logs = await readAuthLogs(parseInt(limit), level, search, '');
        break;
      case 'system':
        logs = await readSystemLogs(parseInt(limit), level, search, '');
        break;
      default:
        logs = await readWinstonLogs(parseInt(limit), level, search, '');
    }

    if (format === 'csv') {
      const csv = convertLogsToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="logs-${source}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="logs-${source}-${Date.now()}.json"`);
      res.json({
        exported_at: new Date().toISOString(),
        source,
        level,
        total_entries: logs.length,
        logs
      });
    }
  } catch (error) {
    logger.error('Error exporting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export logs'
    });
  }
});

// Real log reading functions
async function readWinstonLogs(limit, level, search, since) {
  const logs = [];
  const logFiles = ['logs/combined.log', 'logs/error.log'];
  
  for (const logFile of logFiles) {
    try {
      const logPath = path.join(process.cwd(), logFile);
      const fileExists = await fs.access(logPath).then(() => true).catch(() => false);
      
      if (!fileExists) {
        continue;
      }
      
      const fileStream = require('fs').createReadStream(logPath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      const fileLines = [];
      for await (const line of rl) {
        if (line.trim()) {
          fileLines.push(line);
        }
      }
      
      // Process last N lines (most recent)
      const recentLines = fileLines.slice(-limit * 2);
      
      for (const line of recentLines) {
        try {
          const logEntry = JSON.parse(line);
          
          // Apply level filter
          if (level !== 'all' && logEntry.level !== level) {
            continue;
          }
          
          // Apply search filter
          if (search && !logEntry.message.toLowerCase().includes(search.toLowerCase())) {
            continue;
          }
          
          // Apply since filter
          if (since && new Date(logEntry.timestamp) < new Date(since)) {
            continue;
          }
          
          logs.push({
            id: `winston_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: logEntry.timestamp,
            level: logEntry.level,
            source: 'api',
            message: logEntry.message,
            details: {
              service: logEntry.service || 'trusted360-api',
              ...logEntry.meta
            }
          });
          
          if (logs.length >= limit) {
            break;
          }
        } catch (parseError) {
          // Handle non-JSON log lines
          const timestamp = new Date().toISOString();
          logs.push({
            id: `winston_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            level: 'info',
            source: 'api',
            message: line,
            details: { raw: true }
          });
        }
      }
    } catch (error) {
      logger.error(`Error reading log file ${logFile}:`, error);
    }
  }
  
  // If no logs found in files, return recent database activity logs
  if (logs.length === 0) {
    return await readDatabaseActivityLogs(limit, level, search, since);
  }
  
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

async function readDatabaseLogs(limit, level, search, since) {
  try {
    // Read from user_activities table for database-related logs
    let query = db('user_activities')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    if (since) {
      query = query.where('created_at', '>=', since);
    }
    
    const activities = await query;
    
    return activities.map(activity => ({
      id: `db_${activity.id}`,
      timestamp: activity.created_at,
      level: activity.action_type === 'error' ? 'error' : 'info',
      source: 'database',
      message: `${activity.action_type}: ${activity.description || activity.action_type}`,
      details: {
        user_id: activity.user_id,
        ip_address: activity.ip_address,
        user_agent: activity.user_agent,
        metadata: activity.metadata
      }
    })).filter(log => {
      if (level !== 'all' && log.level !== level) return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  } catch (error) {
    logger.error('Error reading database logs:', error);
    return await readDatabaseActivityLogs(limit, level, search, since);
  }
}

async function readAuthLogs(limit, level, search, since) {
  try {
    // Read authentication-related activities
    let query = db('user_activities')
      .select('*')
      .whereIn('action_type', ['login', 'logout', 'register', 'password_reset', 'email_verification', 'two_factor'])
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    if (since) {
      query = query.where('created_at', '>=', since);
    }
    
    const activities = await query;
    
    return activities.map(activity => ({
      id: `auth_${activity.id}`,
      timestamp: activity.created_at,
      level: activity.action_type.includes('fail') || activity.action_type.includes('error') ? 'error' : 'info',
      source: 'auth',
      message: `${activity.action_type}: ${activity.description || activity.action_type}`,
      details: {
        user_id: activity.user_id,
        ip_address: activity.ip_address,
        user_agent: activity.user_agent,
        metadata: activity.metadata
      }
    })).filter(log => {
      if (level !== 'all' && log.level !== level) return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  } catch (error) {
    logger.error('Error reading auth logs:', error);
    return [];
  }
}

async function readSystemLogs(limit, level, search, since) {
  try {
    // Try to get Docker container logs
    const containers = ['trusted360-api-1', 'trusted360-dashboard-1', 'trusted360-db-1'];
    const logs = [];
    
    for (const container of containers) {
      try {
        const containerLogs = await getDockerLogs(container, Math.ceil(limit / containers.length));
        logs.push(...containerLogs.map(log => ({
          ...log,
          source: 'system',
          level: log.message.toLowerCase().includes('error') ? 'error' : 
                 log.message.toLowerCase().includes('warn') ? 'warn' : 'info'
        })));
      } catch (error) {
        // Container might not exist, continue with others
        continue;
      }
    }
    
    return logs.filter(log => {
      if (level !== 'all' && log.level !== level) return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
      if (since && new Date(log.timestamp) < new Date(since)) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  } catch (error) {
    logger.error('Error reading system logs:', error);
    return [];
  }
}

async function readDatabaseActivityLogs(limit, level, search, since) {
  try {
    // Fallback: create some real activity logs from current database state
    const users = await db('users').select('id', 'email', 'created_at', 'last_login_at').limit(10);
    const sessions = await db('sessions').select('*').where('is_active', true).limit(10);
    
    const logs = [];
    
    // Add user creation logs
    users.forEach(user => {
      logs.push({
        id: `activity_user_${user.id}`,
        timestamp: user.created_at,
        level: 'info',
        source: 'api',
        message: `User account created: ${user.email}`,
        details: { user_id: user.id, email: user.email }
      });
      
      if (user.last_login_at) {
        logs.push({
          id: `activity_login_${user.id}`,
          timestamp: user.last_login_at,
          level: 'info',
          source: 'api',
          message: `User login: ${user.email}`,
          details: { user_id: user.id, email: user.email }
        });
      }
    });
    
    // Add session logs
    sessions.forEach(session => {
      logs.push({
        id: `activity_session_${session.id}`,
        timestamp: session.created_at,
        level: 'info',
        source: 'api',
        message: `Session created for user ${session.user_id}`,
        details: { 
          user_id: session.user_id, 
          session_id: session.id,
          ip_address: session.ip_address
        }
      });
    });
    
    return logs.filter(log => {
      if (level !== 'all' && log.level !== level) return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
      if (since && new Date(log.timestamp) < new Date(since)) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  } catch (error) {
    logger.error('Error reading database activity logs:', error);
    return [];
  }
}

// Helper function to get Docker logs
async function getDockerLogs(container, lines) {
  return new Promise((resolve, reject) => {
    const dockerProcess = spawn('docker', ['logs', '--tail', lines, container]);
    let output = '';
    let errorOutput = '';

    dockerProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    dockerProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        const logs = (output + errorOutput)
          .split('\n')
          .filter(line => line.trim())
          .map((line, index) => ({
            id: `docker_${container}_${index}`,
            timestamp: new Date().toISOString(),
            level: 'info',
            source: 'docker',
            message: line.trim(),
            container
          }));
        resolve(logs);
      } else {
        reject(new Error(`Docker logs command failed with code ${code}`));
      }
    });

    dockerProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper function to convert logs to CSV
function convertLogsToCSV(logs) {
  const headers = ['timestamp', 'level', 'source', 'message', 'details'];
  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = [
      log.timestamp,
      log.level,
      log.source,
      `"${log.message.replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

module.exports = router;
