#!/bin/sh
# PostgreSQL Base Backup Script
# Creates daily base backups with retention policy
# Supports remote synchronization via SCP

set -e

# Configuration from environment variables
POSTGRES_USER="${POSTGRES_USER:-rc_survey_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-rc_survey_db}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-10}"
BACKUP_DIR="/var/lib/postgresql/backups"
REMOTE_HOST="${REMOTE_HOST}"
REMOTE_USER="${REMOTE_USER}"
REMOTE_BACKUP_PATH="${REMOTE_BACKUP_PATH:-/home/rcadmin/postgres-backups}"
SSH_KEY_PATH="${REMOTE_SSH_KEY_PATH:-/backup-keys/id_rsa}"

# Export password for pg_basebackup
export PGPASSWORD="${POSTGRES_PASSWORD}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate backup filename with timestamp
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="base_backup_${BACKUP_DATE}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting base backup: ${BACKUP_NAME}"

# Create base backup using pg_basebackup
# -D: backup directory
# -Ft: tar format (compressed)
# -z: compress
# -P: progress
# -v: verbose
# -X stream: include WAL files
pg_basebackup \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -D "${BACKUP_PATH}" \
  -Ft \
  -z \
  -P \
  -v \
  -X stream \
  -l "Base backup ${BACKUP_DATE}"

if [ $? -eq 0 ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Base backup created successfully: ${BACKUP_NAME}"
  
  # Create backup metadata file
  cat > "${BACKUP_PATH}/backup_info.txt" <<EOF
Backup Date: ${BACKUP_DATE}
PostgreSQL Host: ${POSTGRES_HOST}
PostgreSQL Port: ${POSTGRES_PORT}
PostgreSQL User: ${POSTGRES_USER}
Database: ${POSTGRES_DB}
Backup Type: Base Backup (pg_basebackup)
Format: Tar (compressed)
WAL Included: Yes (streaming)
EOF
  
  # Sync to remote server if configured
  if [ -n "${REMOTE_HOST}" ] && [ -n "${REMOTE_USER}" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Syncing backup to remote server: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BACKUP_PATH}"
    
    # Create remote directory structure
    ssh -i "${SSH_KEY_PATH}" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${REMOTE_USER}@${REMOTE_HOST}" \
        "mkdir -p ${REMOTE_BACKUP_PATH}/base-backups"
    
    # Sync backup to remote
    scp -i "${SSH_KEY_PATH}" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -r "${BACKUP_PATH}" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BACKUP_PATH}/base-backups/"
    
    if [ $? -eq 0 ]; then
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup synced to remote server successfully"
    else
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: Failed to sync backup to remote server"
    fi
  fi
  
  # Cleanup old backups (keep only last N backups)
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Cleaning up old backups (keeping last ${BACKUP_RETENTION_DAYS} backups)..."
  
  # List backups sorted by date (newest first), skip the last BACKUP_RETENTION_DAYS
  BACKUPS_TO_DELETE=$(ls -1t "${BACKUP_DIR}"/base_backup_* 2>/dev/null | tail -n +$((BACKUP_RETENTION_DAYS + 1)) || true)
  
  if [ -n "${BACKUPS_TO_DELETE}" ]; then
    echo "${BACKUPS_TO_DELETE}" | while read -r old_backup; do
      if [ -d "${old_backup}" ] || [ -f "${old_backup}" ]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Deleting old backup: $(basename "${old_backup}")"
        rm -rf "${old_backup}"
        
        # Also delete from remote if configured
        if [ -n "${REMOTE_HOST}" ] && [ -n "${REMOTE_USER}" ]; then
          ssh -i "${SSH_KEY_PATH}" \
              -o StrictHostKeyChecking=no \
              -o UserKnownHostsFile=/dev/null \
              "${REMOTE_USER}@${REMOTE_HOST}" \
              "rm -rf ${REMOTE_BACKUP_PATH}/base-backups/$(basename "${old_backup}")" || true
        fi
      fi
    done
  fi
  
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Base backup process completed successfully"
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: Base backup failed!"
  exit 1
fi

# Unset password
unset PGPASSWORD

