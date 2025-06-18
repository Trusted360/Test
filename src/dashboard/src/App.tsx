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
const Properties = lazy(() => import('@pages/Properties'));
const Checklists = lazy(() => import('@pages/Checklists'));
const ChecklistDetail = lazy(() => import('@pages/Checklists/ChecklistDetail'));
const VideoAnalysis = lazy(() => import('@pages/Video'));

// Admin pages
const AdminDashboard = lazy(() => import('@pages/Admin/AdminDashboard'));
const SqlConsole = lazy(() => import('@pages/Admin/SqlConsole'));
const SystemHealth = lazy(() => import('@pages/Admin/SystemHealth'));
const LogViewer = lazy(() => import('@pages/Admin/LogViewer'));
const SchemaExplorer = lazy(() => import('@pages/Admin/SchemaExplorer'));

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
            path="/properties"
            element={
              <ProtectedRoute>
                <Properties />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists"
            element={
              <ProtectedRoute>
                <Checklists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists/:id"
            element={
              <ProtectedRoute>
                <ChecklistDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists/:id/edit"
            element={
              <ProtectedRoute>
                <ChecklistDetail editMode={true} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video"
            element={
              <ProtectedRoute>
                <VideoAnalysis />
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
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sql"
            element={
              <ProtectedRoute>
                <SqlConsole />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/health"
            element={
              <ProtectedRoute>
                <SystemHealth />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute>
                <LogViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schema"
            element={
              <ProtectedRoute>
                <SchemaExplorer />
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
