const express = require('express');
const { knex: db } = require('../../database');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * Execute SQL query
 * POST /admin/sql/execute
 */
router.post('/execute', async (req, res) => {
  try {
    const { query } = req.body;
    const { user, isReadOnly } = req;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query cannot be empty'
      });
    }

    // Basic safety checks for read-only users
    if (isReadOnly) {
      const queryLower = trimmedQuery.toLowerCase();
      const readOnlyCommands = ['select', 'show', 'describe', 'explain'];
      const isReadOnlyQuery = readOnlyCommands.some(cmd => queryLower.startsWith(cmd));
      
      if (!isReadOnlyQuery) {
        logger.warn(`Read-only user ${user.id} attempted non-SELECT query: ${trimmedQuery.substring(0, 100)}`);
        return res.status(403).json({
          success: false,
          error: 'Read-only users can only execute SELECT, SHOW, DESCRIBE, and EXPLAIN queries'
        });
      }
    }

    // Additional safety checks for destructive operations
    const queryLower = trimmedQuery.toLowerCase();
    const dangerousKeywords = ['drop', 'truncate', 'delete from users', 'delete from sessions'];
    const hasDangerousKeyword = dangerousKeywords.some(keyword => queryLower.includes(keyword));
    
    if (hasDangerousKeyword && user.admin_level !== 'super_admin') {
      logger.warn(`User ${user.id} (${user.admin_level}) attempted potentially dangerous query: ${trimmedQuery.substring(0, 100)}`);
      return res.status(403).json({
        success: false,
        error: 'This query contains potentially dangerous operations. Super admin privileges required.'
      });
    }

    // Log the query execution for audit purposes
    logger.info(`SQL query executed by user ${user.id} (${user.email}, ${user.admin_level}): ${trimmedQuery.substring(0, 200)}`);

    const startTime = Date.now();
    let result;

    try {
      // Execute the query
      result = await db.raw(trimmedQuery);
      
      const executionTime = Date.now() - startTime;
      
      // Handle different types of query results
      let rows = [];
      let rowCount = 0;

      if (result && result.rows) {
        // PostgreSQL result format
        rows = result.rows;
        rowCount = result.rowCount || rows.length;
      } else if (Array.isArray(result)) {
        // Some queries return arrays directly
        rows = result;
        rowCount = rows.length;
      } else if (result && typeof result === 'object') {
        // Handle other result formats
        rows = [result];
        rowCount = 1;
      }

      // Log successful execution
      logger.info(`SQL query completed successfully for user ${user.id} - ${rowCount} rows, ${executionTime}ms`);

      res.json({
        success: true,
        rows,
        rowCount,
        executionTime,
        query: trimmedQuery
      });

    } catch (queryError) {
      const executionTime = Date.now() - startTime;
      
      // Log query error
      logger.error(`SQL query failed for user ${user.id}: ${queryError.message}`);
      
      res.status(400).json({
        success: false,
        error: queryError.message,
        executionTime,
        query: trimmedQuery
      });
    }

  } catch (error) {
    logger.error(`SQL execution endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get query history (if we implement it later)
 * GET /admin/sql/history
 */
router.get('/history', async (req, res) => {
  try {
    // For now, return empty array
    // Later we can implement query history storage in database
    res.json({
      success: true,
      history: []
    });
  } catch (error) {
    logger.error(`SQL history endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
