/**
 * API Client
 * 
 * Centralized API client that automatically includes authentication headers
 * and handles common API patterns.
 */

import { config } from './config';
import { getApiHeaders } from './api-headers';

// Note: Headers are now generated dynamically using getApiHeaders()
// This ensures tenant ID and auth token are always current

// Helper function to make API requests with dynamic headers
export async function apiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : `${config.api.surveyService}${url}`;
  
  // Generate dynamic headers with current tenant ID and auth token
  const dynamicHeaders = getApiHeaders();
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...dynamicHeaders,
      ...options.headers,
    },
  };

  if (config.development.logApiCalls) {
    console.log(`API Request: ${requestOptions.method || 'GET'} ${fullUrl}`, {
      headers: requestOptions.headers,
      body: requestOptions.body,
    });
  }

  const response = await fetch(fullUrl, requestOptions);

  if (config.development.logApiCalls) {
    console.log(`API Response: ${response.status} ${response.statusText}`, {
      url: fullUrl,
      status: response.status,
    });
  }

  return response;
}

// Convenience methods for common HTTP verbs that return parsed JSON
export const api = {
  get: async <T>(url: string, options?: RequestInit): Promise<T> => {
    const response = await apiRequest(url, { ...options, method: 'GET' });
    return handleApiResponse<T>(response);
  },
    
  post: async <T>(url: string, data?: any, options?: RequestInit): Promise<T> => {
    const response = await apiRequest(url, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    });
    return handleApiResponse<T>(response);
  },
    
  put: async <T>(url: string, data?: any, options?: RequestInit): Promise<T> => {
    const response = await apiRequest(url, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    });
    return handleApiResponse<T>(response);
  },
    
  delete: async <T>(url: string, options?: RequestInit): Promise<T> => {
    const response = await apiRequest(url, { ...options, method: 'DELETE' });
    return handleApiResponse<T>(response);
  },
    
  patch: async <T>(url: string, data?: any, options?: RequestInit): Promise<T> => {
    const response = await apiRequest(url, { 
      ...options, 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined 
    });
    return handleApiResponse<T>(response);
  },
};

// Helper function to handle API responses and errors
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Helper function for API calls that return data
export async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiRequest(url, options);
  return handleApiResponse<T>(response);
}
