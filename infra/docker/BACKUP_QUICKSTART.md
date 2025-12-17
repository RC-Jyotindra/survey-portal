# Backup System Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Generate SSH Key

```bash
# Create backup keys directory
mkdir -p infra/docker/backup-keys

# Generate SSH key (press Enter to accept defaults, or set a passphrase)
ssh-keygen -t rsa -b 4096 -f infra/docker/backup-keys/id_rsa -N ""

# Copy public key to remote server
ssh-copy-id -i infra/docker/backup-keys/id_rsa.pub rcadmin@192.168.1.246

# Test connection
ssh -i infra/docker/backup-keys/id_rsa rcadmin@192.168.1.246 "echo 'SSH connection successful!'"
```

### Step 2: Prepare Remote Server

```bash
# SSH into remote server
ssh rcadmin@192.168.1.246

# Create backup directories
mkdir -p /home/rcadmin/postgres-backups/{base-backups,wal-archive}
chmod 700 /home/rcadmin/postgres-backups

# Exit remote server
exit
```

### Step 3: Set Environment Variables

Add to your `.env` file (or export in shell):

```bash
# Remote Backup Configuration (required)
REMOTE_BACKUP_HOST=192.168.1.246
REMOTE_BACKUP_USER=rcadmin
REMOTE_BACKUP_PATH=/home/rcadmin/postgres-backups

# Optional: Customize backup schedule (default: daily at 2 AM)
BACKUP_RETENTION_DAYS=10
BACKUP_SCHEDULE="0 2 * * *"
WAL_SYNC_INTERVAL=60
```

### Step 4: Start Services

```bash
cd infra/docker
docker-compose -f docker-compose.db.yml up -d
```

### Step 5: Verify

```bash
# Check backup service is running
docker ps | grep postgres-backup

# Check logs
docker logs postgres-backup

# Verify WAL archiving is working
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW archive_mode;"
# Should show: archive_mode | on
```

## ✅ Verification Checklist

- [ ] SSH key generated and copied to remote server
- [ ] Remote backup directories created
- [ ] Environment variables set
- [ ] Docker containers running (`docker ps`)
- [ ] Backup service logs show no errors
- [ ] PostgreSQL archive_mode is 'on'
- [ ] WAL files appearing in archive (`docker exec postgres-backup ls /var/lib/postgresql/wal-archive/`)

## 🔍 Quick Commands

```bash
# View backup logs
docker logs postgres-backup

# Check local backups
docker exec postgres-backup ls -lh /var/lib/postgresql/backups/

# Check remote backups
ssh rcadmin@192.168.1.246 "ls -lh /home/rcadmin/postgres-backups/base-backups/"

# Trigger manual backup
docker exec postgres-backup /backup-scripts/base-backup.sh

# Monitor WAL sync
docker exec postgres-backup tail -f /var/log/wal-sync.log
```

## 📚 Full Documentation

See [BACKUP_SETUP.md](./BACKUP_SETUP.md) for complete documentation.

## 🆘 Troubleshooting

**Backup service won't start:**
- Check SSH key exists: `ls -la infra/docker/backup-keys/id_rsa`
- Test SSH manually: `ssh -i infra/docker/backup-keys/id_rsa rcadmin@192.168.1.246`

**WAL files not syncing:**
- Check logs: `docker logs postgres-backup`
- Verify remote directory exists and is writable
- Check network connectivity

**Base backup failing:**
- Ensure PostgreSQL is healthy: `docker ps | grep postgres`
- Check PostgreSQL logs: `docker logs postgres`
- Verify credentials in environment variables

