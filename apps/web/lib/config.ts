/**
 * Application Configuration
 * 
 * Centralized configuration for API endpoints, tenant IDs, etc.
 */

export const config = {
  // API Configuration
  api: {
    surveyService: process.env.NEXT_PUBLIC_SURVEY_SERVICE_URL || 'http://localhost:3002',
  },
  
  // Development flags
  development: {
    enableMockData: process.env.NODE_ENV === 'development',
    logApiCalls: process.env.NODE_ENV === 'development',
  }
};

// Note: getApiHeaders function has been moved to lib/api-headers.ts
// This provides better separation of concerns and dynamic tenant ID support
