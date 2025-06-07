import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  Download as ExportIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface QueryResult {
  rows: any[];
  rowCount: number;
  executionTime: number;
  query: string;
  timestamp: Date;
}

interface QueryHistory {
  query: string;
  timestamp: Date;
  success: boolean;
  rowCount?: number;
  executionTime?: number;
  error?: string;
}

const SqlConsole: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [history, setHistory] = useState<QueryHistory[]>(() => {
    const saved = localStorage.getItem('sql_console_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Check if user has admin access
  const hasAdminAccess = user?.admin_level && user.admin_level !== 'none';
  const isReadOnly = user?.admin_level === 'read_only';

  if (!hasAdminAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied: You do not have admin privileges to access the SQL console.
        </Alert>
      </Box>
    );
  }

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    // Basic safety check for read-only users
    if (isReadOnly && !query.trim().toLowerCase().startsWith('select')) {
      setError('Read-only users can only execute SELECT queries');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const startTime = Date.now();

    try {
      const response = await api.post('/admin/sql/execute', {
        query: query.trim()
      });

      const executionTime = Date.now() - startTime;
      const queryResult: QueryResult = {
        rows: response.data.rows || [],
        rowCount: response.data.rowCount || 0,
        executionTime,
        query: query.trim(),
        timestamp: new Date()
      };

      setResult(queryResult);

      // Add to history
      const historyEntry: QueryHistory = {
        query: query.trim(),
        timestamp: new Date(),
        success: true,
        rowCount: queryResult.rowCount,
        executionTime
      };

      const newHistory = [historyEntry, ...history.slice(0, 49)]; // Keep last 50
      setHistory(newHistory);
      localStorage.setItem('sql_console_history', JSON.stringify(newHistory));

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Query execution failed';
      setError(errorMessage);

      // Add failed query to history
      const historyEntry: QueryHistory = {
        query: query.trim(),
        timestamp: new Date(),
        success: false,
        error: errorMessage
      };

      const newHistory = [historyEntry, ...history.slice(0, 49)];
      setHistory(newHistory);
      localStorage.setItem('sql_console_history', JSON.stringify(newHistory));
    } finally {
      setLoading(false);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };

  const loadFromHistory = (historyQuery: string) => {
    setQuery(historyQuery);
    setActiveTab(0); // Switch back to query tab
  };

  const exportResults = () => {
    if (!result || !result.rows || result.rows.length === 0) return;

    try {
      const csv = [
        Object.keys(result.rows[0] || {}).join(','),
        ...result.rows.map(row => 
          Object.values(row).map(val => 
            typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
          ).join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_results_${new Date().toISOString().slice(0, 19)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error('Export error:', exportError);
      setError('Failed to export results');
    }
  };

  const sampleQueries = [
    'SELECT * FROM users LIMIT 10;',
    'SELECT COUNT(*) as total_users FROM users;',
    'SELECT role, admin_level, COUNT(*) as count FROM users GROUP BY role, admin_level;',
    'SELECT * FROM sessions WHERE is_active = true LIMIT 5;',
    'SHOW TABLES;'
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          SQL Console
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Execute SQL queries directly against the database
        </Typography>
        {isReadOnly && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Read-only mode: Only SELECT queries are allowed
          </Alert>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Query" />
          <Tab label={`History (${history.length})`} />
        </Tabs>
      </Box>

      {/* Query Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Query Input */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                SQL Query
              </Typography>
              <Tooltip title="Clear query">
                <IconButton onClick={clearQuery} size="small">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <TextField
              multiline
              rows={8}
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              variant="outlined"
              sx={{ 
                mb: 2,
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <ExecuteIcon />}
                onClick={executeQuery}
                disabled={loading || !query.trim()}
              >
                {loading ? 'Executing...' : 'Execute Query'}
              </Button>
              
              {result && (
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={exportResults}
                  size="small"
                >
                  Export CSV
                </Button>
              )}
            </Box>
          </Paper>

          {/* Sample Queries */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sample Queries
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {sampleQueries.map((sampleQuery, index) => (
                <Chip
                  key={index}
                  label={sampleQuery}
                  variant="outlined"
                  size="small"
                  onClick={() => setQuery(sampleQuery)}
                  sx={{ 
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                {error}
              </Typography>
            </Alert>
          )}

          {/* Results Display */}
          {result && (
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Query Results
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip 
                    label={`${result.rowCount} rows`} 
                    size="small" 
                    color="primary"
                  />
                  <Chip 
                    label={`${result.executionTime}ms`} 
                    size="small" 
                    color="secondary"
                  />
                </Box>
              </Box>

              {result.rows.length > 0 ? (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {Object.keys(result.rows[0]).map((column) => (
                          <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                            {column}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.rows.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex} sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                              {value === null ? (
                                <em style={{ color: '#999' }}>NULL</em>
                              ) : (
                                String(value)
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Query executed successfully but returned no rows.
                </Typography>
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* History Tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Query History
          </Typography>
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No queries executed yet.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {history.map((item, index) => (
                <Paper key={index} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {item.timestamp.toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {item.success ? (
                        <>
                          <Chip label="Success" size="small" color="success" />
                          {item.rowCount !== undefined && (
                            <Chip label={`${item.rowCount} rows`} size="small" />
                          )}
                          {item.executionTime && (
                            <Chip label={`${item.executionTime}ms`} size="small" />
                          )}
                        </>
                      ) : (
                        <Chip label="Error" size="small" color="error" />
                      )}
                    </Box>
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      backgroundColor: '#f5f5f5',
                      p: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#e0e0e0' }
                    }}
                    onClick={() => loadFromHistory(item.query)}
                  >
                    {item.query}
                  </Typography>
                  
                  {!item.success && item.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {item.error}
                      </Typography>
                    </Alert>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SqlConsole;
