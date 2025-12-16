# Quick Security Setup - Start Here

## 🚀 Immediate Actions (30 minutes)

### Step 1: Update Next.js (5 minutes)
```bash
cd apps/web
npm update next@latest
npm audit fix --force
```

### Step 2: Install Security Dependencies (2 minutes)
```bash
cd apps/web
npm install zod
```

### Step 3: Security Headers (Already Done ✅)
The `next.config.js` has been updated with security headers.

### Step 4: Create Validation Utilities (Already Done ✅)
The `apps/web/lib/validation.ts` file has been created.

### Step 5: Review Your Server Actions (15 minutes)

Search for vulnerable patterns:
```bash
# Find all server actions
find apps/web/app -name "*.ts" -o -name "*.tsx" | xargs grep -l "use server"

# Find redirect calls
grep -r "redirect(" apps/web/app/

# Find any exec/spawn calls
grep -r "exec\|spawn" apps/web/
```

**For each server action, ensure:**
1. ✅ Input is validated using Zod schemas
2. ✅ No direct user input in redirects
3. ✅ No shell command execution with user input
4. ✅ Rate limiting is implemented

### Step 6: Set Up Monitoring Script (5 minutes)

```bash
# Make the monitoring script executable
chmod +x scripts/monitor-security.sh

# Add to crontab (runs every 5 minutes)
crontab -e
# Add this line:
*/5 * * * * /var/www/survey-portal/scripts/monitor-security.sh
```

---

## 📋 Implementation Checklist

### Critical (Do Today)
- [ ] Update Next.js to latest version
- [ ] Review all server actions for input validation
- [ ] Add validation to all API routes
- [ ] Set up monitoring script
- [ ] Block malicious IP: `5.231.31.52`

### High Priority (This Week)
- [ ] Review all redirect() calls
- [ ] Add rate limiting to server actions
- [ ] Set up fail2ban
- [ ] Review and harden authentication
- [ ] Set up automated dependency updates

### Medium Priority (This Month)
- [ ] Implement 2FA
- [ ] Security audit of all code
- [ ] Set up backup encryption
- [ ] Penetration testing
- [ ] Security training

---

## 🔍 How to Use the Validation Utilities

### Example: Secure Server Action

```typescript
// apps/web/app/actions/create-survey.ts
'use server';

import { z } from 'zod';
import { slugSchema, commonSchemas } from '@/lib/validation';

const createSurveySchema = z.object({
  title: commonSchemas.title,
  slug: slugSchema,
  description: commonSchemas.description
});

export async function createSurvey(formData: FormData) {
  // Validate input
  const result = createSurveySchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    description: formData.get('description')
  });
  
  if (!result.success) {
    return { error: 'Validation failed', details: result.error.errors };
  }
  
  // Use validated data
  const { title, slug, description } = result.data;
  
  // Create survey...
  return { success: true };
}
```

### Example: Secure Redirect

```typescript
// ❌ BAD - Don't do this
import { redirect } from 'next/navigation';

export async function handleRedirect(formData: FormData) {
  const url = formData.get('redirectUrl');
  redirect(url); // DANGEROUS!
}

// ✅ GOOD - Do this instead
import { redirect } from 'next/navigation';
import { redirectUrlSchema } from '@/lib/validation';

export async function handleRedirect(formData: FormData) {
  const url = formData.get('redirectUrl');
  
  // Validate URL
  const result = redirectUrlSchema.safeParse(url);
  if (!result.success) {
    redirect('/'); // Fallback to safe URL
    return;
  }
  
  redirect(result.data);
}
```

---

## 🛡️ Security Best Practices Summary

1. **Always validate input** - Use Zod schemas
2. **Never trust user input** - Sanitize everything
3. **Use security headers** - Already configured ✅
4. **Rate limit everything** - Prevent brute force
5. **Monitor your systems** - Detect attacks early
6. **Keep dependencies updated** - Patch vulnerabilities
7. **Use HTTPS only** - Encrypt all traffic
8. **Log security events** - Track suspicious activity
9. **Regular backups** - Recover from attacks
10. **Test your security** - Regular audits

---

## 📚 Next Steps

1. Read `docs/SECURITY_HARDENING_GUIDE.md` for comprehensive security measures
2. Read `docs/ATTACK_VECTOR_ANALYSIS.md` to understand how the attack happened
3. Review `docs/SECURITY_BREACH_ANALYSIS.md` for incident response

---

## 🆘 If You See Suspicious Activity

1. **Stop services immediately**: `pm2 stop all`
2. **Check processes**: `ps aux | grep -E "curl|wget|node"`
3. **Check cron jobs**: `crontab -l`
4. **Review logs**: `tail -f /var/www/survey-portal/logs/web-error.log`
5. **Block IPs**: `iptables -A INPUT -s <IP> -j DROP`
6. **Contact security team** (if you have one)

---

**Remember**: Security is an ongoing process. Regular reviews and updates are essential to prevent future attacks.

