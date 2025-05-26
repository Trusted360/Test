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
// Pages for routes in the sidebar
const Recipes = lazy(() => import('@pages/Recipes'));
const Shopping = lazy(() => import('@pages/Shopping'));
const Meals = lazy(() => import('@pages/Meals'));
const Settings = lazy(() => import('@pages/Settings'));
const Pantry = lazy(() => import('./pages/Pantry/PantryPage'));

// Meal plan pages
const MealPlanCreate = lazy(() => import('@pages/Meals/MealPlanCreate'));
const MealPlanDetail = lazy(() => import('@pages/Meals/MealPlanDetail'));
const MealPlanSubmit = lazy(() => import('@pages/Meals/MealPlanSubmit'));
const MealPlanApproval = lazy(() => import('@pages/Meals/MealPlanApproval'));

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
          {/* Routes for the sidebar menu items */}
          <Route
            path="/recipes"
            element={
              <ProtectedRoute>
                <Recipes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shopping"
            element={
              <ProtectedRoute>
                <Shopping />
              </ProtectedRoute>
            }
          />
          {/* Meal plan routes */}
          <Route
            path="/meals"
            element={
              <ProtectedRoute>
                <Meals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meals/create"
            element={
              <ProtectedRoute>
                <MealPlanCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meals/:id"
            element={
              <ProtectedRoute>
                <MealPlanDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meals/:id/submit"
            element={
              <ProtectedRoute>
                <MealPlanSubmit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meals/:id/approve"
            element={
              <ProtectedRoute>
                <MealPlanApproval />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meals/:id/approve/:version"
            element={
              <ProtectedRoute>
                <MealPlanApproval />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pantry"
            element={
              <ProtectedRoute>
                <Pantry />
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
