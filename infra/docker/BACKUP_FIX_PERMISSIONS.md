# Fix: Archive Directory Permissions

## Problem

```
cp: can't create '/var/lib/postgresql/wal-archive/000000010000000000000003': Permission denied
```

The PostgreSQL process (running as `postgres` user) cannot write to the archive directory.

## Solution

Fix the directory permissions:

```bash
# 1. Create directory with correct ownership
docker exec postgres mkdir -p /var/lib/postgresql/wal-archive

# 2. Set ownership to postgres user (PostgreSQL runs as this user)
docker exec postgres chown postgres:postgres /var/lib/postgresql/wal-archive

# 3. Set permissions (read/write/execute for owner)
docker exec postgres chmod 700 /var/lib/postgresql/wal-archive

# 4. Verify permissions
docker exec postgres ls -ld /var/lib/postgresql/wal-archive/
# Should show: drwx------ (700 permissions, owned by postgres)

# 5. Test write access
docker exec postgres touch /var/lib/postgresql/wal-archive/test && docker exec postgres rm /var/lib/postgresql/wal-archive/test && echo "Directory is writable"

# 6. Force a new WAL switch
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# 7. Wait and check archive
sleep 3
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/

# 8. Check archive stats
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT archived_count, last_archived_wal, last_archived_time FROM pg_stat_archiver;"
```

## Why This Happens

The Docker volume `postgres-wal-archive` is created, but when PostgreSQL tries to write to it, the directory might:
- Not exist
- Be owned by root instead of postgres user
- Have wrong permissions

PostgreSQL runs as the `postgres` user, so it needs write access to the archive directory.

## Permanent Fix

For future installations, we should ensure the directory is created with correct permissions on container startup. However, for existing installations, the manual fix above works.

