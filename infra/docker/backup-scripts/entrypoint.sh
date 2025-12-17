#!/bin/sh
# Backup Service Entrypoint
# Manages both base backups (scheduled) and WAL archive sync (continuous)

set -e

# Configuration
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"  # Default: Daily at 2 AM
SYNC_INTERVAL="${WAL_SYNC_INTERVAL:-60}"

echo "=========================================="
echo "PostgreSQL Backup Service Starting"
echo "=========================================="
echo "Base Backup Schedule: ${BACKUP_SCHEDULE}"
echo "WAL Sync Interval: ${SYNC_INTERVAL} seconds"
echo "Remote Host: ${REMOTE_USER}@${REMOTE_HOST}"
echo "=========================================="

# Install required packages (busybox cron, openssh-client, sshpass for password auth)
apk add --no-cache dcron openssh-client sshpass >/dev/null 2>&1 || {
  echo "WARNING: Could not install required packages. Some features may not work."
}

# CRITICAL: Set execute permissions on all scripts
# Git doesn't preserve execute permissions, so we must set them here
echo "Setting execute permissions on backup scripts..."
chmod +x /backup-scripts/*.sh
chmod +x /backup-scripts/entrypoint.sh
ls -la /backup-scripts/*.sh

# Setup SSH for remote access
if [ -f "${REMOTE_SSH_KEY_PATH:-/backup-keys/id_rsa}" ]; then
  mkdir -p ~/.ssh
  cp "${REMOTE_SSH_KEY_PATH}" ~/.ssh/id_rsa
  chmod 600 ~/.ssh/id_rsa
  echo "SSH key configured for remote backup"
else
  echo "WARNING: SSH key not found at ${REMOTE_SSH_KEY_PATH}"
  echo "Remote backup synchronization will not work without SSH key"
fi

# Create crontab for scheduled base backups
echo "Setting up scheduled base backups..."

# Convert cron schedule to crontab format
# Format: minute hour day month weekday
CRON_MINUTE=$(echo "${BACKUP_SCHEDULE}" | awk '{print $1}')
CRON_HOUR=$(echo "${BACKUP_SCHEDULE}" | awk '{print $2}')
CRON_DAY=$(echo "${BACKUP_SCHEDULE}" | awk '{print $3}')
CRON_MONTH=$(echo "${BACKUP_SCHEDULE}" | awk '{print $4}')
CRON_WEEKDAY=$(echo "${BACKUP_SCHEDULE}" | awk '{print $5}')

# Create crontab entry
CRON_ENTRY="${CRON_MINUTE} ${CRON_HOUR} ${CRON_DAY} ${CRON_MONTH} ${CRON_WEEKDAY} /backup-scripts/base-backup.sh >> /var/log/backup.log 2>&1"

# Write crontab
echo "${CRON_ENTRY}" | crontab -

echo "Crontab configured: ${CRON_ENTRY}"

# Start cron daemon in background
echo "Starting cron daemon..."
crond -f -l 2 &
CRON_PID=$!

# Start WAL sync in background
echo "Starting WAL archive synchronization..."
/backup-scripts/wal-sync.sh >> /var/log/wal-sync.log 2>&1 &
WAL_SYNC_PID=$!

echo "=========================================="
echo "Backup Service Started Successfully"
echo "=========================================="
echo "Cron PID: ${CRON_PID}"
echo "WAL Sync PID: ${WAL_SYNC_PID}"
echo "=========================================="

# Function to handle shutdown
cleanup() {
  echo "Shutting down backup service..."
  kill ${CRON_PID} 2>/dev/null || true
  kill ${WAL_SYNC_PID} 2>/dev/null || true
  exit 0
}

trap cleanup SIGTERM SIGINT

# Keep container running and monitor processes
while true; do
  # Check if cron is still running
  if ! kill -0 ${CRON_PID} 2>/dev/null; then
    echo "ERROR: Cron daemon died, restarting..."
    crond -f -l 2 &
    CRON_PID=$!
  fi
  
  # Check if WAL sync is still running
  if ! kill -0 ${WAL_SYNC_PID} 2>/dev/null; then
    echo "ERROR: WAL sync process died, restarting..."
    /backup-scripts/wal-sync.sh >> /var/log/wal-sync.log 2>&1 &
    WAL_SYNC_PID=$!
  fi
  
  sleep 60
done

