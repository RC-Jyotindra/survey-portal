/**
 * Authentication Middleware
 * 
 * Handles authentication for both existing routes and new collector routes.
 * For development/testing purposes, extracts tenant ID from request headers.
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user and tenantId
declare global {
  namespace Express {
    interface Request {
      user?: {
        tenantId: string;
        userId?: string;
      };
      tenantId?: string; // For backward compatibility
    }
  }
}

// New middleware for collector routes
export function simpleAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // For development: get tenant ID from headers
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!tenantId) {
    return res.status(401).json({ 
      error: 'Tenant ID required',
      hint: 'Add X-Tenant-ID header to your request'
    });
  }

  // Set user object for controllers to use
  req.user = {
    tenantId,
    userId
  };

  // Also set tenantId for backward compatibility
  (req as any).tenantId = tenantId;

  next();
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Optional auth - doesn't fail if no tenant ID provided
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (tenantId) {
    req.user = {
      tenantId,
      userId
    };
    // Also set tenantId for backward compatibility
    (req as any).tenantId = tenantId;
  }

  next();
}

// Existing middleware functions for backward compatibility
export function requireSurveyBuilder(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for X-Tenant-ID header (new system)
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (tenantId) {
      // New system: X-Tenant-ID header
      req.user = {
        tenantId,
        userId
      };
      (req as any).tenantId = tenantId;
      next();
      return;
    }

    // Check for JWT token (old system)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // For development: decode JWT token to get tenant ID
        // In production, this would be properly validated
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid JWT format');
        }
        const payload = JSON.parse(atob(tokenParts[1]!));
        const extractedTenantId = payload.tenant_id;
        
        if (extractedTenantId) {
          req.user = {
            tenantId: extractedTenantId,
            userId: payload.sub
          };
          (req as any).tenantId = extractedTenantId;
          next();
          return;
        }
      } catch (error) {
        // JWT parsing failed, continue to error
      }
    }

    // No valid authentication found
    return res.status(401).json({ 
      error: 'Authentication required',
      hint: 'Add X-Tenant-ID header or Authorization Bearer token to your request'
    });
  };
}

export function requireAction(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for X-Tenant-ID header (new system)
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (tenantId) {
      // New system: X-Tenant-ID header
      req.user = {
        tenantId,
        userId
      };
      (req as any).tenantId = tenantId;
      next();
      return;
    }

    // Check for JWT token (old system)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // For development: decode JWT token to get tenant ID
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid JWT format');
        }
        const payload = JSON.parse(atob(tokenParts[1]!));
        const extractedTenantId = payload.tenant_id;
        
        if (extractedTenantId) {
          req.user = {
            tenantId: extractedTenantId,
            userId: payload.sub
          };
          (req as any).tenantId = extractedTenantId;
          next();
          return;
        }
      } catch (error) {
        // JWT parsing failed, continue to error
      }
    }

    // No valid authentication found
    return res.status(401).json({ 
      error: 'Authentication required',
      hint: 'Add X-Tenant-ID header or Authorization Bearer token to your request'
    });
  };
}

// Alias for backward compatibility - default to VIEWER role
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  return requireSurveyBuilder('VIEWER')(req, res, next);
}