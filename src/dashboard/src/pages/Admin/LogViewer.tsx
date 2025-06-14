import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  source: string;
  message: string;
  details?: any;
  container?: string;
}

interface LogSource {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

const LogViewer: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sources, setSources] = useState<LogSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [selectedSource, setSelectedSource] = useState('api');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(100);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch available log sources
  useEffect(() => {
    fetchLogSources();
  }, []);

  // Fetch logs when filters change
  useEffect(() => {
    if (!streaming) {
      fetchLogs();
    }
  }, [selectedSource, selectedLevel, limit, searchTerm]);

  const fetchLogSources = async () => {
    try {
      const response = await api.get('/admin/logs/sources');
      const data = response.data;
      
      if (data.success) {
        setSources(data.sources);
      }
    } catch (error) {
      console.error('Error fetching log sources:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        source: selectedSource,
        level: selectedLevel,
        limit: limit.toString(),
        search: searchTerm
      };

      const response = await api.get('/admin/logs', { params });
      const data = response.data;
      
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams({
      source: selectedSource,
      level: selectedLevel
    });

    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    // EventSource doesn't support custom headers, so we'll include the token as a query parameter
    params.append('token', token);

    eventSourceRef.current = new EventSource(`/api/admin/logs/stream?${params}`);
    
    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'log') {
        setLogs(prevLogs => {
          const newLogs = [data, ...prevLogs];
          return newLogs.slice(0, limit); // Keep only the latest entries
        });
        
        if (autoScroll && logsContainerRef.current) {
          logsContainerRef.current.scrollTop = 0;
        }
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('EventSource error:', error);
      setStreaming(false);
    };

    setStreaming(true);
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  };

  const toggleStreaming = () => {
    if (streaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setExpandedLogs(new Set());
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const exportLogs = async () => {
    try {
      const response = await api.post('/admin/logs/export', {
        source: selectedSource,
        level: selectedLevel,
        format: exportFormat,
        limit: 1000,
        search: searchTerm
      }, {
        responseType: 'blob'
      });

      if (response.status === 200) {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${selectedSource}-${Date.now()}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setExportDialogOpen(false);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Log Viewer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and monitor application logs in real-time
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select
                value={selectedSource}
                label="Source"
                onChange={(e) => setSelectedSource(e.target.value)}
                disabled={streaming}
              >
                {sources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    {source.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Level</InputLabel>
              <Select
                value={selectedLevel}
                label="Level"
                onChange={(e) => setSelectedLevel(e.target.value)}
                disabled={streaming}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warn">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={streaming}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Limit"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              disabled={streaming}
              inputProps={{ min: 10, max: 1000 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={streaming ? <PauseIcon /> : <PlayIcon />}
                onClick={toggleStreaming}
                color={streaming ? 'secondary' : 'primary'}
              >
                {streaming ? 'Stop Stream' : 'Start Stream'}
              </Button>
              
              <Tooltip title="Refresh Logs">
                <IconButton onClick={fetchLogs} disabled={streaming || loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Clear Logs">
                <IconButton onClick={clearLogs}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Export Logs">
                <IconButton onClick={() => setExportDialogOpen(true)}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
            }
            label="Auto-scroll to new logs"
          />
        </Box>
      </Paper>

      {/* Status */}
      {streaming && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Live streaming logs from {selectedSource}. New entries will appear automatically.
        </Alert>
      )}

      {/* Logs Display */}
      <Paper sx={{ height: 600, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            ref={logsContainerRef}
            sx={{
              height: '100%',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {logs.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                No logs found. Try adjusting your filters or start streaming.
              </Box>
            ) : (
              logs.map((log) => (
                <Box
                  key={log.id}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ minWidth: 140 }}>
                      {formatTimestamp(log.timestamp)}
                    </Typography>
                    <Chip
                      label={log.level.toUpperCase()}
                      size="small"
                      color={getLevelColor(log.level) as any}
                      sx={{ minWidth: 60 }}
                    />
                    <Chip
                      label={log.source}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 80 }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {log.message}
                    </Typography>
                    {log.details && (
                      <IconButton
                        size="small"
                        onClick={() => toggleLogExpansion(log.id)}
                      >
                        {expandedLogs.has(log.id) ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                    )}
                  </Box>
                  
                  {expandedLogs.has(log.id) && log.details && (
                    <Box sx={{ ml: 2, mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Details:
                      </Typography>
                      <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Box>
        )}
      </Paper>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Logs</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={exportFormat}
              label="Format"
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={exportLogs} variant="contained">Export</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LogViewer;
