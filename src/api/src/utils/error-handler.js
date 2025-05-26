/**
 * Error handling utilities for Simmer API
 */
const logger = require('./logger');

/**
 * Custom error classes
 */
class SimmerError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class OllamaApiError extends SimmerError {
  constructor(message, details = {}) {
    super(`Ollama API Error: ${message}`, 502, details);
    this.name = 'OllamaApiError';
  }
}

class ModelNotFoundError extends OllamaApiError {
  constructor(modelName) {
    super(`Model '${modelName}' not found`, { modelName });
    this.name = 'ModelNotFoundError';
    this.statusCode = 404;
  }
}

class ModelInferenceError extends OllamaApiError {
  constructor(message, details = {}) {
    super(`Inference error: ${message}`, details);
    this.name = 'ModelInferenceError';
  }
}

class ResponseParsingError extends OllamaApiError {
  constructor(message, details = {}) {
    super(`Response parsing error: ${message}`, details);
    this.name = 'ResponseParsingError';
  }
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Set default values
  const statusCode = err.statusCode || 500;
  const error = {
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    details: err.details || {}
  };

  // Log the error
  if (statusCode >= 500) {
    logger.error(`${err.name || 'Error'}: ${err.message}`, {
      error: err,
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
      }
    });
  } else {
    logger.warn(`${err.name || 'Error'}: ${err.message}`, {
      statusCode,
      request: {
        method: req.method,
        url: req.originalUrl
      }
    });
  }

  // Send the error response
  res.status(statusCode).json({
    success: false,
    error
  });
}

/**
 * Async route handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Map Ollama API errors to specific error types
 */
function mapOllamaError(error) {
  const status = error.response?.status;
  const message = error.message;
  const data = error.response?.data;

  // Specific error mapping based on status codes
  if (status === 404) {
    // Check if error is related to model not found
    if (message.includes('model') || (data && data.error && data.error.includes('model'))) {
      const modelNameMatch = message.match(/model ['"]([^'"]+)['"]/);
      const modelName = modelNameMatch ? modelNameMatch[1] : 'unknown';
      return new ModelNotFoundError(modelName);
    }
  } else if (status === 500) {
    return new ModelInferenceError('Internal server error from Ollama', { 
      originalMessage: message,
      data
    });
  } else if (status === 408 || message.includes('timeout')) {
    return new OllamaApiError('Request timeout - model inference taking too long', {
      originalMessage: message
    });
  } else if (error.code === 'ECONNREFUSED') {
    return new OllamaApiError('Connection refused - Ollama service may be down', {
      originalMessage: message
    });
  }

  // Generic Ollama API error
  return new OllamaApiError(message, {
    status,
    data
  });
}

module.exports = {
  // Error classes
  SimmerError,
  OllamaApiError,
  ModelNotFoundError,
  ModelInferenceError,
  ResponseParsingError,
  
  // Error handlers
  errorHandler,
  asyncHandler,
  mapOllamaError
}; 