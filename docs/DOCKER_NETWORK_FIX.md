# Docker Network Conflict Fix

## 🚨 Problem

When starting `docker-compose.yml`, you get:
```
Error response from daemon: error while removing network: network docker_internal has active endpoints
```

**Cause:** Both `docker-compose.db.yml` and `docker-compose.yml` use the same network name `internal`, but Docker Compose treats them as separate networks when run separately.

---

## ✅ Solution: Start Both Files Together

### Option 1: Start Everything Together (Recommended)

```bash
cd infra/docker

# Stop everything first
docker-compose -f docker-compose.db.yml -f docker-compose.yml down

# Start everything together
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d
```

This creates a **single shared network** that all services can use.

### Option 2: Use External Network

Create a shared network first, then both compose files reference it:

```bash
# Create shared network
docker network create internal

# Then start services (they'll use the existing network)
docker-compose -f docker-compose.db.yml up -d
docker-compose -f docker-compose.yml up -d
```

### Option 3: Stop Database First, Then Start Infrastructure

```bash
# Stop database services
docker-compose -f docker-compose.db.yml down

# Start infrastructure
docker-compose -f docker-compose.yml up -d

# Start database (will join existing network)
docker-compose -f docker-compose.db.yml up -d
```

---

## 🔧 Quick Fix (Do This Now)

```bash
cd infra/docker

# Stop everything
docker-compose -f docker-compose.db.yml down
docker-compose -f docker-compose.yml down

# Start everything together
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d

# Verify
docker ps
docker network ls
```

---

## 📋 Recommended Startup Sequence

### Complete Startup (All Services)

```bash
cd infra/docker

# 1. Set environment variables
export POSTGRES_PASSWORD=your_password
export REDIS_PASSWORD=your_password

# 2. Start all Docker services together
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d

# 3. Verify all services
docker ps
# Should show: postgres, pgadmin, kafka, redis, event-consumer

# 4. Start PM2 services
cd ../..
export POSTGRES_PASSWORD=your_password
export REDIS_PASSWORD=your_password
pm2 start ecosystem.config.js --env production
```

---

## 🔍 Verify Network

```bash
# Check network exists
docker network ls | grep internal

# Check all containers on network
docker network inspect docker_internal

# Should show all services:
# - postgres
# - pgadmin
# - kafka
# - redis
# - event-consumer
```

---

## 🆘 If Still Having Issues

### Force Remove Network

```bash
# Stop all containers
docker-compose -f docker-compose.db.yml down
docker-compose -f docker-compose.yml down

# Remove network manually
docker network rm docker_internal

# Start everything fresh
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d
```

### Check for Orphaned Containers

```bash
# List all containers
docker ps -a

# Remove any orphaned containers
docker rm -f $(docker ps -aq)

# Start fresh
docker-compose -f docker-compose.db.yml -f docker-compose.yml up -d
```

---

**The key is to start both compose files together so they share the same network!**

