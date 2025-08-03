import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password should be of minimum 6 characters length')
    .required('Password is required'),
});

const Login: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError(null);
      try {
        await login(values.email, values.password);
        // Navigation is handled in AuthContext
      } catch (err: any) {
        setError(err.message || 'Login failed');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <Box
      sx={{
        minHeight: isMobile ? '100dvh' : '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: isMobile ? 1 : 3,
        // Safe area support for mobile devices
        paddingTop: isMobile ? 'env(safe-area-inset-top, 1rem)' : 3,
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 1rem)' : 3,
      }}
    >
      <Container maxWidth={isMobile ? false : 'sm'}>
        <Paper
          elevation={isMobile ? 1 : 3}
          sx={{
            p: isMobile ? 3 : 4,
            borderRadius: 2,
            width: '100%',
            maxWidth: isMobile ? '100%' : 400,
            margin: '0 auto'
          }}
        >
          {/* Logo and branding */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img
              src="/Trusted360_Logo_Final_1.png"
              alt="Trusted 360"
              style={{
                maxHeight: isMobile ? '80px' : '100px',
                maxWidth: isMobile ? '280px' : '350px',
                width: 'auto',
                height: 'auto',
                marginBottom: '16px'
              }}
            />
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                fontSize: isMobile ? '0.875rem' : '1rem',
                fontWeight: 500
              }}
            >
              Operations Management Platform
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              margin="normal"
              autoComplete="email"
              autoFocus={!isMobile}
              sx={{
                mb: 2,
                '& .MuiInputBase-root': {
                  minHeight: isMobile ? 56 : 48,
                },
                '& .MuiInputLabel-root': {
                  fontSize: isMobile ? '1rem' : '0.875rem',
                },
                '& .MuiInputBase-input': {
                  fontSize: isMobile ? '1rem' : '0.875rem',
                },
              }}
            />
            
            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              margin="normal"
              autoComplete="current-password"
              sx={{
                mb: 3,
                '& .MuiInputBase-root': {
                  minHeight: isMobile ? 56 : 48,
                },
                '& .MuiInputLabel-root': {
                  fontSize: isMobile ? '1rem' : '0.875rem',
                },
                '& .MuiInputBase-input': {
                  fontSize: isMobile ? '1rem' : '0.875rem',
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 2,
                mb: 2,
                minHeight: isMobile ? 56 : 48,
                fontSize: isMobile ? '1.1rem' : '1rem',
                fontWeight: 'bold',
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Create Account Link */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                sx={{
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '0.875rem',
                }}
              >
                Create Account
              </Link>
            </Typography>
          </Box>


          {/* Copyright */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
              }}
            >
              © {new Date().getFullYear()} Trusted 360. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
