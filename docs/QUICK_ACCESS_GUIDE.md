# Quick Access Guide - pgAdmin & Database

## 🎯 Quick Answer

### Access pgAdmin (Remote)

```bash
# On your local computer, run:
ssh -L 8080:localhost:8080 root@62.72.29.150

# Keep that terminal open, then in your browser:
# Go to: http://localhost:8080
```

### Access pgAdmin (From Server)

```bash
# If you're already SSH'd into the server:
# Just open browser on server and go to:
http://localhost:8080
```

---

## 🔌 How Everything Connects

### 1. PM2 Services → PostgreSQL

**Connection:** `localhost:5432` (secure - only localhost)

```javascript
// In ecosystem.config.js
DATABASE_URL: 'postgresql://rc_survey_user:password@localhost:5432/rc_survey_db'
```

**Why it works:**
- PostgreSQL is exposed to `127.0.0.1:5432` (localhost only)
- PM2 services run on the host machine
- They connect via `localhost:5432`
- External IPs cannot access (secure ✅)

### 2. Docker Services → PostgreSQL

**Connection:** `postgres:5432` (via Docker internal network)

```yaml
# In docker-compose.yml
services:
  your-service:
    environment:
      - DATABASE_URL=postgresql://rc_survey_user:password@postgres:5432/rc_survey_db
    networks:
      - internal  # Same network as PostgreSQL
```

**Why it works:**
- Both services on `internal` Docker network
- Use hostname `postgres` (Docker service name)
- No port exposure needed
- External access blocked (secure ✅)

### 3. pgAdmin → PostgreSQL

**Connection:** Automatic via Docker network

- pgAdmin is in Docker container
- PostgreSQL is in Docker container
- Both on `internal` network
- pgAdmin automatically finds PostgreSQL
- No configuration needed

### 4. You → pgAdmin

**Connection:** SSH tunnel (secure)

```bash
ssh -L 8080:localhost:8080 root@62.72.29.150
# Then: http://localhost:8080
```

**Why it works:**
- pgAdmin is on `127.0.0.1:8080` (localhost only)
- SSH tunnel forwards your local port 8080 to server's localhost:8080
- Encrypted through SSH (secure ✅)

---

## 📊 Connection Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Your Computer                        │
│                                                         │
│  Browser → http://localhost:8080                        │
│       ↑                                                 │
│       │ SSH Tunnel                                      │
└───────┼─────────────────────────────────────────────────┘
        │
        │ ssh -L 8080:localhost:8080 root@62.72.29.150
        │
┌───────┼─────────────────────────────────────────────────┐
│       │            Server (62.72.29.150)                │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────────────────────────────┐               │
│  │  Docker Network (internal)          │               │
│  │                                     │               │
│  │  ┌──────────┐      ┌──────────┐    │               │
│  │  │ pgAdmin  │──────│PostgreSQL│    │               │
│  │  │ :8080    │      │ :5432    │    │               │
│  │  │(localhost│      │(localhost│    │               │
│  │  │ only)    │      │ only)    │    │               │
│  │  └──────────┘      └──────────┘    │               │
│  │       │                  │          │               │
│  └───────┼──────────────────┼──────────┘               │
│          │                  │                           │
│          │                  │                           │
│  ┌───────▼──────────────────▼──────────┐              │
│  │  Host Machine (PM2 Services)         │              │
│  │                                      │              │
│  │  PM2 Service → localhost:5432        │              │
│  │  (connects to PostgreSQL)            │              │
│  └──────────────────────────────────────┘              │
│                                                         │
│  External Internet:                                     │
│  ❌ Cannot access :5432 (blocked)                      │
│  ❌ Cannot access :8080 (blocked)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Steps

### Step 1: Update docker-compose.db.yml (Already Done ✅)

PostgreSQL now exposes to `127.0.0.1:5432` (localhost only)

### Step 2: Restart Docker Containers

```bash
cd infra/docker
docker-compose -f docker-compose.db.yml down
docker-compose -f docker-compose.db.yml up -d
```

### Step 3: Verify PM2 Can Connect

```bash
# Test connection
psql -h localhost -U rc_survey_user -d rc_survey_db
# Enter password when prompted
# Should connect successfully
```

### Step 4: Access pgAdmin

**Option A: SSH Tunnel (Recommended)**
```bash
# On your local machine
ssh -L 8080:localhost:8080 root@62.72.29.150

# Keep terminal open, then:
# Browser → http://localhost:8080
```

**Option B: From Server**
```bash
# If you have browser access on server
# Just go to: http://localhost:8080
```

### Step 5: Configure pgAdmin

1. Login with:
   - Email: `admin@rc-survey.com` (or from .env)
   - Password: Your `PGADMIN_PASSWORD` from .env

2. Add PostgreSQL Server:
   - Right-click "Servers" → "Register" → "Server"
   - **General Tab:**
     - Name: `Survey Database`
   - **Connection Tab:**
     - Host: `postgres` (Docker service name)
     - Port: `5432`
     - Username: `rc_survey_user` (or from .env)
     - Password: Your `POSTGRES_PASSWORD` from .env
   - Click "Save"

---

## ✅ Verification Checklist

- [ ] PostgreSQL accessible from host: `psql -h localhost -U user -d db`
- [ ] PostgreSQL NOT accessible externally: `nmap -p 5432 YOUR_IP` (should be closed)
- [ ] pgAdmin accessible via SSH tunnel: `http://localhost:8080`
- [ ] pgAdmin NOT accessible externally: `curl http://YOUR_IP:8080` (should fail)
- [ ] PM2 services connect to database (check logs)
- [ ] Docker services connect to database (check logs)

---

## 🆘 Common Issues

### "Connection refused" when accessing pgAdmin

**This is CORRECT!** pgAdmin is secured. Use SSH tunnel:
```bash
ssh -L 8080:localhost:8080 root@62.72.29.150
```

### PM2 services can't connect to database

**Check:**
1. PostgreSQL port is exposed: `127.0.0.1:5432:5432` in docker-compose
2. Password matches in .env and ecosystem.config.js
3. Test: `psql -h localhost -U user -d db`

### Docker services can't connect to database

**Check:**
1. Both services on `internal` network
2. Use hostname `postgres` (not `localhost`)
3. Connection string: `postgresql://user:pass@postgres:5432/db`

---

**Remember**: The "connection refused" error is **GOOD** - it means your services are secure! Use SSH tunnel for remote access.

