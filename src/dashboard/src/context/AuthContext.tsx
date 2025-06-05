import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Define the user type
interface User {
  id: number | string; // API returns number
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string; // Computed from first_name + last_name
  role: string;
  tenant_id?: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Define the auth context value type
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Create the auth context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Check if the user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', email); // Debug log
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response:', response); // Debug log
      
      // Fix: API returns data nested in response.data.data
      const { token, user: apiUser } = response.data.data || response.data;
      
      // Transform user to include name field
      const user: User = {
        ...apiUser,
        name: `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim() || apiUser.email
      };
      
      // Save auth data in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      
      // Navigate after state is updated
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error response:', error.response); // Debug log
      throw error;
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      // Split name into first and last name for API
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const response = await api.post('/auth/register', { 
        email, 
        password,
        firstName: firstName || name,
        lastName: lastName || ''
      });
      
      // Fix: API returns data nested in response.data.data
      const { token, user: apiUser } = response.data.data || response.data;
      
      // Transform user to include name field
      const user: User = {
        ...apiUser,
        name: `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim() || apiUser.email
      };
      
      // Save auth data in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      setLoading(false);
      
      // Navigate after state is updated
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
      setLoading(false);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  // Create the context value
  const value = {
    isAuthenticated: !!user,
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
