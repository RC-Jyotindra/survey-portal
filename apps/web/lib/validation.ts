import { z } from 'zod';

/**
 * Security: Input validation schemas
 * Use these to validate all user input before processing
 */

// URL validation - only allow HTTPS and specific domains
export const urlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      const allowedOrigins = [
        'https://survey.research-connectllc.com',
        'https://research-connectllc.com',
        process.env.NEXT_PUBLIC_BASE_URL
      ].filter(Boolean) as string[];
      
      return parsed.protocol === 'https:' && 
             allowedOrigins.some(origin => {
               try {
                 return parsed.origin === new URL(origin).origin;
               } catch {
                 return false;
               }
             });
    } catch {
      return false;
    }
  },
  { message: 'URL must be HTTPS and from allowed domain' }
);

// Redirect URL validation - stricter than urlSchema
export const redirectUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      // Only allow same-origin redirects
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://survey.research-connectllc.com';
      return parsed.origin === new URL(baseUrl).origin;
    } catch {
      return false;
    }
  },
  { message: 'Invalid redirect URL - must be same origin' }
);

// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

// Slug validation (for survey slugs, collector slugs, etc.)
export const slugSchema = z.string()
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .min(1, 'Slug cannot be empty')
  .max(100, 'Slug too long')
  .refine(
    (slug) => !slug.startsWith('-') && !slug.endsWith('-'),
    'Slug cannot start or end with hyphen'
  );

// Password validation - strong password requirements
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Sanitize string input - remove potentially dangerous characters
export function sanitizeString(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength); // Limit length
}

// Sanitize HTML (for rich text fields)
export function sanitizeHtml(html: string): string {
  // In production, use a library like DOMPurify
  // For now, basic sanitization
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, ''); // Remove javascript: protocol
}

// Validate and sanitize form data
export function validateFormData<T extends z.ZodTypeAny>(
  formData: FormData,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  try {
    const raw = Object.fromEntries(formData.entries());
    const data = schema.parse(raw);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  name: z.string().min(1).max(255).trim(),
  title: z.string().min(1).max(500).trim(),
  description: z.string().max(5000).trim().optional(),
  pageNumber: z.number().int().min(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
};

