const winston = require('winston');
const config = require('../config');

// Enhanced logger that captures detailed execution context
class EnhancedLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'trusted360-api' },
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      ]
    });

    if (config.nodeEnv !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  // Enhanced logging methods with detailed context
  logDatabaseOperation(operation, table, details = {}) {
    this.logger.info('Database Operation Executed', {
      operation_type: operation,
      table_name: table,
      execution_context: {
        query_type: details.queryType || 'UNKNOWN',
        affected_rows: details.affectedRows || 0,
        execution_time_ms: details.executionTime || 0,
        parameters: details.parameters || {},
        user_id: details.userId || null,
        session_id: details.sessionId || null
      },
      performance_metrics: {
        query_complexity: details.complexity || 'simple',
        index_usage: details.indexUsage || 'unknown',
        memory_usage_kb: details.memoryUsage || 0
      },
      security_context: {
        ip_address: details.ipAddress || 'unknown',
        user_agent: details.userAgent || 'unknown',
        authentication_method: details.authMethod || 'unknown'
      }
    });
  }

  logAPIRequest(method, endpoint, details = {}) {
    this.logger.info('API Request Processed', {
      http_method: method,
      endpoint: endpoint,
      execution_context: {
        request_id: details.requestId || 'unknown',
        user_id: details.userId || null,
        response_status: details.status || 200,
        response_time_ms: details.responseTime || 0,
        payload_size_bytes: details.payloadSize || 0
      },
      business_logic: {
        operation_performed: details.operation || 'unknown',
        data_modified: details.dataModified || false,
        validation_errors: details.validationErrors || [],
        business_rules_applied: details.businessRules || []
      },
      technical_details: {
        middleware_chain: details.middlewareChain || [],
        database_queries: details.dbQueries || 0,
        cache_hits: details.cacheHits || 0,
        external_api_calls: details.externalCalls || 0
      }
    });
  }

  logAuthenticationEvent(event, details = {}) {
    this.logger.info('Authentication Event', {
      auth_event: event,
      execution_context: {
        user_id: details.userId || null,
        email: details.email || 'unknown',
        success: details.success || false,
        failure_reason: details.failureReason || null,
        attempt_number: details.attemptNumber || 1
      },
      security_analysis: {
        ip_address: details.ipAddress || 'unknown',
        user_agent: details.userAgent || 'unknown',
        geolocation: details.geolocation || 'unknown',
        device_fingerprint: details.deviceFingerprint || 'unknown',
        risk_score: details.riskScore || 0
      },
      session_management: {
        session_id: details.sessionId || null,
        session_duration_minutes: details.sessionDuration || 0,
        concurrent_sessions: details.concurrentSessions || 0,
        last_activity: details.lastActivity || new Date().toISOString()
      }
    });
  }

  logSystemEvent(event, details = {}) {
    this.logger.info('System Event', {
      system_event: event,
      execution_context: {
        component: details.component || 'unknown',
        operation: details.operation || 'unknown',
        success: details.success || true,
        error_message: details.errorMessage || null
      },
      resource_usage: {
        cpu_usage_percent: details.cpuUsage || 0,
        memory_usage_mb: details.memoryUsage || 0,
        disk_usage_percent: details.diskUsage || 0,
        network_io_kb: details.networkIO || 0
      },
      performance_metrics: {
        response_time_ms: details.responseTime || 0,
        throughput_requests_per_second: details.throughput || 0,
        error_rate_percent: details.errorRate || 0,
        availability_percent: details.availability || 100
      }
    });
  }

  logBusinessProcess(process, details = {}) {
    this.logger.info('Business Process Executed', {
      process_name: process,
      execution_context: {
        process_id: details.processId || 'unknown',
        user_id: details.userId || null,
        start_time: details.startTime || new Date().toISOString(),
        end_time: details.endTime || new Date().toISOString(),
        duration_ms: details.duration || 0
      },
      business_data: {
        entities_processed: details.entitiesProcessed || 0,
        data_volume_mb: details.dataVolume || 0,
        business_rules_executed: details.businessRules || [],
        validation_results: details.validationResults || {}
      },
      workflow_steps: {
        steps_completed: details.stepsCompleted || [],
        current_step: details.currentStep || 'unknown',
        next_step: details.nextStep || 'unknown',
        decision_points: details.decisionPoints || []
      }
    });
  }

  // Error logging with detailed context
  logError(error, context = {}) {
    this.logger.error('Application Error', {
      error_message: error.message,
      error_stack: error.stack,
      error_type: error.constructor.name,
      execution_context: {
        component: context.component || 'unknown',
        operation: context.operation || 'unknown',
        user_id: context.userId || null,
        request_id: context.requestId || 'unknown'
      },
      technical_details: {
        file_path: context.filePath || 'unknown',
        line_number: context.lineNumber || 0,
        function_name: context.functionName || 'unknown',
        parameters: context.parameters || {}
      },
      impact_analysis: {
        severity: context.severity || 'medium',
        affected_users: context.affectedUsers || 0,
        data_integrity_risk: context.dataIntegrityRisk || false,
        security_implications: context.securityImplications || false
      }
    });
  }

  // Standard winston methods for backward compatibility
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
}

module.exports = new EnhancedLogger();
