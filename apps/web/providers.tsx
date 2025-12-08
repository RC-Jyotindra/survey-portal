"use client";

import React, { ReactNode } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * App Providers Component
 * 
 * Wraps the entire application with necessary context providers.
 * This ensures that authentication and tenant context are available
 * throughout the application.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <TenantProvider>
        {children}
      </TenantProvider>
    </AuthProvider>
  );
}

