# PostgreSQL Backup Setup Guide

## Overview

This backup system implements **Tier 2 Enhanced Protection** with:
- **Daily Base Backups** (pg_basebackup) - Full database snapshots
- **Continuous WAL Archiving** - Transaction log archiving for Point-in-Time Recovery (PITR)
- **Dual Storage** - Local + Remote backup synchronization
- **Retention Policy** - Keeps last 10 base backups automatically

## Architecture

```
┌─────────────────────────────────────────┐
│         PRIMARY SERVER                   │
│                                         │
│  PostgreSQL → WAL Archive (Local)      │
│       ↓                                 │
│  Base Backup Service                    │
│    ├─ Daily pg_basebackup              │
│    └─ Real-time WAL sync               │
│       ↓                                │
│  Local Backup Storage                  │
│       ↓                                │
│  SCP/SSH Sync                          │
└───────────────┬─────────────────────────┘
                │
                │ Network (SSH/SCP)
                │
┌───────────────▼─────────────────────────┐
│      REMOTE SERVER                      │
│  192.168.1.246 (rcadmin)                │
│                                         │
│  /home/rcadmin/postgres-backups/       │
│    ├─ base-backups/                    │
│    └─ wal-archive/                     │
└─────────────────────────────────────────┘
```

## Prerequisites

### 1. SSH Key Setup

You need to set up SSH key authentication for passwordless access to the remote backup server.

**On your local machine (where you'll run docker-compose):**

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -f infra/docker/backup-keys/id_rsa -N ""

# Copy public key to remote server
ssh-copy-id -i infra/docker/backup-keys/id_rsa.pub rcadmin@192.168.1.246

# Test SSH connection
ssh -i infra/docker/backup-keys/id_rsa rcadmin@192.168.1.246
```

**Important:** The private key (`id_rsa`) will be mounted into the backup container. Keep it secure!

### 2. Remote Server Preparation

On the remote server (`192.168.1.246`), create the backup directory:

```bash
# SSH into remote server
ssh rcadmin@192.168.1.246

# Create backup directory structure
mkdir -p /home/rcadmin/postgres-backups/base-backups
mkdir -p /home/rcadmin/postgres-backups/wal-archive

# Set appropriate permissions
chmod 700 /home/rcadmin/postgres-backups
```

### 3. Environment Variables

Add these variables to your `.env` file (or set them in your environment):

```bash
# PostgreSQL Configuration (existing)
POSTGRES_DB=rc_survey_db
POSTGRES_USER=rc_survey_user
POSTGRES_PASSWORD=your_strong_password_here

# Backup Configuration
BACKUP_RETENTION_DAYS=10                    # Keep last 10 base backups
BACKUP_SCHEDULE="0 2 * * *"                # Daily at 2 AM (cron format)
WAL_SYNC_INTERVAL=60                       # Sync WAL every 60 seconds

# Remote Backup Configuration
REMOTE_BACKUP_HOST=192.168.1.246           # Remote server IP
REMOTE_BACKUP_USER=rcadmin                 # SSH user
REMOTE_BACKUP_PATH=/home/rcadmin/postgres-backups  # Remote backup path
REMOTE_SSH_KEY_PATH=/backup-keys/id_rsa    # Path to SSH key in container
```

## Installation Steps

### Step 1: Create Backup Keys Directory

```bash
mkdir -p infra/docker/backup-keys
```

### Step 2: Generate and Configure SSH Key

```bash
# Generate SSH key (if not already done)
ssh-keygen -t rsa -b 4096 -f infra/docker/backup-keys/id_rsa -N ""

# Copy public key to remote server
ssh-copy-id -i infra/docker/backup-keys/id_rsa.pub rcadmin@192.168.1.246

# Verify connection works
ssh -i infra/docker/backup-keys/id_rsa rcadmin@192.168.1.246 "echo 'Connection successful'"
```

### Step 3: Set Environment Variables

Create or update your `.env` file in the project root:

```bash
# Add backup configuration variables (see above)
```

### Step 4: Start Services

```bash
cd infra/docker
docker-compose -f docker-compose.db.yml up -d
```

### Step 5: Verify Backup Service

```bash
# Check backup service logs
docker logs postgres-backup

# Check if cron is running
docker exec postgres-backup ps aux | grep cron

# Check WAL sync process
docker exec postgres-backup ps aux | grep wal-sync
```

## How It Works

### Daily Base Backups

1. **Schedule**: Runs daily at 2 AM (configurable via `BACKUP_SCHEDULE`)
2. **Process**:
   - Uses `pg_basebackup` to create a full database snapshot
   - Compresses the backup (tar format)
   - Stores locally in `/var/lib/postgresql/backups/`
   - Syncs to remote server via SCP
   - Cleans up old backups (keeps last 10)

3. **Backup Format**: 
   - Directory: `base_backup_YYYYMMDD_HHMMSS/`
   - Contains: Database files, WAL files, metadata

### Continuous WAL Archiving

1. **Real-time Sync**: Every 60 seconds (configurable via `WAL_SYNC_INTERVAL`)
2. **Process**:
   - PostgreSQL writes WAL segments (16MB each)
   - Archive command copies WAL to local archive
   - Sync script copies new WAL files to remote server
   - Only syncs files that don't exist remotely

3. **WAL Files**: 
   - Location: `/var/lib/postgresql/wal-archive/`
   - Format: `000000010000000000000001` (hexadecimal names)
   - Used for Point-in-Time Recovery

## Point-in-Time Recovery (PITR)

### Recovery Process

To restore to a specific point in time:

1. **Stop PostgreSQL** (if running)
2. **Restore Base Backup**:
   ```bash
   # Find the base backup before your target time
   ls -la /var/lib/postgresql/backups/
   
   # Restore base backup
   tar -xzf base_backup_YYYYMMDD_HHMMSS/base.tar.gz -C /var/lib/postgresql/data/
   ```

3. **Configure Recovery**:
   Create `recovery.conf` (PostgreSQL 12+) or set in `postgresql.conf`:
   ```conf
   restore_command = 'cp /var/lib/postgresql/wal-archive/%f %p'
   recovery_target_time = '2024-01-15 14:30:00'
   ```

4. **Start PostgreSQL**: It will automatically replay WAL files up to target time

### Example Recovery

```bash
# Restore to specific timestamp
docker exec -it postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_stop_backup();"

# Restore base backup
docker exec -it postgres-backup /backup-scripts/restore-backup.sh \
  --backup base_backup_20240115_020000 \
  --target-time "2024-01-15 14:30:00"
```

## Monitoring

### Check Backup Status

```bash
# View backup service logs
docker logs postgres-backup

# View base backup logs
docker exec postgres-backup tail -f /var/log/backup.log

# View WAL sync logs
docker exec postgres-backup tail -f /var/log/wal-sync.log

# List local backups
docker exec postgres-backup ls -lh /var/lib/postgresql/backups/

# List WAL archive files
docker exec postgres-backup ls -lh /var/lib/postgresql/wal-archive/ | head -20
```

### Check Remote Backups

```bash
# SSH into remote server and check backups
ssh rcadmin@192.168.1.246 "ls -lh /home/rcadmin/postgres-backups/base-backups/"

# Check WAL archive on remote
ssh rcadmin@192.168.1.246 "ls -lh /home/rcadmin/postgres-backups/wal-archive/ | tail -20"
```

### Verify PostgreSQL WAL Archiving

```bash
# Check if archiving is working
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c \
  "SELECT * FROM pg_stat_archiver;"

# Check archive status
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c \
  "SHOW archive_mode;"
docker exec postgres psql -U rc_survey_user -d rc_survey_db -c \
  "SHOW wal_level;"
```

## Troubleshooting

### Backup Service Not Starting

```bash
# Check logs
docker logs postgres-backup

# Common issues:
# 1. SSH key not found - ensure id_rsa exists in backup-keys/
# 2. SSH connection failed - test SSH manually
# 3. PostgreSQL not ready - wait for postgres healthcheck
```

### WAL Files Not Syncing

```bash
# Check WAL sync process
docker exec postgres-backup ps aux | grep wal-sync

# Check WAL sync logs
docker exec postgres-backup tail -f /var/log/wal-sync.log

# Test SSH connection manually
docker exec postgres-backup ssh -i /backup-keys/id_rsa \
  rcadmin@192.168.1.246 "echo 'Connection test'"
```

### Base Backup Failing

```bash
# Check base backup logs
docker exec postgres-backup tail -f /var/log/backup.log

# Test pg_basebackup manually
docker exec postgres-backup /backup-scripts/base-backup.sh

# Check PostgreSQL connection
docker exec postgres-backup pg_isready -h postgres -U rc_survey_user
```

### Remote Sync Issues

```bash
# Test SSH connection
ssh -i infra/docker/backup-keys/id_rsa rcadmin@192.168.1.246

# Check remote directory permissions
ssh rcadmin@192.168.1.246 "ls -ld /home/rcadmin/postgres-backups"

# Test SCP manually
scp -i infra/docker/backup-keys/id_rsa \
  /tmp/test.txt \
  rcadmin@192.168.1.246:/home/rcadmin/postgres-backups/
```

## Backup Retention

- **Base Backups**: Last 10 backups are kept (configurable via `BACKUP_RETENTION_DAYS`)
- **WAL Files**: Kept until no longer needed (after base backup + retention period)
- **Automatic Cleanup**: Old backups are deleted automatically after new backup completes

## Security Considerations

1. **SSH Key Security**:
   - Keep `backup-keys/id_rsa` secure (600 permissions)
   - Add to `.gitignore` (already included)
   - Use dedicated backup user on remote server with limited permissions

2. **Network Security**:
   - Use firewall rules to restrict SSH access
   - Consider VPN for remote backup server
   - Monitor SSH access logs

3. **Backup Encryption**:
   - Consider encrypting backups at rest
   - Use encrypted filesystem on remote server
   - Implement backup encryption in future enhancement

## Maintenance

### Manual Backup

```bash
# Trigger manual base backup
docker exec postgres-backup /backup-scripts/base-backup.sh
```

### Clean Old WAL Files

WAL files are automatically cleaned up, but you can manually clean:

```bash
# WAL files older than 30 days (adjust as needed)
docker exec postgres-backup find /var/lib/postgresql/wal-archive/ \
  -type f -mtime +30 -delete
```

### Backup Verification

```bash
# Verify backup integrity
docker exec postgres-backup ls -lh /var/lib/postgresql/backups/

# Check backup metadata
docker exec postgres-backup cat \
  /var/lib/postgresql/backups/base_backup_*/backup_info.txt
```

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_RETENTION_DAYS` | `10` | Number of base backups to keep |
| `BACKUP_SCHEDULE` | `0 2 * * *` | Cron schedule for base backups |
| `WAL_SYNC_INTERVAL` | `60` | WAL sync interval in seconds |
| `REMOTE_BACKUP_HOST` | - | Remote server IP/hostname |
| `REMOTE_BACKUP_USER` | - | SSH user for remote server |
| `REMOTE_BACKUP_PATH` | `/home/rcadmin/postgres-backups` | Remote backup directory |
| `REMOTE_SSH_KEY_PATH` | `/backup-keys/id_rsa` | SSH key path in container |

### Cron Schedule Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 2 * * 0` - Every Sunday at 2 AM

## Support

For issues or questions:
1. Check logs: `docker logs postgres-backup`
2. Verify configuration: Check environment variables
3. Test connectivity: SSH to remote server manually
4. Review this documentation

