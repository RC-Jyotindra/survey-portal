# Manual Backup Testing Guide

## 🧪 Triggering Manual Backups

### Option 1: Manual Base Backup (Recommended for Testing)

Run the base backup script directly:

```bash
# Trigger a full base backup
docker exec postgres-backup /backup-scripts/base-backup.sh

# Check the backup was created
docker exec postgres-backup ls -lh /var/lib/postgresql/backups/

# View backup metadata
docker exec postgres-backup cat /var/lib/postgresql/backups/base_backup_*/backup_info.txt
```

### Option 2: Check Backup Logs

```bash
# View backup service logs
docker logs postgres-backup

# View base backup execution log
docker exec postgres-backup tail -f /var/log/backup.log

# View WAL sync log
docker exec postgres-backup tail -f /var/log/wal-sync.log
```

## 🔄 Generating WAL Files for Testing

WAL files are created automatically when there's database activity. To generate WAL files for testing:

```bash
# Force a WAL switch (creates new WAL segment)
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# Check WAL files in archive
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/

# Generate some database activity (creates more WAL)
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "CREATE TABLE IF NOT EXISTS test_backup AS SELECT NOW() as test_time;"
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# Check again
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/
```

## ✅ Verification Checklist

After running a manual backup:

- [ ] Base backup directory created: `docker exec postgres-backup ls /var/lib/postgresql/backups/`
- [ ] Backup contains files: `docker exec postgres-backup ls -lh /var/lib/postgresql/backups/base_backup_*/`
- [ ] Backup metadata exists: `docker exec postgres-backup cat /var/lib/postgresql/backups/base_backup_*/backup_info.txt`
- [ ] WAL files archiving: `docker exec postgres-backup ls /var/lib/postgresql/wal-archive/`
- [ ] No errors in logs: `docker logs postgres-backup`

## 📊 Expected Output

### Successful Base Backup

```
[2025-12-17 05:30:00] Starting base backup: base_backup_20251217_053000
pg_basebackup: initiating base backup, waiting for checkpoint to complete
pg_basebackup: checkpoint completed
pg_basebackup: write-ahead log start point: 0/2000000
pg_basebackup: syncing data to disk ...
pg_basebackup: base backup completed
[2025-12-17 05:30:15] Base backup created successfully: base_backup_20251217_053000
[2025-12-17 05:30:15] INFO: No SSH key or password provided. Skipping remote sync (local backup still created).
[2025-12-17 05:30:15] Base backup process completed successfully
```

### WAL Archive Files

After generating WAL activity, you should see files like:
```
000000010000000000000001
000000010000000000000002
000000010000000000000003
```

## 🔍 Troubleshooting

### No WAL Files Appearing

WAL files are only created when there's database activity. To test:

```bash
# Force WAL switch
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# Wait a few seconds, then check
docker exec postgres-backup ls /var/lib/postgresql/wal-archive/
```

### Backup Fails

Check logs:
```bash
docker logs postgres-backup
docker exec postgres-backup cat /var/log/backup.log
```

Common issues:
- PostgreSQL not accessible: Check `docker ps | grep postgres`
- Permission issues: Check `docker exec postgres-backup ls -la /var/lib/postgresql/backups/`
- Disk space: Check `docker exec postgres-backup df -h`

## 🎯 Quick Test Commands

```bash
# 1. Trigger manual backup
docker exec postgres-backup /backup-scripts/base-backup.sh

# 2. Generate WAL activity
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_switch_wal();"

# 3. Verify everything
docker exec postgres-backup ls -lh /var/lib/postgresql/backups/
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/
docker logs postgres-backup | tail -20
```

