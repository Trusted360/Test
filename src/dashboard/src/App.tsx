import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import Layout from '@components/Layout';
import ProtectedRoute from '@components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Lazy-loaded pages
const Dashboard = lazy(() => import('@pages/Dashboard'));
const Login = lazy(() => import('@pages/Auth/Login'));
const Register = lazy(() => import('@pages/Auth/Register'));
const NotFound = lazy(() => import('@pages/NotFound'));
const Settings = lazy(() => import('@pages/Settings'));

// Loading fallback
const LoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

function App() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading indicator while checking authentication status
  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
          }
        />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/login" replace />
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
