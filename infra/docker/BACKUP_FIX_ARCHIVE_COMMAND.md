# Fix: Archive Command Failing

## Problem

WAL archiving is failing:
```
archived_count: 0
failed_count: 30
last_failed_wal: 000000010000000000000003
```

The `archive_command` is not successfully copying WAL files.

## Diagnosis

### Step 1: Check Archive Command

```bash
# Check what archive command is configured
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW archive_command;"
```

### Step 2: Check PostgreSQL Logs

```bash
# Check for archive command errors
docker logs postgres | grep -i archive | tail -20
```

### Step 3: Test Archive Directory

```bash
# Check if archive directory exists and is writable
docker exec postgres ls -ld /var/lib/postgresql/wal-archive/
docker exec postgres touch /var/lib/postgresql/wal-archive/test
docker exec postgres rm /var/lib/postgresql/wal-archive/test
```

## Common Issues

### Issue 1: Directory Doesn't Exist

The archive directory might not exist in the PostgreSQL container.

**Fix**:
```bash
# Create directory in PostgreSQL container
docker exec postgres mkdir -p /var/lib/postgresql/wal-archive
docker exec postgres chmod 700 /var/lib/postgresql/wal-archive
```

### Issue 2: Volume Mount Issue

The volume might not be mounted correctly.

**Check**:
```bash
# Verify volume is mounted
docker exec postgres ls -ld /var/lib/postgresql/wal-archive/
```

### Issue 3: Archive Command Path Issue

The archive command might be using wrong paths.

**Check current command**:
```bash
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW archive_command;"
```

## Solution: Fix Archive Directory

The most likely issue is that the archive directory doesn't exist or isn't writable. Run:

```bash
# Create and set permissions on archive directory
docker exec postgres mkdir -p /var/lib/postgresql/wal-archive
docker exec postgres chown postgres:postgres /var/lib/postgresql/wal-archive
docker exec postgres chmod 700 /var/lib/postgresql/wal-archive

# Test write access
docker exec postgres touch /var/lib/postgresql/wal-archive/test && docker exec postgres rm /var/lib/postgresql/wal-archive/test && echo "Directory is writable"

# Force a new WAL switch
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# Wait and check
sleep 3
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/
```

## Verify Fix

After fixing, check:

```bash
# Check archive stats (should show archived_count > 0)
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT archived_count, last_archived_wal, last_archived_time FROM pg_stat_archiver;"

# Check WAL files
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/
```

