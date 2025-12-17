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
REMOTE_SSH_PASSWORD="${REMOTE_SSH_PASSWORD:-}"  # Optional: SSH password if key not available

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

BACKUP_EXIT_CODE=$?

if [ ${BACKUP_EXIT_CODE} -eq 0 ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Base backup created successfully: ${BACKUP_NAME}"
  
  # Create backup metadata file
  # Note: pg_basebackup with -Ft creates tar files in the directory, so metadata goes in parent
  cat > "${BACKUP_DIR}/${BACKUP_NAME}_info.txt" <<EOF
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
    
    # Build SSH/SCP command with optional key or password
    SSH_CMD="ssh"
    SCP_CMD="scp"
    SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30"
    
    # Use SSH key if available, otherwise use password (via sshpass if installed)
    if [ -f "${SSH_KEY_PATH}" ]; then
      SSH_CMD="${SSH_CMD} -i ${SSH_KEY_PATH}"
      SCP_CMD="${SCP_CMD} -i ${SSH_KEY_PATH}"
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] Using SSH key authentication"
    elif [ -n "${REMOTE_SSH_PASSWORD}" ]; then
      # Check if sshpass is available
      if command -v sshpass >/dev/null 2>&1; then
        SSH_CMD="sshpass -p '${REMOTE_SSH_PASSWORD}' ${SSH_CMD}"
        SCP_CMD="sshpass -p '${REMOTE_SSH_PASSWORD}' ${SCP_CMD}"
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Using password authentication (sshpass)"
      else
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: Password provided but sshpass not installed. Install sshpass or use SSH key."
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Install: apk add --no-cache sshpass (Alpine) or apt-get install sshpass (Debian/Ubuntu)"
        return 1
      fi
    else
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: No SSH key or password provided. Skipping remote sync (local backup still created)."
      # Don't return error - local backup is still successful
      return 0
    fi
    
    # Create remote directory structure
    ${SSH_CMD} ${SSH_OPTS} \
        "${REMOTE_USER}@${REMOTE_HOST}" \
        "mkdir -p ${REMOTE_BACKUP_PATH}/base-backups" 2>/dev/null
    
    # Sync backup to remote
    ${SCP_CMD} ${SSH_OPTS} \
        -r "${BACKUP_PATH}" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BACKUP_PATH}/base-backups/" 2>/dev/null
    
    if [ $? -eq 0 ]; then
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup synced to remote server successfully"
    else
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: Failed to sync backup to remote server"
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] Check network connectivity and credentials"
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
          # Use same SSH method as backup sync
          if [ -f "${SSH_KEY_PATH}" ]; then
            ssh -i "${SSH_KEY_PATH}" \
                -o StrictHostKeyChecking=no \
                -o UserKnownHostsFile=/dev/null \
                -o ConnectTimeout=30 \
                "${REMOTE_USER}@${REMOTE_HOST}" \
                "rm -rf ${REMOTE_BACKUP_PATH}/base-backups/$(basename "${old_backup}")" 2>/dev/null || true
          elif [ -n "${REMOTE_SSH_PASSWORD}" ] && command -v sshpass >/dev/null 2>&1; then
            sshpass -p "${REMOTE_SSH_PASSWORD}" ssh \
                -o StrictHostKeyChecking=no \
                -o UserKnownHostsFile=/dev/null \
                -o ConnectTimeout=30 \
                "${REMOTE_USER}@${REMOTE_HOST}" \
                "rm -rf ${REMOTE_BACKUP_PATH}/base-backups/$(basename "${old_backup}")" 2>/dev/null || true
          fi
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

