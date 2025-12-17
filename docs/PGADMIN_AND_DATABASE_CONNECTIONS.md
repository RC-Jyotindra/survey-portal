# pgAdmin Access & Database Connections Guide

## 🔐 Current Security Configuration

After securing your database:
- **PostgreSQL**: Only accessible within Docker internal network (not exposed to internet)
- **pgAdmin**: Only accessible from `localhost:8080` (not `0.0.0.0:8080`)

This is why you're getting `ERR_CONNECTION_REFUSED` when trying to access `62.72.29.150:8080` from outside - **this is correct and secure!**

---

## 🌐 How to Access pgAdmin

### Option 1: SSH Tunnel (Recommended for Remote Access)

If you're accessing from your local machine:

```bash
# Create SSH tunnel
ssh -L 8080:localhost:8080 root@62.72.29.150

# Keep this terminal open, then in your browser:
# Go to: http://localhost:8080
```

**What this does:**
- Creates a secure tunnel through SSH
- Forwards local port 8080 to server's localhost:8080
- pgAdmin is accessible at `http://localhost:8080` in your browser
- Connection is encrypted through SSH

### Option 2: Access from Server Directly

If you're already on the server:

```bash
# From the server terminal
curl http://localhost:8080
# Or open in browser if you have GUI access
```

### Option 3: Use VNC/Remote Desktop

If you have VNC or remote desktop access to the server:
- Open browser on the server
- Navigate to `http://localhost:8080`

### Option 4: Temporary Port Exposure (Development Only)

**⚠️ WARNING: Only for development, remove in production!**

If you need external access temporarily:

```yaml
# In docker-compose.db.yml (TEMPORARY - REMOVE IN PRODUCTION)
pgadmin:
  ports:
    - "8080:80"  # Exposes to 0.0.0.0:8080
```

Then access at: `http://62.72.29.150:8080`

**Remember to revert this after testing!**

---

## 🔌 How Services Connect to PostgreSQL

### 1. Docker Services (Internal Network)

Services running in Docker containers connect via **internal Docker network**:

```yaml
# In docker-compose.yml or docker-compose.db.yml
services:
  postgres:
    networks:
      - internal  # Internal network
  
  your-service:
    networks:
      - internal  # Same network
    environment:
      - DATABASE_URL=postgresql://rc_survey_user:password@postgres:5432/rc_survey_db
      # Note: hostname is "postgres" (Docker service name), not "localhost"
```

**Connection Details:**
- **Host**: `postgres` (Docker service name)
- **Port**: `5432` (internal, not exposed)
- **Network**: `internal` (Docker network)
- **No external access needed**

### 2. PM2 Services (Host Machine)

Services running via PM2 on the host machine connect via **localhost**:

```javascript
// In ecosystem.config.js
env_production: {
  DATABASE_URL: 'postgresql://rc_survey_user:password@localhost:5432/rc_survey_db'
  // Note: Uses "localhost" because PM2 runs on host, not in Docker
}
```

**But wait!** PostgreSQL is now only on internal network. We need to expose it to host for PM2 services.

### 3. Solution: Expose PostgreSQL to Host Only

Update `docker-compose.db.yml`:

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # Only localhost, not 0.0.0.0
  # This allows PM2 services on host to connect via localhost:5432
  # But still blocks external internet access
```

**This is secure because:**
- Only `127.0.0.1` (localhost) can connect
- External IPs cannot access port 5432
- PM2 services on the same host can connect

---

## 📋 Complete Connection Matrix

| Service | Location | Connects To | Connection String |
|---------|----------|------------|-------------------|
| **Docker Services** | Docker containers | PostgreSQL container | `postgresql://user:pass@postgres:5432/db` |
| **PM2 Services** | Host machine | PostgreSQL (localhost) | `postgresql://user:pass@localhost:5432/db` |
| **pgAdmin** | Docker container | PostgreSQL container | Via Docker network (automatic) |
| **You (Remote)** | Your computer | pgAdmin | SSH tunnel: `ssh -L 8080:localhost:8080 user@server` |

---

## 🔧 Updated Secure Configuration

### docker-compose.db.yml (Updated)

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    # SECURITY: Only expose to localhost (for PM2 services on host)
    # External IPs cannot access this port
    ports:
      - "127.0.0.1:5432:5432"  # localhost only, not 0.0.0.0
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-rc_survey_db}
      - POSTGRES_USER=${POSTGRES_USER:-rc_survey_user}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - internal
    restart: unless-stopped

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: pgadmin
    # SECURITY: Only localhost (use SSH tunnel for remote access)
    ports:
      - "127.0.0.1:8080:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_EMAIL:-admin@rc-survey.com}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD}
    volumes:
      - pgadmin-data:/var/lib/pgadmin
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

networks:
  internal:
    driver: bridge

volumes:
  postgres-data:
  pgadmin-data:
```

---

## 🚀 Step-by-Step Setup

### Step 1: Update docker-compose.db.yml

Add localhost-only port exposure for PostgreSQL:

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # Add this line
```

### Step 2: Restart Docker Containers

```bash
cd infra/docker
docker-compose -f docker-compose.db.yml down
docker-compose -f docker-compose.db.yml up -d
```

### Step 3: Verify Connections

**Test PostgreSQL from host (for PM2):**
```bash
# Should work (localhost)
psql -h localhost -U rc_survey_user -d rc_survey_db
# Enter password when prompted
```

**Test PostgreSQL from external (should fail):**
```bash
# From another machine
psql -h 62.72.29.150 -U rc_survey_user -d rc_survey_db
# Should fail: connection refused
```

**Test pgAdmin via SSH tunnel:**
```bash
# On your local machine
ssh -L 8080:localhost:8080 root@62.72.29.150

# Keep terminal open, then in browser:
# http://localhost:8080
```

### Step 4: Configure pgAdmin in Browser

Once connected via SSH tunnel:

1. Open `http://localhost:8080` in browser
2. Login with:
   - Email: `admin@rc-survey.com` (or from .env)
   - Password: Your `PGADMIN_PASSWORD` from .env
3. Add PostgreSQL server:
   - **Name**: `Survey Database` (any name)
   - **Host**: `postgres` (Docker service name)
   - **Port**: `5432`
   - **Username**: `rc_survey_user` (or from .env)
   - **Password**: Your `POSTGRES_PASSWORD` from .env
   - **Save password**: ✅ (optional)

---

## 🔍 Verify Security

### Check Port Bindings

```bash
# Check PostgreSQL is only on localhost
sudo netstat -tuln | grep 5432
# Should show: tcp 0 0 127.0.0.1:5432

# Check pgAdmin is only on localhost
sudo netstat -tuln | grep 8080
# Should show: tcp 0 0 127.0.0.1:8080
```

### Test External Access (Should Fail)

```bash
# From another machine or use curl
curl http://62.72.29.150:8080
# Should fail: Connection refused

# Test PostgreSQL port
nmap -p 5432 62.72.29.150
# Should show: closed or filtered
```

---

## 🛡️ Security Benefits

### Before (Insecure):
- ❌ PostgreSQL: `0.0.0.0:5432` (accessible from internet)
- ❌ pgAdmin: `0.0.0.0:8080` (accessible from internet)
- ❌ Weak passwords
- ❌ Anyone could access your database

### After (Secure):
- ✅ PostgreSQL: `127.0.0.1:5432` (localhost only)
- ✅ pgAdmin: `127.0.0.1:8080` (localhost only)
- ✅ Strong passwords required
- ✅ Only authorized users via SSH tunnel can access
- ✅ Services can still connect (via localhost or Docker network)

---

## 📝 Quick Reference

### Access pgAdmin:
```bash
# From your local machine
ssh -L 8080:localhost:8080 root@62.72.29.150
# Then: http://localhost:8080
```

### Connect to PostgreSQL:
```bash
# From host (for PM2 services)
psql -h localhost -U rc_survey_user -d rc_survey_db

# From Docker container
docker exec -it postgres psql -U rc_survey_user -d rc_survey_db
```

### Connection Strings:
```javascript
// For PM2 services (on host)
DATABASE_URL=postgresql://rc_survey_user:password@localhost:5432/rc_survey_db

// For Docker services (in containers)
DATABASE_URL=postgresql://rc_survey_user:password@postgres:5432/rc_survey_db
```

---

## ⚠️ Troubleshooting

### Issue: Can't connect to pgAdmin

**Solution:**
- Use SSH tunnel: `ssh -L 8080:localhost:8080 user@server`
- Verify pgAdmin is running: `docker ps | grep pgadmin`
- Check logs: `docker logs pgadmin`

### Issue: PM2 services can't connect to database

**Solution:**
- Verify PostgreSQL port is exposed to localhost: `127.0.0.1:5432:5432`
- Check password matches in .env and ecosystem.config.js
- Test connection: `psql -h localhost -U user -d db`

### Issue: Docker services can't connect to database

**Solution:**
- Verify both services are on `internal` network
- Use hostname `postgres` (not `localhost`)
- Check network: `docker network inspect docker_internal`

---

**Remember**: The connection refused error you saw is **GOOD** - it means your database is now secure! Use SSH tunnel to access pgAdmin remotely.

