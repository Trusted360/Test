import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Storage as TableIcon,
  Key as KeyIcon,
  Link as RelationIcon,
  Assessment as StatsIcon,
  Code as SqlIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  AccountTree as DiagramIcon,
  History as HistoryIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface TableInfo {
  table_name: string;
  table_type: string;
  row_count: number;
  table_size: string;
  table_comment?: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length?: number;
  is_nullable: string;
  column_default?: string;
  ordinal_position: number;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table_name?: string;
  foreign_column_name?: string;
  column_comment?: string;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
  is_primary: boolean;
  is_unique: boolean;
}

interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  column_name?: string;
  foreign_table_name?: string;
  foreign_column_name?: string;
  update_rule?: string;
  delete_rule?: string;
}

interface RelationshipInfo {
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  constraint_name: string;
  update_rule?: string;
  delete_rule?: string;
}

interface MigrationInfo {
  id: number;
  name: string;
  batch: number;
  migration_time: string;
}

interface DatabaseStats {
  database_size: { database_size: string };
  table_sizes: Array<{
    tablename: string;
    size: string;
    size_bytes: number;
  }>;
  connections: {
    total_connections: number;
    active_connections: number;
    idle_connections: number;
  };
  activity: {
    datname: string;
    numbackends: number;
    xact_commit: number;
    xact_rollback: number;
    blks_read: number;
    blks_hit: number;
    tup_returned: number;
    tup_fetched: number;
    tup_inserted: number;
    tup_updated: number;
    tup_deleted: number;
  };
}

const SchemaExplorer: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableDetails, setTableDetails] = useState<{
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    constraints: ConstraintInfo[];
    statistics: any[];
  } | null>(null);
  const [relationships, setRelationships] = useState<RelationshipInfo[]>([]);
  const [migrations, setMigrations] = useState<MigrationInfo[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  useEffect(() => {
    fetchTables();
    fetchRelationships();
    fetchMigrations();
    fetchDatabaseStats();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableDetails(selectedTable);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/schema/tables', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableDetails = async (tableName: string) => {
    try {
      const response = await fetch(`/api/admin/schema/tables/${tableName}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setTableDetails(data.table);
      }
    } catch (error) {
      console.error('Error fetching table details:', error);
    }
  };

  const fetchRelationships = async () => {
    try {
      const response = await fetch('/api/admin/schema/relationships', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setRelationships(data.relationships);
      }
    } catch (error) {
      console.error('Error fetching relationships:', error);
    }
  };

  const fetchMigrations = async () => {
    try {
      const response = await fetch('/api/admin/schema/migrations', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrations(data.migrations);
      }
    } catch (error) {
      console.error('Error fetching migrations:', error);
    }
  };

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/schema/statistics', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setDbStats(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching database statistics:', error);
    }
  };

  const executeSql = async () => {
    setSqlLoading(true);
    try {
      const response = await fetch('/api/admin/schema/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          sql: sqlQuery,
          operation: 'schema_operation',
          confirm: true
        })
      });
      const data = await response.json();
      
      setSqlResult(data);
      
      if (data.success) {
        // Refresh data after successful operation
        fetchTables();
        fetchRelationships();
        fetchDatabaseStats();
      }
    } catch (error) {
      console.error('Error executing SQL:', error);
      setSqlResult({ success: false, error: 'Network error' });
    } finally {
      setSqlLoading(false);
    }
  };

  const getConstraintTypeColor = (type: string) => {
    switch (type) {
      case 'PRIMARY KEY': return 'error';
      case 'FOREIGN KEY': return 'warning';
      case 'UNIQUE': return 'info';
      case 'CHECK': return 'success';
      default: return 'default';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Database Schema Explorer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse database structure, relationships, and execute schema operations
        </Typography>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Panel - Tables List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Tables ({tables.length})</Typography>
              <Tooltip title="Refresh Tables">
                <IconButton onClick={fetchTables} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List dense>
                {tables.map((table) => (
                  <ListItem
                    key={table.table_name}
                    button
                    selected={selectedTable === table.table_name}
                    onClick={() => setSelectedTable(table.table_name)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText'
                      }
                    }}
                  >
                    <ListItemIcon>
                      <TableIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={table.table_name}
                      secondary={`${table.row_count} rows • ${table.table_size}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right Panel - Table Details */}
        <Grid item xs={12} md={8}>
          {selectedTable ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedTable}
              </Typography>
              
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Columns" />
                <Tab label="Indexes" />
                <Tab label="Constraints" />
                <Tab label="Statistics" />
              </Tabs>

              {/* Columns Tab */}
              {tabValue === 0 && tableDetails && (
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Column</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Nullable</TableCell>
                        <TableCell>Default</TableCell>
                        <TableCell>Keys</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableDetails.columns.map((column) => (
                        <TableRow key={column.column_name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {column.column_name}
                              {column.is_primary_key && (
                                <Chip label="PK" size="small" color="error" />
                              )}
                              {column.is_foreign_key && (
                                <Chip label="FK" size="small" color="warning" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {column.data_type}
                            {column.character_maximum_length && `(${column.character_maximum_length})`}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={column.is_nullable === 'YES' ? 'Yes' : 'No'}
                              size="small"
                              color={column.is_nullable === 'YES' ? 'default' : 'success'}
                            />
                          </TableCell>
                          <TableCell>
                            {column.column_default || '-'}
                          </TableCell>
                          <TableCell>
                            {column.is_foreign_key && column.foreign_table_name && (
                              <Typography variant="caption">
                                → {column.foreign_table_name}.{column.foreign_column_name}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Indexes Tab */}
              {tabValue === 1 && tableDetails && (
                <Box sx={{ mt: 2 }}>
                  {tableDetails.indexes.map((index) => (
                    <Accordion key={index.indexname}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{index.indexname}</Typography>
                          {index.is_primary && <Chip label="Primary" size="small" color="error" />}
                          {index.is_unique && <Chip label="Unique" size="small" color="info" />}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                          {index.indexdef}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}

              {/* Constraints Tab */}
              {tabValue === 2 && tableDetails && (
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Column</TableCell>
                        <TableCell>References</TableCell>
                        <TableCell>Rules</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableDetails.constraints.map((constraint, index) => (
                        <TableRow key={`${constraint.constraint_name}-${index}`}>
                          <TableCell>{constraint.constraint_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={constraint.constraint_type}
                              size="small"
                              color={getConstraintTypeColor(constraint.constraint_type) as any}
                            />
                          </TableCell>
                          <TableCell>{constraint.column_name || '-'}</TableCell>
                          <TableCell>
                            {constraint.foreign_table_name && constraint.foreign_column_name && (
                              <Typography variant="body2">
                                {constraint.foreign_table_name}.{constraint.foreign_column_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {constraint.update_rule && (
                              <Typography variant="caption" display="block">
                                Update: {constraint.update_rule}
                              </Typography>
                            )}
                            {constraint.delete_rule && (
                              <Typography variant="caption" display="block">
                                Delete: {constraint.delete_rule}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Statistics Tab */}
              {tabValue === 3 && tableDetails && (
                <Box sx={{ mt: 2 }}>
                  {tableDetails.statistics.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Column</TableCell>
                            <TableCell>Distinct Values</TableCell>
                            <TableCell>Correlation</TableCell>
                            <TableCell>Most Common Values</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tableDetails.statistics.map((stat) => (
                            <TableRow key={stat.attname}>
                              <TableCell>{stat.attname}</TableCell>
                              <TableCell>{stat.n_distinct}</TableCell>
                              <TableCell>{stat.correlation?.toFixed(4) || '-'}</TableCell>
                              <TableCell>
                                {stat.most_common_vals && (
                                  <Typography variant="caption">
                                    {stat.most_common_vals.slice(0, 3).join(', ')}
                                    {stat.most_common_vals.length > 3 && '...'}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No statistics available for this table.</Alert>
                  )}
                </Box>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <TableIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a table to view its details
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Additional Sections */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Database Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Database Statistics
            </Typography>
            {dbStats && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {dbStats.database_size.database_size}
                      </Typography>
                      <Typography variant="body2">Database Size</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {dbStats.connections.total_connections}
                      </Typography>
                      <Typography variant="body2">Total Connections</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {dbStats.activity.xact_commit.toLocaleString()}
                      </Typography>
                      <Typography variant="body2">Transactions</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {((dbStats.activity.blks_hit / (dbStats.activity.blks_hit + dbStats.activity.blks_read)) * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2">Cache Hit Ratio</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Migration History */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Migration History
            </Typography>
            {migrations.length > 0 ? (
              <List dense>
                {migrations.slice(0, 5).map((migration) => (
                  <ListItem key={migration.id}>
                    <ListItemIcon>
                      <HistoryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={migration.name}
                      secondary={`Batch ${migration.batch} • ${new Date(migration.migration_time).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">No migration history found.</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Schema Operations
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SqlIcon />}
            onClick={() => setSqlDialogOpen(true)}
          >
            Execute SQL
          </Button>
          <Button
            variant="outlined"
            startIcon={<DiagramIcon />}
            onClick={() => {
              // Future: Open ER diagram view
              alert('ER Diagram feature coming soon!');
            }}
          >
            View ER Diagram
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchTables();
              fetchRelationships();
              fetchDatabaseStats();
            }}
          >
            Refresh All
          </Button>
        </Box>
      </Paper>

      {/* SQL Execution Dialog */}
      <Dialog open={sqlDialogOpen} onClose={() => setSqlDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Execute Schema Operation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="SQL Query"
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="CREATE TABLE example (id SERIAL PRIMARY KEY, name VARCHAR(255));"
          />
          
          {sqlResult && (
            <Alert
              severity={sqlResult.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {sqlResult.success ? sqlResult.message : sqlResult.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSqlDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={executeSql}
            variant="contained"
            disabled={!sqlQuery.trim() || sqlLoading}
          >
            {sqlLoading ? <CircularProgress size={20} /> : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchemaExplorer;
