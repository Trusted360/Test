import { jwtDecode } from 'jwt-decode';

// Token storage key
const TOKEN_KEY = 'simmer_auth_token';

// User type
interface User {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
}

// Token payload type
interface TokenPayload extends User {
  exp: number;
  iat: number;
}

/**
 * Store authentication token in local storage
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get authentication token from local storage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove authentication token from local storage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if token is valid and not expired
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  
  if (!token) {
    return false;
  }
  
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const currentTime = Date.now() / 1000;
    
    return decoded.exp > currentTime;
  } catch (error) {
    console.error('Invalid token:', error);
    return false;
  }
};

/**
 * Get user information from token
 */
export const getUserFromToken = (): User | null => {
  const token = getToken();
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};
