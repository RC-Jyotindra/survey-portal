# Security Hardening Guide: Preventing Future Attacks

## 🛡️ Comprehensive Security Strategy

This guide provides actionable steps to prevent security breaches like the one you experienced.

---

## 1. Immediate Security Measures (Do This First)

### A. Update Dependencies Regularly

```bash
# Set up automated dependency updates
cd apps/web
npm install -D npm-check-updates

# Check for outdated packages
npx npm-check-updates

# Update all dependencies
npx npm-check-updates -u
npm install

# Check for known vulnerabilities
npm audit
npm audit fix --force

# Add to package.json scripts
"scripts": {
  "security:check": "npm audit && npm outdated",
  "security:fix": "npm audit fix"
}
```

**Automate this:**
- Set up GitHub Dependabot or similar
- Schedule weekly security audits
- Get alerts for critical vulnerabilities

### B. Implement Security Headers

Create/update `apps/web/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Minimize unsafe-*
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://survey.research-connectllc.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ];
  },
  
  // Disable source maps in production (prevents code exposure)
  productionBrowserSourceMaps: false,
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // Compress responses
  compress: true,
  
  // Power by header removal (security through obscurity)
  poweredByHeader: false
};

module.exports = nextConfig;
```

### C. Input Validation with Zod

Install validation library:
```bash
cd apps/web
npm install zod
```

Create validation utilities (`apps/web/lib/validation.ts`):

```typescript
import { z } from 'zod';

// URL validation schema
export const urlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      // Only allow HTTPS and specific domains
      const allowedOrigins = [
        'https://survey.research-connectllc.com',
        'https://research-connectllc.com'
      ];
      return parsed.protocol === 'https:' && 
             allowedOrigins.some(origin => parsed.origin === origin);
    } catch {
      return false;
    }
  },
  { message: 'URL must be HTTPS and from allowed domain' }
);

// Redirect URL validation
export const redirectUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      // Only allow same-origin redirects or specific whitelist
      return parsed.origin === new URL(process.env.NEXT_PUBLIC_BASE_URL || '').origin ||
             ['https://survey.research-connectllc.com'].includes(parsed.origin);
    } catch {
      return false;
    }
  },
  { message: 'Invalid redirect URL' }
);

// Email validation
export const emailSchema = z.string().email().max(255);

// Slug validation (for survey slugs)
export const slugSchema = z.string()
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .min(1)
  .max(100);

// Sanitize string input
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
}
```

### D. Secure Server Actions

Create a secure server action wrapper (`apps/web/lib/secure-action.ts`):

```typescript
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Secure redirect helper
export function safeRedirect(url: string, allowedOrigins: string[] = []): never {
  try {
    const parsed = new URL(url);
    
    // Validate protocol
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Invalid protocol');
    }
    
    // Validate origin
    const defaultOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL,
      'https://survey.research-connectllc.com'
    ].filter(Boolean) as string[];
    
    const origins = [...defaultOrigins, ...allowedOrigins];
    if (!origins.some(origin => parsed.origin === new URL(origin).origin)) {
      throw new Error('Origin not allowed');
    }
    
    redirect(url);
  } catch (error) {
    console.error('Invalid redirect attempt:', error);
    redirect('/'); // Fallback to home
  }
}

// Secure server action wrapper
export function secureAction<T extends z.ZodTypeAny>(
  schema: T,
  handler: (data: z.infer<T>) => Promise<any>
) {
  return async (formData: FormData) => {
    try {
      // Rate limiting
      const clientId = formData.get('_clientId') as string || 'unknown';
      if (!rateLimit(clientId, 20, 60000)) {
        throw new Error('Rate limit exceeded');
      }
      
      // Parse and validate
      const rawData = Object.fromEntries(formData.entries());
      const validatedData = schema.parse(rawData);
      
      // Execute handler
      return await handler(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { error: 'Validation failed', details: error.errors };
      }
      console.error('Server action error:', error);
      return { error: 'An error occurred' };
    }
  };
}
```

---

## 2. Code-Level Security Best Practices

### A. Never Trust User Input

```typescript
// ❌ BAD - Direct user input usage
export async function createSurvey(formData: FormData) {
  const title = formData.get('title');
  const slug = formData.get('slug');
  
  // DANGEROUS: No validation
  await db.survey.create({ title, slug });
}

// ✅ GOOD - Validate everything
import { z } from 'zod';

const createSurveySchema = z.object({
  title: z.string().min(1).max(200).trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(100)
});

export async function createSurvey(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const data = createSurveySchema.parse(raw); // Throws if invalid
  
  await db.survey.create(data);
}
```

### B. Never Execute Shell Commands with User Input

```typescript
// ❌ BAD - Command injection vulnerability
import { exec } from 'child_process';

export async function runCommand(formData: FormData) {
  const command = formData.get('command');
  exec(command); // DANGEROUS!
}

// ✅ GOOD - Use Node.js APIs or whitelist
import { execFile } from 'child_process';

const ALLOWED_COMMANDS = ['ls', 'pwd', 'date']; // Whitelist

export async function runCommand(formData: FormData) {
  const command = formData.get('command');
  
  if (!ALLOWED_COMMANDS.includes(command)) {
    throw new Error('Command not allowed');
  }
  
  // Use execFile with full path, not exec
  execFile('/bin/' + command, [], (error, stdout) => {
    // Handle result
  });
}

// ✅ BETTER - Use Node.js APIs instead
import { readdir, stat } from 'fs/promises';

export async function listFiles(path: string) {
  // Validate path
  if (!path.startsWith('/allowed/path')) {
    throw new Error('Path not allowed');
  }
  
  return await readdir(path); // Safe Node.js API
}
```

### C. Sanitize All Outputs

```typescript
// ❌ BAD - XSS vulnerability
export default function SurveyTitle({ title }: { title: string }) {
  return <h1>{title}</h1>; // If title contains <script>, it's dangerous
}

// ✅ GOOD - React automatically escapes, but be explicit
export default function SurveyTitle({ title }: { title: string }) {
  // React escapes by default, but sanitize anyway
  const sanitized = title.replace(/[<>]/g, '');
  return <h1>{sanitized}</h1>;
}

// ✅ BETTER - Use a sanitization library
import DOMPurify from 'isomorphic-dompurify';

export default function RichText({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### D. Secure API Routes

Create middleware for API routes (`apps/web/lib/api-middleware.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Rate limiting (use Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(
  req: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60000
): NextResponse | null {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return null; // Allow request
  }
  
  if (record.count >= maxRequests) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  record.count++;
  return null; // Allow request
}

// Validate request body
export function validateBody<T extends z.ZodTypeAny>(
  schema: T
): (req: NextRequest) => Promise<z.infer<T> | NextResponse> {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  };
}

// CORS middleware
export function corsMiddleware(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'https://survey.research-connectllc.com',
    process.env.NEXT_PUBLIC_BASE_URL
  ].filter(Boolean);
  
  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: 'CORS not allowed' },
      { status: 403 }
    );
  }
  
  return null;
}
```

Use in API routes (`apps/web/app/api/example/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, validateBody, corsMiddleware } from '@/lib/api-middleware';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email()
});

export async function POST(req: NextRequest) {
  // Apply middleware
  const rateLimit = rateLimitMiddleware(req);
  if (rateLimit) return rateLimit;
  
  const cors = corsMiddleware(req);
  if (cors) return cors;
  
  const body = await validateBody(schema)(req);
  if (body instanceof NextResponse) return body;
  
  // Process validated data
  // ...
  
  return NextResponse.json({ success: true });
}
```

---

## 3. Infrastructure Security

### A. Firewall Configuration

```bash
# Block malicious IPs
sudo iptables -A INPUT -s 5.231.31.52 -j DROP
sudo iptables -A OUTPUT -d 5.231.31.52 -j DROP

# Save rules
sudo iptables-save > /etc/iptables/rules.v4

# Set up fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

Create fail2ban config (`/etc/fail2ban/jail.local`):

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

### B. Process Monitoring

Create a monitoring script (`scripts/monitor-security.sh`):

```bash
#!/bin/bash
# Monitor for suspicious processes

LOG_FILE="/var/log/security-monitor.log"

# Check for suspicious processes
check_processes() {
    SUSPICIOUS=$(ps aux | grep -E "curl.*5\.231\.31\.52|wget.*5\.231\.31\.52|cARM|cX86|\.b4nd1d0" | grep -v grep)
    
    if [ ! -z "$SUSPICIOUS" ]; then
        echo "$(date): ALERT - Suspicious processes detected:" >> $LOG_FILE
        echo "$SUSPICIOUS" >> $LOG_FILE
        # Send alert (configure your alerting system)
    fi
}

# Check for new cron jobs
check_cron() {
    NEW_CRON=$(crontab -l 2>/dev/null | grep -E "\.esd101|/etc/de|5\.231\.31\.52")
    
    if [ ! -z "$NEW_CRON" ]; then
        echo "$(date): ALERT - Suspicious cron jobs detected:" >> $LOG_FILE
        echo "$NEW_CRON" >> $LOG_FILE
    fi
}

# Check for suspicious files
check_files() {
    SUSPICIOUS_FILES=$(find /var/www/survey-portal/apps/web -name "i386" -o -name "amd64" -o -name "am64" 2>/dev/null)
    
    if [ ! -z "$SUSPICIOUS_FILES" ]; then
        echo "$(date): ALERT - Suspicious files detected:" >> $LOG_FILE
        echo "$SUSPICIOUS_FILES" >> $LOG_FILE
    fi
}

check_processes
check_cron
check_files
```

Add to crontab (runs every 5 minutes):
```bash
*/5 * * * * /path/to/scripts/monitor-security.sh
```

### C. Log Monitoring

Set up log monitoring with alerts:

```bash
# Install logwatch
sudo apt install logwatch

# Configure logwatch
sudo nano /etc/logwatch/conf/logwatch.conf
```

### D. Backup Security

```bash
# Encrypt backups
tar -czf - /var/www/survey-portal | gpg --encrypt --recipient your@email.com > backup-$(date +%Y%m%d).tar.gz.gpg

# Verify backup integrity
gpg --decrypt backup-*.tar.gz.gpg | tar -tzf - > /dev/null
```

---

## 4. Application Security

### A. Environment Variables Security

```bash
# Never commit .env files
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore

# Use different secrets for each environment
# Rotate secrets regularly
# Use secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
```

### B. Database Security

```typescript
// Use parameterized queries (Prisma does this automatically)
// Never use string concatenation for SQL

// ❌ BAD
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD - Prisma handles this
const user = await prisma.user.findUnique({
  where: { email }
});
```

### C. Authentication Security

```typescript
// Use strong password requirements
const passwordSchema = z.string()
  .min(12)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

// Hash passwords (use bcrypt)
import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash(password, 12);

// Rate limit login attempts
// Implement 2FA
// Use secure session management
```

### D. File Upload Security

```typescript
// Validate file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadFile(file: File) {
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('File type not allowed');
  }
  
  // Validate size
  if (file.size > MAX_SIZE) {
    throw new Error('File too large');
  }
  
  // Scan for malware (use ClamAV or similar)
  // Store outside web root
  // Generate unique filename
  const filename = `${crypto.randomUUID()}-${file.name}`;
  
  // Save file
}
```

---

## 5. Monitoring & Detection

### A. Set Up Alerts

```typescript
// Create alerting utility
export async function sendSecurityAlert(
  severity: 'low' | 'medium' | 'high' | 'critical',
  message: string,
  details?: any
) {
  // Send to your alerting system (email, Slack, PagerDuty, etc.)
  console.error(`[${severity.toUpperCase()}] ${message}`, details);
  
  // In production, integrate with your monitoring system
  // await sendEmail('security@yourcompany.com', message);
  // await sendSlackWebhook(webhookUrl, { severity, message, details });
}
```

### B. Audit Logging

```typescript
// Log all security-relevant events
export function auditLog(action: string, userId: string, details?: any) {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip: 'req.ip', // Get from request
    details
  };
  
  // Write to secure log file or database
  // Never log sensitive data (passwords, tokens, etc.)
}
```

### C. Regular Security Audits

```bash
# Weekly security checklist
# 1. Check for dependency updates
npm audit

# 2. Review access logs
tail -n 1000 /var/log/nginx/access.log | grep -E "404|500|POST"

# 3. Check for suspicious processes
ps aux | grep -E "node|curl|wget"

# 4. Review cron jobs
crontab -l
ls -la /etc/cron.*

# 5. Check disk space (cryptominers can fill disk)
df -h

# 6. Review system logs
journalctl -xe | tail -100
```

---

## 6. Incident Response Plan

### A. Detection

- Automated monitoring (scripts, fail2ban)
- Manual checks (weekly audits)
- User reports

### B. Response Steps

1. **Contain**: Stop services, isolate affected systems
2. **Investigate**: Identify attack vector, assess damage
3. **Eradicate**: Remove malware, patch vulnerabilities
4. **Recover**: Restore from clean backups, restart services
5. **Document**: Record incident, update security measures

### C. Post-Incident

- Root cause analysis
- Update security measures
- Notify stakeholders (if required)
- Review and improve monitoring

---

## 7. Security Checklist

### Daily
- [ ] Monitor error logs
- [ ] Check for suspicious processes
- [ ] Review failed login attempts

### Weekly
- [ ] Run `npm audit`
- [ ] Review access logs
- [ ] Check for dependency updates
- [ ] Review cron jobs
- [ ] Verify backups

### Monthly
- [ ] Full security audit
- [ ] Review and rotate secrets
- [ ] Update all dependencies
- [ ] Review firewall rules
- [ ] Test incident response plan

### Quarterly
- [ ] Penetration testing
- [ ] Security training
- [ ] Review and update security policies
- [ ] Review access controls

---

## 8. Tools & Resources

### Security Tools
- **npm audit**: Dependency vulnerability scanning
- **Snyk**: Advanced dependency scanning
- **OWASP ZAP**: Web application security testing
- **fail2ban**: Intrusion prevention
- **ClamAV**: Antivirus scanning

### Learning Resources
- OWASP Top 10
- Next.js Security Best Practices
- Node.js Security Best Practices

---

## 9. Quick Reference: Security Do's and Don'ts

### ✅ DO
- Validate all user input
- Use parameterized queries
- Keep dependencies updated
- Use HTTPS everywhere
- Implement rate limiting
- Log security events
- Use strong passwords
- Encrypt sensitive data
- Regular backups
- Monitor your systems

### ❌ DON'T
- Trust user input
- Execute shell commands with user input
- Store secrets in code
- Use weak passwords
- Skip input validation
- Ignore security warnings
- Expose sensitive data in logs
- Use `eval()` or `Function()` with user input
- Skip security headers
- Ignore dependency updates

---

## 10. Implementation Priority

### Critical (Do Immediately)
1. Update Next.js
2. Add security headers
3. Implement input validation
4. Set up monitoring
5. Remove all malware

### High Priority (This Week)
1. Add rate limiting
2. Secure all server actions
3. Review and harden API routes
4. Set up fail2ban
5. Implement audit logging

### Medium Priority (This Month)
1. Set up automated dependency updates
2. Implement 2FA
3. Security training
4. Penetration testing
5. Review backup strategy

---

**Remember**: Security is an ongoing process, not a one-time task. Regular reviews and updates are essential.

