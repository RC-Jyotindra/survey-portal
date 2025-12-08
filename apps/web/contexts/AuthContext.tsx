"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  isActive: boolean;
}

interface Product {
  code: 'SB' | 'PM' | 'PMM';
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'EDITOR' | 'USER' | 'VIEWER';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  products: Product[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (token: string, user: User, products: Product[]) => void;
  logout: () => void;
  refreshAuth: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load authentication information from localStorage
  const loadAuthFromStorage = () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      const storedProducts = localStorage.getItem('products');
      
      if (storedToken) {
        setToken(storedToken);
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
        
        if (storedProducts) {
          const parsedProducts = JSON.parse(storedProducts);
          setProducts(parsedProducts);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading auth from storage:', err);
      setError('Failed to load authentication information');
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = (authToken: string, userData: User, userProducts: Product[]) => {
    try {
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('products', JSON.stringify(userProducts));
      
      setToken(authToken);
      setUser(userData);
      setProducts(userProducts);
      setError(null);
    } catch (err) {
      console.error('Error during login:', err);
      setError('Failed to save authentication information');
    }
  };

  // Logout function
  const logout = () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('products');
      localStorage.removeItem('activeTenantId');
      localStorage.removeItem('tenant');
      
      setToken(null);
      setUser(null);
      setProducts([]);
      setError(null);
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Failed to clear authentication information');
    }
  };

  // Refresh authentication information
  const refreshAuth = () => {
    loadAuthFromStorage();
  };

  // Check if user is authenticated
  const isAuthenticated = Boolean(token && user);

  // Load auth on mount and when localStorage changes
  useEffect(() => {
    loadAuthFromStorage();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === 'user' || e.key === 'products') {
        loadAuthFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    products,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook for getting auth token with fallback
export function useAuthToken(): string {
  const { token } = useAuth();
  
  if (!token) {
    throw new Error('No authentication token available. User must be logged in.');
  }
  
  return token;
}

// Helper hook for checking product access
export function useProductAccess(productCode: 'SB' | 'PM' | 'PMM') {
  const { products } = useAuth();
  
  const product = products.find(p => p.code === productCode);
  
  return {
    hasAccess: Boolean(product),
    role: product?.role,
    canEdit: product && ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'].includes(product.role),
    canManage: product && ['OWNER', 'ADMIN', 'MANAGER'].includes(product.role),
    canAdmin: product && ['OWNER', 'ADMIN'].includes(product.role),
  };
}

