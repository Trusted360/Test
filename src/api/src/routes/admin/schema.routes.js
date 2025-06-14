const express = require('express');
const db = require('../../database');

const router = express.Router();

// Get all tables in the database
router.get('/tables', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.table_name,
        t.table_type,
        COALESCE(s.n_tup_ins, 0) as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as table_size,
        obj_description(c.oid) as table_comment
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;

    const result = await db.raw(query);
    
    res.json({
      success: true,
      tables: result.rows
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database tables'
    });
  }
});

// Get detailed information about a specific table
router.get('/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;

    // Get column information
    const columnsQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        c.ordinal_position,
        CASE 
          WHEN pk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_primary_key,
        CASE 
          WHEN fk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name,
        col_description(pgc.oid, c.ordinal_position) as column_comment
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1 
          AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.column_name = fk.column_name
      LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
      WHERE c.table_name = $1
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position;
    `;

    // Get indexes
    const indexesQuery = `
      SELECT 
        i.indexname,
        i.indexdef,
        CASE WHEN i.indexname LIKE '%_pkey' THEN true ELSE false END as is_primary,
        CASE WHEN ix.indisunique THEN true ELSE false END as is_unique
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.tablename
      JOIN pg_index ix ON ix.indexrelid = (
        SELECT oid FROM pg_class WHERE relname = i.indexname
      )
      WHERE i.tablename = $1
        AND i.schemaname = 'public'
      ORDER BY i.indexname;
    `;

    // Get constraints
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      LEFT JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = $1
        AND tc.table_schema = 'public'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `;

    // Get table statistics
    const statsQuery = `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        most_common_vals,
        most_common_freqs
      FROM pg_stats 
      WHERE tablename = $1 
        AND schemaname = 'public'
      ORDER BY attname;
    `;

    const [columns, indexes, constraints, stats] = await Promise.all([
      db.raw(columnsQuery, [tableName]),
      db.raw(indexesQuery, [tableName]),
      db.raw(constraintsQuery, [tableName]),
      db.raw(statsQuery, [tableName])
    ]);

    res.json({
      success: true,
      table: {
        name: tableName,
        columns: columns.rows,
        indexes: indexes.rows,
        constraints: constraints.rows,
        statistics: stats.rows
      }
    });
  } catch (error) {
    console.error('Error fetching table details:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch details for table: ${req.params.tableName}`
    });
  }
});

// Get database relationships/foreign keys
router.get('/relationships', async (req, res) => {
  try {
    const query = `
      SELECT 
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const result = await db.raw(query);
    
    res.json({
      success: true,
      relationships: result.rows
    });
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database relationships'
    });
  }
});

// Get migration history
router.get('/migrations', async (req, res) => {
  try {
    // Check if knex_migrations table exists
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    
    if (!migrationTableExists) {
      return res.json({
        success: true,
        migrations: [],
        message: 'No migration table found'
      });
    }

    const migrations = await db('knex_migrations')
      .select('*')
      .orderBy('batch', 'desc')
      .orderBy('migration_time', 'desc');

    res.json({
      success: true,
      migrations
    });
  } catch (error) {
    console.error('Error fetching migrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch migration history'
    });
  }
});

// Get database size and statistics
router.get('/statistics', async (req, res) => {
  try {
    // Database size
    const dbSizeQuery = `
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;
    `;

    // Table sizes
    const tableSizesQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `;

    // Connection stats
    const connectionStatsQuery = `
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `;

    // Database activity
    const activityQuery = `
      SELECT 
        datname,
        numbackends,
        xact_commit,
        xact_rollback,
        blks_read,
        blks_hit,
        tup_returned,
        tup_fetched,
        tup_inserted,
        tup_updated,
        tup_deleted
      FROM pg_stat_database 
      WHERE datname = current_database();
    `;

    const [dbSize, tableSizes, connectionStats, activity] = await Promise.all([
      db.raw(dbSizeQuery),
      db.raw(tableSizesQuery),
      db.raw(connectionStatsQuery),
      db.raw(activityQuery)
    ]);

    res.json({
      success: true,
      statistics: {
        database_size: dbSize.rows[0],
        table_sizes: tableSizes.rows,
        connections: connectionStats.rows[0],
        activity: activity.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching database statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database statistics'
    });
  }
});

// Generate ER diagram data
router.get('/er-diagram', async (req, res) => {
  try {
    // Get all tables with their columns
    const tablesQuery = `
      SELECT 
        t.table_name,
        json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'is_primary_key', CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END,
            'is_foreign_key', CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT kcu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ) fk ON t.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
      GROUP BY t.table_name
      ORDER BY t.table_name;
    `;

    // Get relationships
    const relationshipsQuery = `
      SELECT 
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `;

    const [tables, relationships] = await Promise.all([
      db.raw(tablesQuery),
      db.raw(relationshipsQuery)
    ]);

    res.json({
      success: true,
      diagram: {
        tables: tables.rows,
        relationships: relationships.rows
      }
    });
  } catch (error) {
    console.error('Error generating ER diagram data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate ER diagram data'
    });
  }
});

// Execute schema operations (CREATE, ALTER, DROP)
router.post('/execute', async (req, res) => {
  try {
    const { operation, sql, confirm } = req.body;

    // Safety check for destructive operations
    const destructiveOperations = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
    const isDestructive = destructiveOperations.some(op => 
      sql.toUpperCase().includes(op)
    );

    if (isDestructive && !confirm) {
      return res.status(400).json({
        success: false,
        error: 'Destructive operation requires confirmation',
        requires_confirmation: true
      });
    }

    // Execute the SQL
    const result = await db.raw(sql);

    // Log the operation
    console.log(`Schema operation executed by user: ${req.user?.email}`, {
      operation,
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      result: {
        command: result.command,
        rowCount: result.rowCount,
        rows: result.rows || []
      },
      message: 'Schema operation executed successfully'
    });
  } catch (error) {
    console.error('Error executing schema operation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute schema operation'
    });
  }
});

// Validate SQL syntax
router.post('/validate', async (req, res) => {
  try {
    const { sql } = req.body;

    // Basic SQL validation
    const validation = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // Check for common issues
    if (!sql || sql.trim().length === 0) {
      validation.isValid = false;
      validation.errors.push('SQL statement is empty');
    }

    // Check for potentially dangerous operations
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA/i,
      /TRUNCATE\s+\*/i,
      /DELETE\s+FROM\s+\w+\s*;?\s*$/i // DELETE without WHERE
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(sql)) {
        validation.warnings.push('Potentially dangerous operation detected');
      }
    });

    // Try to explain the query (this validates syntax without executing)
    try {
      await db.raw(`EXPLAIN ${sql}`);
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(error.message);
    }

    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Error validating SQL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate SQL'
    });
  }
});

module.exports = router;
