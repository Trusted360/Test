import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link,
  Alert, 
  CircularProgress
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Use refs to persist values across potential re-renders
  const errorRef = useRef('');
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const isSettingErrorRef = useRef(false);
  
  const { login, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Sync refs with state
  useEffect(() => {
    errorRef.current = error;
    emailRef.current = email;
    passwordRef.current = password;
  }, [error, email, password]);
  
  // Restore state from refs if component was re-rendered during error setting
  useEffect(() => {
    if (isSettingErrorRef.current && !error && errorRef.current) {
      console.log('Restoring error state from ref:', errorRef.current);
      setError(errorRef.current);
      isSettingErrorRef.current = false;
    }
    if (!email && emailRef.current) {
      console.log('Restoring email from ref:', emailRef.current);
      setEmail(emailRef.current);
    }
    if (!password && passwordRef.current) {
      console.log('Restoring password from ref');
      setPassword(passwordRef.current);
    }
  }, [forceUpdate, error, email, password]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted'); // Debug log
    
    // Clear any existing errors
    setError('');
    
    // Email validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Password validation (simple check for now)
    if (!password) {
      setError('Password is required');
      return;
    }
    
    console.log('Validation passed, attempting login...'); // Debug log
    setIsLoading(true);
    
    try {
      console.log('Calling login function with:', email); // Debug log
      await login(email, password);
      console.log('Login successful!'); // Debug log
      // Navigation is handled in the auth context
    } catch (err: any) {
      console.error('Login error in component:', err); // Debug log
      console.error('Error response data:', err.response?.data); // Debug log
      
      let errorMessage = 'Login failed. Please try again.';
      
      // Handle different error types based on error codes
      if (err.response?.data?.error) {
        const { message, code } = err.response.data.error;
        console.log('Error code:', code, 'Message:', message); // Debug log
        
        switch (code) {
          case 'INVALID_CREDENTIALS':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'INVALID_CREDENTIALS_WARNING':
            errorMessage = message; // Show the specific warning about account lockout
            break;
          case 'ACCOUNT_LOCKED':
            errorMessage = message; // Show the specific lockout message with time remaining
            break;
          default:
            errorMessage = message || 'Login failed. Please try again.';
        }
      } else if (err.message === 'Invalid email or password') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else {
        errorMessage = `Login failed: ${err.message}`;
      }
      
      console.log('Setting error message:', errorMessage); // Debug log
      
      // Set loading to false and show error with ref-based persistence
      setIsLoading(false);
      isSettingErrorRef.current = true;
      errorRef.current = errorMessage;
      setError(errorMessage);
      
      // Force a re-render to trigger restoration logic if needed
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 50);
      
      console.log('Error state set:', errorMessage); // Debug log
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 8,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <img 
              src="/assets/logos/trusted360-logo.svg" 
              alt="Trusted 360" 
              style={{ height: '60px', width: 'auto' }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Demo accounts:
            <br />
            - Admin: admin@trusted360.com
            <br />
            - User: user@trusted360.com
            <br />
            Password: demo123
          </Alert>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Clear error when user starts typing
                if (error) {
                  setError('');
                }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // Clear error when user starts typing
                if (error) {
                  setError('');
                }
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || authLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {(isLoading || authLoading) ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link component={RouterLink} to="/register">
                  Sign up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
