# Testing WAL Archiving

## ✅ Backup Success!

Your base backup is working! Now let's test WAL archiving.

## Test WAL Archiving

### Method 1: Using PGPASSWORD Environment Variable

```bash
# Set password and force WAL switch
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# Check WAL files in archive
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/
```

### Method 2: Generate Database Activity

```bash
# Create some test data (this generates WAL)
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db <<EOF
CREATE TABLE IF NOT EXISTS backup_test AS SELECT NOW() as test_time, 'test' as data;
INSERT INTO backup_test VALUES (NOW(), 'test2');
SELECT pg_switch_wal();
EOF

# Check WAL archive
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/
```

### Method 3: Check Archive Status

```bash
# Check if archiving is working
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT * FROM pg_stat_archiver;"

# Check archive mode
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW archive_mode;"
```

## Expected Results

After generating WAL activity, you should see:

1. **WAL files in archive**:
   ```
   /var/lib/postgresql/wal-archive/
   000000010000000000000001
   000000010000000000000002
   ```

2. **Archive statistics**:
   ```
   archived_count | last_archived_wal | last_archived_time
   --------------+-------------------+--------------------
   2             | 0000000100000001  | 2025-12-17 06:00:00
   ```

## Troubleshooting

### No WAL Files Appearing

1. **Check archive_command is working**:
   ```bash
   docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW archive_command;"
   ```

2. **Check PostgreSQL logs**:
   ```bash
   docker logs postgres | grep -i archive
   ```

3. **Force WAL switch and wait**:
   ```bash
   docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"
   sleep 5
   docker exec postgres-backup ls /var/lib/postgresql/wal-archive/
   ```

### Archive Command Failing

Check if the archive directory is writable:
```bash
docker exec postgres ls -ld /var/lib/postgresql/wal-archive/
docker exec postgres touch /var/lib/postgresql/wal-archive/test && docker exec postgres rm /var/lib/postgresql/wal-archive/test
```

## Quick Test Sequence

```bash
# 1. Force WAL switch
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# 2. Wait a moment
sleep 2

# 3. Check archive
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/

# 4. Check archive stats
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT * FROM pg_stat_archiver;"
```

## Verify Backup Contents

```bash
# List backup directory contents
docker exec postgres-backup ls -lh /var/lib/postgresql/backups/base_backup_*/

# The backup should contain:
# - base.tar.gz (database files)
# - pg_wal.tar.gz (WAL files)
# - backup_manifest (backup metadata)
```

