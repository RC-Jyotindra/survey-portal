# Quick Startup Guide

## 🚀 Start Everything in Order

### Step 1: Set Environment Variables

```bash
# Set passwords (use same values as in infra/docker/.env)
export POSTGRES_PASSWORD=your_strong_password_here
export POSTGRES_USER=rc_survey_user
export POSTGRES_DB=rc_survey_db

export REDIS_PASSWORD=your_strong_redis_password_here

# Make permanent (optional)
echo 'export POSTGRES_PASSWORD=your_strong_password_here' >> ~/.bashrc
echo 'export REDIS_PASSWORD=your_strong_redis_password_here' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: Start Docker Services

```bash
cd infra/docker

# Start database services
docker-compose -f docker-compose.db.yml up -d

# Start infrastructure services (Kafka, Redis, Event Consumer)
docker-compose -f docker-compose.yml up -d

# Or start everything at once
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d
```

**Verify:**
```bash
docker ps
# Should show: postgres, pgadmin, kafka, redis, event-consumer
```

### Step 3: Start PM2 Services

```bash
# Make sure environment variables are still set
export POSTGRES_PASSWORD=your_strong_password_here
export REDIS_PASSWORD=your_strong_redis_password_here

# Start all services
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs
```

---

## 🔌 DATABASE_URL Format

### For PM2 Services (ecosystem.config.js)

**Format:**
```
postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE
```

**Example:**
```javascript
DATABASE_URL: 'postgresql://rc_survey_user:your_password@localhost:5432/rc_survey_db'
```

**Already configured in ecosystem.config.js:**
```javascript
DATABASE_URL: process.env.POSTGRES_PASSWORD 
  ? `postgresql://${process.env.POSTGRES_USER || 'rc_survey_user'}:${process.env.POSTGRES_PASSWORD}@localhost:5432/${process.env.POSTGRES_DB || 'rc_survey_db'}`
  : 'postgresql://rc_survey_user:CHANGE_THIS_PASSWORD@localhost:5432/rc_survey_db'
```

### For Docker Services

**Format:**
```
postgresql://USERNAME:PASSWORD@postgres:5432/DATABASE
```

**Example:**
```yaml
environment:
  - DATABASE_URL=postgresql://rc_survey_user:password@postgres:5432/rc_survey_db
```

**Note:** Use `postgres` (Docker service name), not `localhost`

---

## 📊 Connection Summary

| Service | Connects To | Host | Port | Connection String |
|---------|-------------|------|------|-------------------|
| **PM2 → PostgreSQL** | Database | `localhost` | `5432` | `postgresql://rc_survey_user:pass@localhost:5432/rc_survey_db` |
| **Docker → PostgreSQL** | Database | `postgres` | `5432` | `postgresql://rc_survey_user:pass@postgres:5432/rc_survey_db` |
| **PM2 → Redis** | Cache | `localhost` | `6379` | `redis://localhost:6379` (with password) |
| **Docker → Redis** | Cache | `redis` | `6379` | `redis://redis:6379` (with password) |
| **PM2 → Kafka** | Message Bus | `localhost` | `9092` | `localhost:9092` |
| **Docker → Kafka** | Message Bus | `62.72.29.150` | `9092` | `62.72.29.150:9092` |

---

## ✅ Verification

### Check Docker Services
```bash
docker ps
# Should show all 5 containers running
```

### Check PM2 Services
```bash
pm2 status
# Should show: rc-survey-web, rc-survey-auth, rc-survey-service
```

### Test Database Connection
```bash
# From host (PM2 services)
psql -h localhost -U rc_survey_user -d rc_survey_db
# Enter password when prompted

# From Docker
docker exec -it postgres psql -U rc_survey_user -d rc_survey_db
```

### Test Redis Connection
```bash
# From host (PM2 services)
redis-cli -h localhost -p 6379 -a $REDIS_PASSWORD ping
# Should return: PONG

# From Docker
docker exec redis redis-cli -a $REDIS_PASSWORD ping
# Should return: PONG
```

### Check Service Logs
```bash
# PM2 logs
pm2 logs rc-survey-service | grep -i "database\|redis\|kafka"

# Docker logs
docker logs postgres | tail -20
docker logs redis | tail -20
docker logs kafka | tail -20
```

---

## 🆘 Common Issues

### Issue: PM2 services can't connect to database

**Check:**
1. PostgreSQL is running: `docker ps | grep postgres`
2. Port is exposed: `docker port postgres` (should show 5432)
3. Password is set: `echo $POSTGRES_PASSWORD`
4. Password matches .env file

**Fix:**
```bash
# Verify password
cat infra/docker/.env | grep POSTGRES_PASSWORD

# Set environment variable
export POSTGRES_PASSWORD=password_from_env_file

# Restart PM2
pm2 restart all
```

### Issue: PM2 services can't connect to Redis

**Check:**
1. Redis is running: `docker ps | grep redis`
2. Port is exposed to localhost: `docker port redis` (should show 127.0.0.1:6379)
3. Password is set: `echo $REDIS_PASSWORD`

**Fix:**
```bash
# Verify password
cat infra/docker/.env | grep REDIS_PASSWORD

# Set environment variable
export REDIS_PASSWORD=password_from_env_file

# Restart PM2
pm2 restart all
```

### Issue: Services on different networks

**Check:**
```bash
docker network inspect docker_internal
# Should show all services: postgres, kafka, redis, event-consumer
```

**Fix:**
```bash
# Restart with same network
docker-compose -f docker-compose.db.yml -f docker-compose.yml down
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d
```

---

## 📝 Quick Commands

### Start Everything
```bash
cd infra/docker
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d
pm2 start ecosystem.config.js --env production
```

### Stop Everything
```bash
pm2 stop all
cd infra/docker
docker-compose -f docker-compose.db.yml -f docker-compose.yml down
```

### Restart Everything
```bash
pm2 restart all
cd infra/docker
docker-compose -f docker-compose.db.yml -f docker-compose.yml restart
```

### View Logs
```bash
# All PM2 logs
pm2 logs

# Specific service
pm2 logs rc-survey-service

# Docker logs
docker-compose -f docker-compose.db.yml -f docker-compose.yml logs -f
```

---

**Your DATABASE_URL is already configured in ecosystem.config.js!** Just make sure `POSTGRES_PASSWORD` environment variable is set before starting PM2.

