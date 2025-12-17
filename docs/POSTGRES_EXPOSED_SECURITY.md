# PostgreSQL Exposed Ports - Security Guide

## ⚠️ Current Configuration

You've chosen to keep PostgreSQL and pgAdmin ports exposed for easier access. This is **convenient but requires extra security measures**.

**Exposed Ports:**
- PostgreSQL: `5432` (accessible from internet)
- pgAdmin: `8080` (accessible from internet)

---

## 🛡️ Critical Security Measures (MUST DO)

### 1. Use STRONG Passwords (CRITICAL!)

**Generate strong passwords:**
```bash
# PostgreSQL password
openssl rand -base64 32

# pgAdmin password
openssl rand -base64 32
```

**Set in .env file:**
```bash
cd infra/docker
nano .env
```

```env
# PostgreSQL - MUST be strong!
POSTGRES_PASSWORD=your_very_strong_password_here_32_chars_minimum

# pgAdmin - MUST be strong!
PGADMIN_PASSWORD=your_very_strong_password_here_32_chars_minimum
```

### 2. Set Up Firewall Rules (HIGHLY RECOMMENDED)

**Option A: Allow Only Your IP**
```bash
# Replace YOUR_IP with your actual IP address
sudo ufw allow from YOUR_IP to any port 5432
sudo ufw allow from YOUR_IP to any port 8080
sudo ufw deny 5432
sudo ufw deny 8080
sudo ufw enable
```

**Option B: Use IPTables (More Granular)**
```bash
# Allow only your IP
sudo iptables -A INPUT -p tcp --dport 5432 -s YOUR_IP -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5432 -j DROP

sudo iptables -A INPUT -p tcp --dport 8080 -s YOUR_IP -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j DROP

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

**Find your IP:**
```bash
# From your local machine
curl ifconfig.me
```

### 3. Change Default Credentials

**Never use:**
- ❌ `rc_survey_password`
- ❌ `admin123`
- ❌ Any dictionary words
- ❌ Short passwords (< 20 characters)

**Always use:**
- ✅ Random 32+ character passwords
- ✅ Mix of letters, numbers, symbols
- ✅ Different passwords for each service

### 4. Enable PostgreSQL SSL (Recommended)

Update `docker-compose.db.yml`:
```yaml
postgres:
  environment:
    - POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256
    # Add SSL configuration
  command: postgres -c ssl=on -c ssl_cert_file=/var/lib/postgresql/server.crt
```

### 5. Monitor Access Logs

```bash
# Monitor PostgreSQL connections
docker logs -f postgres | grep -i "connection\|authentication\|error"

# Monitor pgAdmin access
docker logs -f pgadmin | grep -i "login\|access\|error"

# Check active connections
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT * FROM pg_stat_activity;"
```

### 6. Set Up Fail2Ban

```bash
# Install fail2ban
sudo apt install fail2ban

# Create PostgreSQL jail
sudo nano /etc/fail2ban/jail.d/postgresql.conf
```

```ini
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql.log
maxretry = 3
bantime = 3600
```

---

## 🔍 Regular Security Checks

### Daily
- [ ] Check PostgreSQL logs for failed login attempts
- [ ] Monitor active connections
- [ ] Review pgAdmin access logs

### Weekly
- [ ] Review firewall rules
- [ ] Check for unauthorized connections
- [ ] Verify passwords are still strong
- [ ] Update passwords if needed

### Monthly
- [ ] Full security audit
- [ ] Review and rotate passwords
- [ ] Check for PostgreSQL updates
- [ ] Review access patterns

---

## 🚨 Warning Signs to Watch For

**Immediate action required if you see:**
- Multiple failed login attempts
- Connections from unknown IPs
- Unusual database activity
- Unexpected data changes
- High CPU/memory usage

**Commands to check:**
```bash
# Check failed login attempts
docker logs postgres | grep -i "authentication\|failed\|error" | tail -50

# Check active connections
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT datname, usename, client_addr, state FROM pg_stat_activity WHERE state = 'active';"

# Check for suspicious IPs
docker logs postgres | grep -E "connection.*from" | awk '{print $NF}' | sort | uniq -c | sort -rn
```

---

## 📋 Security Checklist

### Immediate (Do Now)
- [ ] Generate strong passwords (32+ characters)
- [ ] Set passwords in .env file
- [ ] Set up firewall rules (allow only your IP)
- [ ] Change default credentials
- [ ] Enable fail2ban

### This Week
- [ ] Set up monitoring/alerts
- [ ] Review access logs
- [ ] Test firewall rules
- [ ] Document access procedures

### This Month
- [ ] Consider moving to localhost-only (more secure)
- [ ] Set up SSL/TLS
- [ ] Implement IP whitelist
- [ ] Security audit

---

## 🔄 Migration Path (When Ready)

When you're ready to secure further:

1. **Move to localhost-only:**
   ```yaml
   ports:
     - "127.0.0.1:5432:5432"
     - "127.0.0.1:8080:80"
   ```

2. **Use SSH tunnel:**
   ```bash
   ssh -L 8080:localhost:8080 root@62.72.29.150
   ```

3. **Or use VPN:**
   - Set up VPN server
   - Connect via VPN
   - Access services through VPN

---

## ⚠️ Risk Assessment

**Current Risk Level: MEDIUM-HIGH**

**Risks:**
- 🔴 Database accessible from internet
- 🔴 pgAdmin accessible from internet
- 🟡 Brute force attacks possible
- 🟡 Credential theft if passwords weak

**Mitigations:**
- ✅ Strong passwords (reduces risk significantly)
- ✅ Firewall rules (blocks most attackers)
- ✅ Monitoring (detects attacks)
- ✅ Fail2ban (auto-blocks attackers)

---

## 📚 Quick Reference

### Access pgAdmin
```
http://62.72.29.150:8080
Email: admin@rc-survey.com (or from .env)
Password: Your PGADMIN_PASSWORD from .env
```

### Connect to PostgreSQL
```bash
psql -h 62.72.29.150 -U rc_survey_user -d rc_survey_db
# Enter password when prompted
```

### Check Security
```bash
# Verify firewall
sudo ufw status

# Check logs
docker logs postgres | tail -50
docker logs pgadmin | tail -50

# Monitor connections
watch -n 5 'docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT count(*) FROM pg_stat_activity;"'
```

---

**Remember**: With exposed ports, strong passwords and firewall rules are **CRITICAL**. Don't skip these security measures!

