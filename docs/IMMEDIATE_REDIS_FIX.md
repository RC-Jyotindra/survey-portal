# 🚨 IMMEDIATE Redis Security Fix

## Critical Issue
Your Redis container is exposed to the internet on `0.0.0.0:6379` with **NO AUTHENTICATION**. This is a **CRITICAL SECURITY VULNERABILITY**.

## Attack Chain
1. Attacker exploited React2Shell (CVE-2025-55182) in Next.js 15.4.2
2. Gained RCE on your server
3. Discovered Redis exposed on port 6379
4. Exploited Redis (no password required!)
5. Used Redis for persistence and further attacks

## ✅ What Has Been Fixed

### 1. Docker Compose Updated
- ✅ Removed port exposure (`ports: - "6379:6379"`)
- ✅ Added Redis password authentication
- ✅ Created internal Docker network
- ✅ Added protected mode

### 2. Package.json Updated
- ✅ Next.js: 15.4.2 → 15.5.7 (patches React2Shell)
- ✅ React: 19.1.0 → 19.2.1 (patches React2Shell)
- ✅ React-DOM: 19.1.0 → 19.2.1 (patches React2Shell)

### 3. Redis Configuration Created
- ✅ Created `infra/docker/redis.conf` with security settings

## 🔧 Steps to Apply Fixes

### Step 1: Generate Strong Redis Password

```bash
# Generate a strong password
openssl rand -base64 32

# Example output: xK9mP2qL8vN4rT6wY1zA3bC5dE7fG9h
```

### Step 2: Create .env File

```bash
cd infra/docker
cp .env.example .env
nano .env  # or use your preferred editor
```

Set the password:
```env
REDIS_PASSWORD=xK9mP2qL8vN4rT6wY1zA3bC5dE7fG9h
```

### Step 3: Update Application Code

Update all services that connect to Redis to use the password:

**Example (Node.js):**
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  password: process.env.REDIS_PASSWORD, // REQUIRED
  db: 0
});
```

**Example (survey-service):**
```typescript
// In services/survey-service/.env or environment variables
REDIS_PASSWORD=${REDIS_PASSWORD}
```

### Step 4: Restart Docker Containers

```bash
cd infra/docker

# Stop existing containers
docker-compose down

# Start with new configuration
docker-compose up -d

# Verify Redis is not exposed
docker-compose ps
# Redis should NOT show port 6379 in the ports column

# Test Redis connection (should require password)
docker exec -it redis redis-cli ping
# Should return: (error) NOAUTH Authentication required

# Test with password
docker exec -it redis redis-cli -a ${REDIS_PASSWORD} ping
# Should return: PONG
```

### Step 5: Verify Security

```bash
# Check Redis is NOT accessible from outside
nmap -p 6379 YOUR_SERVER_IP
# Should show port 6379 as closed/filtered

# Check Redis is only listening on localhost inside container
docker exec redis netstat -tuln | grep 6379
# Should show: tcp 0 0 127.0.0.1:6379

# Verify password is required
redis-cli -h YOUR_SERVER_IP -p 6379 ping
# Should fail (connection refused or auth required)
```

### Step 6: Update Next.js and React

```bash
cd apps/web
npm install
npm audit fix --force

# Verify versions
npm list next react react-dom
# Should show:
# next@15.5.7
# react@19.2.1
# react-dom@19.2.1
```

## 🔒 Additional Security Measures

### 1. Firewall Rules

```bash
# Block Redis port from external access (if not already done)
sudo ufw deny 6379
sudo iptables -A INPUT -p tcp --dport 6379 ! -s 127.0.0.1 -j DROP
sudo iptables-save > /etc/iptables/rules.v4
```

### 2. Monitor Redis Access

```bash
# Check Redis connections
docker exec redis redis-cli -a ${REDIS_PASSWORD} CLIENT LIST

# Monitor Redis commands (for debugging)
docker exec redis redis-cli -a ${REDIS_PASSWORD} MONITOR
```

### 3. Regular Security Checks

```bash
# Weekly check: Verify Redis is not exposed
nmap -p 6379 YOUR_SERVER_IP

# Weekly check: Verify password is required
redis-cli -h YOUR_SERVER_IP -p 6379 ping
# Should fail

# Weekly check: Review Redis logs
docker logs redis | grep -i "auth\|error\|warning"
```

## ⚠️ Important Notes

1. **Never expose Redis ports** in docker-compose.yml
2. **Always use strong passwords** (32+ characters, random)
3. **Never commit .env files** to version control
4. **Use internal Docker networks** for service communication
5. **Monitor Redis access** regularly
6. **Keep Redis updated** to latest version

## 📋 Checklist

- [ ] Generated strong Redis password
- [ ] Created .env file with REDIS_PASSWORD
- [ ] Updated docker-compose.yml (already done ✅)
- [ ] Updated package.json (already done ✅)
- [ ] Updated application code to use Redis password
- [ ] Restarted Docker containers
- [ ] Verified Redis is not exposed externally
- [ ] Verified password authentication works
- [ ] Set up firewall rules
- [ ] Updated Next.js and React
- [ ] Tested application still works

## 🆘 Troubleshooting

### Issue: Application can't connect to Redis

**Solution:** Make sure:
1. Application uses the same password from .env
2. Application connects to `redis` hostname (Docker service name)
3. Application is on the same Docker network (`internal`)

### Issue: Redis still accessible from outside

**Solution:**
1. Verify ports are removed from docker-compose.yml
2. Check firewall rules: `sudo ufw status`
3. Verify Docker network: `docker network inspect docker_internal`

### Issue: Health check fails

**Solution:** Update healthcheck command in docker-compose.yml:
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
```

## 📚 References

- See `docs/REACT2SHELL_REDIS_EXPLOITATION_ANALYSIS.md` for detailed analysis
- See `docs/SECURITY_HARDENING_GUIDE.md` for comprehensive security measures

---

**Status**: Redis is now secured. Next steps: Update application code and restart containers.

