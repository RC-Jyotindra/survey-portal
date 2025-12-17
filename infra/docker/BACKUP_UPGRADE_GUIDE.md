# Upgrading Existing PostgreSQL Setup to Include Backups

## ⚠️ Important: Existing Containers Must Be Restarted

If you already have PostgreSQL and PgAdmin running, you **must restart them** to apply the new backup configuration. This is safe and won't cause data loss.

## 🔄 Safe Restart Procedure

### Option 1: Graceful Restart (Recommended)

```bash
cd infra/docker

# Stop containers gracefully (allows transactions to complete)
docker-compose -f docker-compose.db.yml stop

# Start with new configuration
docker-compose -f docker-compose.db.yml up -d
```

### Option 2: Restart Without Stopping (Faster)

```bash
cd infra/docker

# Restart with new configuration (recreates containers if needed)
docker-compose -f docker-compose.db.yml up -d
```

### Option 3: Full Recreate (If you encounter issues)

```bash
cd infra/docker

# Stop and remove containers (data volumes are preserved)
docker-compose -f docker-compose.db.yml down

# Start with new configuration
docker-compose -f docker-compose.db.yml up -d
```

## ✅ What Happens During Restart

### Safe Operations (No Data Loss)

1. **PostgreSQL Container**:
   - ✅ Existing data volume (`postgres-data`) is **preserved**
   - ✅ New volumes are created (`postgres-wal-archive`, `postgres-backups`)
   - ✅ WAL archiving configuration is applied
   - ✅ Database continues with all existing data

2. **PgAdmin Container**:
   - ✅ Existing data volume (`pgadmin-data`) is **preserved**
   - ✅ All your saved server connections remain
   - ✅ No configuration changes needed

3. **New Backup Service**:
   - ✅ Starts fresh (no existing data)
   - ✅ Begins WAL archiving immediately
   - ✅ First base backup runs on schedule

### What Gets Created

- **New Volumes** (empty, safe to create):
  - `postgres-wal-archive` - For WAL files
  - `postgres-backups` - For base backups

- **New Container**:
  - `postgres-backup` - Backup service (doesn't affect existing containers)

## 📋 Pre-Restart Checklist

Before restarting, ensure:

- [ ] **SSH key is ready** (if not, see Step 1 in BACKUP_QUICKSTART.md)
- [ ] **Environment variables are set** (REMOTE_BACKUP_HOST, etc.)
- [ ] **Remote server is accessible** (test SSH connection)
- [ ] **No critical operations running** (optional, but recommended)

## 🚀 Step-by-Step Upgrade Process

### Step 1: Prepare Backup Infrastructure (Before Restart)

```bash
# Generate SSH key (if not done)
mkdir -p infra/docker/backup-keys
ssh-keygen -t rsa -b 4096 -f infra/docker/backup-keys/id_rsa -N ""
ssh-copy-id -i infra/docker/backup-keys/id_rsa.pub rcadmin@192.168.1.246

# Prepare remote server
ssh rcadmin@192.168.1.246 "mkdir -p /home/rcadmin/postgres-backups/{base-backups,wal-archive}"
```

### Step 2: Set Environment Variables

Add to your `.env` file:

```bash
REMOTE_BACKUP_HOST=192.168.1.246
REMOTE_BACKUP_USER=rcadmin
REMOTE_BACKUP_PATH=/home/rcadmin/postgres-backups
```

### Step 3: Restart Containers

```bash
cd infra/docker

# Check current status
docker-compose -f docker-compose.db.yml ps

# Restart with new configuration
docker-compose -f docker-compose.db.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.db.yml ps
```

### Step 4: Verify Everything Works

```bash
# Check PostgreSQL is running with WAL archiving
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW archive_mode;"
# Should show: archive_mode | on

# Check backup service is running
docker logs postgres-backup

# Verify containers are healthy
docker ps | grep -E "postgres|pgadmin|backup"
```

## 🔍 What to Expect

### During Restart

1. **PostgreSQL**:
   - Container stops gracefully
   - Restarts with new WAL archiving config
   - Database comes online (may take 10-30 seconds)
   - Health check confirms it's ready

2. **PgAdmin**:
   - Container restarts
   - All saved connections preserved
   - Web interface available at http://localhost:8080

3. **Backup Service** (New):
   - Starts for the first time
   - Sets up cron for scheduled backups
   - Starts WAL sync process
   - Begins archiving WAL files immediately

### After Restart

- ✅ All existing data is intact
- ✅ WAL archiving is active
- ✅ Backup service is running
- ✅ First WAL files start appearing in archive

## ⚠️ Potential Issues & Solutions

### Issue: Container Won't Start

**Symptom**: `docker-compose up -d` fails

**Solution**:
```bash
# Check logs
docker-compose -f docker-compose.db.yml logs postgres

# Common causes:
# 1. Port 5432 already in use - stop other PostgreSQL instances
# 2. Volume permission issues - check Docker volume permissions
# 3. Configuration error - check docker-compose.db.yml syntax
```

### Issue: PostgreSQL Archive Mode Not Enabled

**Symptom**: `SHOW archive_mode;` returns `off`

**Solution**:
```bash
# Check PostgreSQL logs
docker logs postgres | grep -i archive

# Verify command-line parameters are applied
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW ALL;" | grep archive
```

### Issue: Backup Service Fails to Start

**Symptom**: `postgres-backup` container exits immediately

**Solution**:
```bash
# Check logs
docker logs postgres-backup

# Common causes:
# 1. SSH key not found - ensure infra/docker/backup-keys/id_rsa exists
# 2. Scripts not executable - run: chmod +x infra/docker/backup-scripts/*.sh
# 3. PostgreSQL not ready - wait for postgres healthcheck
```

### Issue: WAL Files Not Archiving

**Symptom**: No files in `/var/lib/postgresql/wal-archive/`

**Solution**:
```bash
# Check archive_command is working
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT * FROM pg_stat_archiver;"

# Force a WAL switch (creates new WAL file)
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# Check if WAL file appears
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/
```

## 🔄 Rollback Procedure (If Needed)

If something goes wrong and you need to revert:

```bash
cd infra/docker

# Stop all containers
docker-compose -f docker-compose.db.yml down

# Restore original docker-compose.db.yml (from git)
git checkout docker-compose.db.yml

# Start with original configuration
docker-compose -f docker-compose.db.yml up -d
```

**Note**: Your data volumes are preserved, so no data loss occurs.

## ✅ Post-Upgrade Verification

After restart, verify everything:

```bash
# 1. All containers running
docker ps | grep -E "postgres|pgadmin|backup"
# Should show 3 containers: postgres, pgadmin, postgres-backup

# 2. PostgreSQL archive mode enabled
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW archive_mode;"
# Should show: on

# 3. WAL archiving working
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"
docker exec postgres-backup ls /var/lib/postgresql/wal-archive/ | head -5
# Should show WAL files

# 4. Backup service running
docker logs postgres-backup | tail -20
# Should show: "Backup Service Started Successfully"

# 5. Test database connectivity
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT version();"
# Should show PostgreSQL version
```

## 📊 Expected Timeline

- **Container Restart**: 10-30 seconds
- **PostgreSQL Ready**: 15-45 seconds (health check)
- **Backup Service Ready**: 5-10 seconds
- **First WAL Archive**: Within 1-2 minutes (after first transaction)

## 🎯 Summary

**Yes, you need to restart**, but it's:
- ✅ **Safe** - No data loss
- ✅ **Quick** - 30-60 seconds downtime
- ✅ **Reversible** - Can rollback if needed
- ✅ **Non-destructive** - All existing data preserved

The restart is necessary because:
1. PostgreSQL needs new WAL archiving configuration
2. New volumes need to be created
3. New backup service needs to start

Your existing data in `postgres-data` volume is completely safe and will be preserved.

