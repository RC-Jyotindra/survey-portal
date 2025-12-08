"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Types
interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  tierCode?: string;
}

interface TenantContextType {
  tenantId: string | null;
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => void;
  refreshTenant: () => void;
}

// Create context
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Provider component
interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tenant information from localStorage
  const loadTenantFromStorage = () => {
    try {
      const storedTenantId = localStorage.getItem('activeTenantId');
      const storedTenant = localStorage.getItem('tenant');
      
      if (storedTenantId) {
        setTenantId(storedTenantId);
        
        if (storedTenant) {
          const parsedTenant = JSON.parse(storedTenant);
          setTenant(parsedTenant);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading tenant from storage:', err);
      setError('Failed to load tenant information');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to a different tenant
  const switchTenant = (newTenantId: string) => {
    try {
      localStorage.setItem('activeTenantId', newTenantId);
      setTenantId(newTenantId);
      
      // Try to find tenant info in localStorage
      const storedTenant = localStorage.getItem('tenant');
      if (storedTenant) {
        const parsedTenant = JSON.parse(storedTenant);
        if (parsedTenant.id === newTenantId) {
          setTenant(parsedTenant);
        } else {
          // Tenant info doesn't match, clear it
          setTenant(null);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error switching tenant:', err);
      setError('Failed to switch tenant');
    }
  };

  // Refresh tenant information
  const refreshTenant = () => {
    loadTenantFromStorage();
  };

  // Load tenant on mount and when localStorage changes
  useEffect(() => {
    loadTenantFromStorage();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeTenantId' || e.key === 'tenant') {
        loadTenantFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: TenantContextType = {
    tenantId,
    tenant,
    isLoading,
    error,
    switchTenant,
    refreshTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// Custom hook to use tenant context
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Helper hook for getting tenant ID with fallback
export function useTenantId(): string {
  const { tenantId } = useTenant();
  
  if (!tenantId) {
    throw new Error('No tenant ID available. User must be authenticated and have an active tenant.');
  }
  
  return tenantId;
}

