import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// Define the user type
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string; // Optional password for registered users
  member?: {
    id: string;
    name: string;
  };
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

// Load mock users from localStorage or initialize empty array
const loadMockUsers = (): User[] => {
  const storedUsers = localStorage.getItem('mockUsers');
  if (storedUsers) {
    try {
      return JSON.parse(storedUsers);
    } catch (error) {
      console.error('Failed to parse stored users:', error);
      return [];
    }
  }
  return [];
};

// Save mock users to localStorage
const saveMockUsers = (users: User[]) => {
  localStorage.setItem('mockUsers', JSON.stringify(users));
};

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Initialize mock users if none exist
  useEffect(() => {
    const mockUsers = loadMockUsers();
    if (mockUsers.length === 0) {
      // Add some initial mock users for testing
      const initialUsers = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          password: 'admin123',
          member: {
            id: 'member-1',
            name: 'Admin User'
          }
        },
        {
          id: 'user-2',
          email: 'user@example.com',
          name: 'Regular User',
          role: 'user',
          password: 'user123',
          member: {
            id: 'member-2',
            name: 'Regular User'
          }
        }
      ];
      saveMockUsers(initialUsers);
      console.log('Initialized mock users:', initialUsers);
    }
  }, []);

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
    setLoading(true);
    try {
      console.log('Attempting login with:', { email });
      
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find user by email
      const mockUsers = loadMockUsers();
      const foundUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      // Check if user exists
      if (!foundUser) {
        console.error('Login failed: User not found', { email, mockUsers });
        throw new Error('Invalid email or password');
      }
      
      // Validate password (for testing, we'll use hardcoded passwords)
      // In a real app, we would compare password hashes
      const isValidPassword = 
        (foundUser.email === 'admin@example.com' && password === 'admin123') || 
        (foundUser.email === 'user@example.com' && password === 'user123') ||
        (foundUser.password && password === foundUser.password); // For users registered during testing
      
      if (!isValidPassword) {
        console.error('Login failed: Invalid password');
        throw new Error('Invalid email or password');
      }
      
      console.log(`Login successful for user: ${email}`);
      
      // Store token and user in localStorage
      const token = `mock-jwt-token-${Date.now()}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(foundUser));
      
      setUser(foundUser);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting registration with:', { name, email });
      
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
      
      // Check if user already exists
      const mockUsers = loadMockUsers();
      const existingUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Create new user
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        name,
        role: 'user',
        password, // Store the password for login validation
        member: {
          id: `member-${Date.now()}`,
          name
        }
      };
      
      // Add user to mock database and persist
      mockUsers.push(newUser);
      saveMockUsers(mockUsers);
      
      // Store token and user in localStorage
      const token = `mock-jwt-token-${Date.now()}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setUser(newUser);
      navigate('/dashboard');
      
      console.log('User registered successfully:', newUser);
      console.log('Mock database:', mockUsers);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
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