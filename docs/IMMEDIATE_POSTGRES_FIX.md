# 🚨 IMMEDIATE PostgreSQL Security Fix

## Critical Issues Found

Your PostgreSQL database has **THE SAME VULNERABILITIES** as Redis had:

1. ❌ **Exposed to internet** on port `5432:5432`
2. ❌ **Weak password**: `rc_survey_password`
3. ❌ **pgAdmin exposed** on port `8080:80`
4. ❌ **Extremely weak pgAdmin password**: `admin123`
5. ❌ **Hardcoded credentials** in docker-compose file

## ✅ What Has Been Fixed

### 1. Docker Compose Updated
- ✅ Removed PostgreSQL port exposure
- ✅ Added environment variable support for passwords
- ✅ Created internal Docker network
- ✅ Secured pgAdmin (localhost only)
- ✅ Added security settings

### 2. Ecosystem Config Updated
- ✅ Removed hardcoded database password
- ✅ Uses environment variables

## 🔧 Steps to Apply Fixes

### Step 1: Generate Strong Passwords

```bash
# Generate PostgreSQL password
openssl rand -base64 32

# Generate pgAdmin password  
openssl rand -base64 32
```

### Step 2: Create .env File

```bash
cd infra/docker
nano .env
```

Add (or update existing .env):
```env
# PostgreSQL Configuration
POSTGRES_DB=rc_survey_db
POSTGRES_USER=rc_survey_user
POSTGRES_PASSWORD=your_generated_postgres_password_here

# pgAdmin Configuration
PGADMIN_EMAIL=admin@rc-survey.com
PGADMIN_PASSWORD=your_generated_pgadmin_password_here
```

### Step 3: Set Environment Variables for PM2

```bash
# Export PostgreSQL password (must match .env file)
export POSTGRES_PASSWORD=your_generated_postgres_password_here
export POSTGRES_USER=rc_survey_user
export POSTGRES_DB=rc_survey_db

# Make permanent (add to ~/.bashrc)
echo 'export POSTGRES_PASSWORD=your_generated_postgres_password_here' >> ~/.bashrc
echo 'export POSTGRES_USER=rc_survey_user' >> ~/.bashrc
echo 'export POSTGRES_DB=rc_survey_db' >> ~/.bashrc
source ~/.bashrc
```

### Step 4: Restart Docker Containers

```bash
cd infra/docker

# Stop existing containers
docker-compose -f docker-compose.db.yml down

# Start with new configuration
docker-compose -f docker-compose.db.yml up -d

# Verify PostgreSQL is not exposed
docker-compose -f docker-compose.db.yml ps
# PostgreSQL should NOT show port 5432 in the ports column
```

### Step 5: Restart PM2 Services

```bash
# Stop services
pm2 stop all

# Start with environment variables
pm2 start ecosystem.config.js --env production

# Verify database connection
pm2 logs rc-survey-service | grep -i "database\|postgres\|prisma"
# Should show successful connection
```

### Step 6: Verify Security

```bash
# PostgreSQL should NOT be accessible from outside
nmap -p 5432 YOUR_SERVER_IP
# Should show port as closed/filtered

# pgAdmin should only be accessible from localhost
curl http://YOUR_SERVER_IP:8080
# Should fail (connection refused)

# From localhost, should work
curl http://localhost:8080
# Should return pgAdmin login page
```

## 🔒 Additional Security Measures

### 1. Firewall Rules

```bash
# Block PostgreSQL port from external access
sudo ufw deny 5432
sudo iptables -A INPUT -p tcp --dport 5432 ! -s 127.0.0.1 -j DROP
sudo iptables-save > /etc/iptables/rules.v4
```

### 2. Access pgAdmin Securely

**Option A: SSH Tunnel (Recommended)**
```bash
# From your local machine
ssh -L 8080:localhost:8080 user@your-server

# Then access http://localhost:8080 in your browser
```

**Option B: Remove pgAdmin in Production**
- Only use in development
- Comment out pgAdmin service in production

### 3. Monitor Database Access

```bash
# Check PostgreSQL connections
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT * FROM pg_stat_activity;"

# Check for suspicious connections
docker logs postgres | grep -i "error\|failed\|authentication"
```

## ⚠️ Important Notes

1. **Passwords Must Match**: 
   - `infra/docker/.env` (for Docker)
   - Environment variables (for PM2)
   - Must be the same!

2. **Application Connection**: 
   - Applications connect via Docker network (internal)
   - Use hostname `postgres` (not `localhost`)
   - Port is `5432` (internal, not exposed)

3. **pgAdmin Access**:
   - Only accessible from `localhost:8080`
   - Use SSH tunnel for remote access
   - Or remove in production

## 📋 Checklist

- [ ] Generated strong PostgreSQL password
- [ ] Generated strong pgAdmin password
- [ ] Created/updated .env file
- [ ] Set POSTGRES_PASSWORD environment variable
- [ ] Restarted Docker containers
- [ ] Verified PostgreSQL is not exposed externally
- [ ] Verified pgAdmin is localhost only
- [ ] Restarted PM2 services
- [ ] Verified application connects to database
- [ ] Set up firewall rules
- [ ] Tested pgAdmin access (via SSH tunnel)

## 🆘 Troubleshooting

### Issue: Application can't connect to database

**Solution:**
1. Check password matches in .env and environment variable
2. Verify Docker network: `docker network inspect docker_internal`
3. Check PostgreSQL logs: `docker logs postgres`
4. Verify service is on internal network

### Issue: PostgreSQL still accessible from outside

**Solution:**
1. Verify ports are removed from docker-compose.yml
2. Check firewall: `sudo ufw status`
3. Verify Docker network: `docker network inspect docker_internal`

### Issue: pgAdmin not accessible

**Solution:**
- Use SSH tunnel: `ssh -L 8080:localhost:8080 user@server`
- Or access from server directly: `curl http://localhost:8080`

## 📚 Related Files

- `infra/docker/docker-compose.db.yml` - Database Docker configuration
- `infra/docker/.env` - Environment variables (should include POSTGRES_PASSWORD)
- `ecosystem.config.js` - PM2 configuration (updated to use env vars)
- `docs/POSTGRES_SECURITY_ANALYSIS.md` - Detailed security analysis

---

**Status**: PostgreSQL is now secured. Remember to set POSTGRES_PASSWORD environment variable before starting services!

