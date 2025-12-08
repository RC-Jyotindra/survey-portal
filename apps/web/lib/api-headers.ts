/**
 * Dynamic API Headers Utility
 * 
 * Centralized utility for generating API headers with dynamic tenant ID and auth token.
 * This replaces the hardcoded tenant ID approach with a context-aware system.
 */

// Types
export interface ApiHeadersOptions {
  includeAuth?: boolean;
  includeTenant?: boolean;
  additionalHeaders?: Record<string, string>;
}

// Default headers that are always included
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
};

/**
 * Get authentication token from localStorage
 * This is a fallback for when context is not available
 */
function getAuthTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token from storage:', error);
    return null;
  }
}

/**
 * Get tenant ID from localStorage
 * This is a fallback for when context is not available
 */
function getTenantIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('activeTenantId');
  } catch (error) {
    console.error('Error getting tenant ID from storage:', error);
    return null;
  }
}

/**
 * Generate API headers with dynamic tenant ID and auth token
 * 
 * @param options - Configuration options for headers
 * @returns Headers object for API requests
 */
export function getApiHeaders(options: ApiHeadersOptions = {}): HeadersInit {
  const {
    includeAuth = true,
    includeTenant = true,
    additionalHeaders = {}
  } = options;

  const headers: HeadersInit = {
    ...DEFAULT_HEADERS,
    ...additionalHeaders
  };

  // Add authentication header if requested
  if (includeAuth) {
    const token = getAuthTokenFromStorage();
    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found. API request may fail.');
    }
  }

  // Add tenant ID header if requested
  if (includeTenant) {
    const tenantId = getTenantIdFromStorage();
    if (tenantId) {
      (headers as any)['X-Tenant-ID'] = tenantId;
    } else {
      console.warn('No tenant ID found. API request may fail or return wrong data.');
    }
  }

  return headers;
}

/**
 * Generate API headers with explicit tenant ID and token
 * Use this when you have the values directly (e.g., from context)
 * 
 * @param tenantId - The tenant ID to use
 * @param token - The auth token to use
 * @param additionalHeaders - Additional headers to include
 * @returns Headers object for API requests
 */
export function getApiHeadersWithAuth(
  tenantId: string,
  token: string,
  additionalHeaders: Record<string, string> = {}
): HeadersInit {
  return {
    ...DEFAULT_HEADERS,
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId,
    ...additionalHeaders
  };
}

/**
 * Generate API headers for public endpoints (no auth required)
 * 
 * @param tenantId - The tenant ID to use (optional)
 * @param additionalHeaders - Additional headers to include
 * @returns Headers object for API requests
 */
export function getPublicApiHeaders(
  tenantId?: string,
  additionalHeaders: Record<string, string> = {}
): HeadersInit {
  const headers: HeadersInit = {
    ...DEFAULT_HEADERS,
    ...additionalHeaders
  };

  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  return headers;
}

/**
 * Validate that required headers are present
 * 
 * @param headers - Headers to validate
 * @param requireAuth - Whether auth token is required
 * @param requireTenant - Whether tenant ID is required
 * @returns True if all required headers are present
 */
export function validateApiHeaders(
  headers: HeadersInit,
  requireAuth: boolean = true,
  requireTenant: boolean = true
): boolean {
  if (requireAuth && !(headers as any)['Authorization']) {
    console.error('Missing required Authorization header');
    return false;
  }

  if (requireTenant && !(headers as any)['X-Tenant-ID']) {
    console.error('Missing required X-Tenant-ID header');
    return false;
  }

  return true;
}

/**
 * Helper function to get tenant ID with fallback
 * This can be used in components that need tenant ID but don't have context
 * 
 * @returns Tenant ID or null if not available
 */
export function getCurrentTenantId(): string | null {
  return getTenantIdFromStorage();
}

/**
 * Helper function to get auth token with fallback
 * This can be used in components that need auth token but don't have context
 * 
 * @returns Auth token or null if not available
 */
export function getCurrentAuthToken(): string | null {
  return getAuthTokenFromStorage();
}
