#!/bin/sh
# WAL Archive Synchronization Script
# Continuously syncs WAL files to remote server in real-time
# Runs as a background process

set -e

# Configuration from environment variables
WAL_ARCHIVE_DIR="/var/lib/postgresql/wal-archive"
REMOTE_HOST="${REMOTE_HOST}"
REMOTE_USER="${REMOTE_USER}"
REMOTE_BACKUP_PATH="${REMOTE_BACKUP_PATH:-/home/rcadmin/postgres-backups}"
SSH_KEY_PATH="${REMOTE_SSH_KEY_PATH:-/backup-keys/id_rsa}"
SYNC_INTERVAL="${WAL_SYNC_INTERVAL:-60}"  # Default: sync every 60 seconds

# Ensure WAL archive directory exists
mkdir -p "${WAL_ARCHIVE_DIR}"

# Function to sync WAL files
sync_wal_files() {
  if [ -z "${REMOTE_HOST}" ] || [ -z "${REMOTE_USER}" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: Remote backup not configured, skipping WAL sync"
    return 0
  fi
  
  # Create remote WAL archive directory
  ssh -i "${SSH_KEY_PATH}" \
      -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o ConnectTimeout=10 \
      "${REMOTE_USER}@${REMOTE_HOST}" \
      "mkdir -p ${REMOTE_BACKUP_PATH}/wal-archive" 2>/dev/null || {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: Cannot connect to remote server, will retry"
    return 1
  }
  
  # Find WAL files that haven't been synced yet
  # Check for files that exist locally but not remotely
  for wal_file in "${WAL_ARCHIVE_DIR}"/*.gz "${WAL_ARCHIVE_DIR}"/*; do
    # Skip if not a file or if it's a directory
    [ -f "${wal_file}" ] || continue
    
    wal_filename=$(basename "${wal_file}")
    
    # Check if file exists on remote (quick check)
    remote_exists=$(ssh -i "${SSH_KEY_PATH}" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ConnectTimeout=10 \
        "${REMOTE_USER}@${REMOTE_HOST}" \
        "test -f ${REMOTE_BACKUP_PATH}/wal-archive/${wal_filename} && echo 'yes' || echo 'no'" 2>/dev/null || echo "no")
    
    if [ "${remote_exists}" = "no" ]; then
      # File doesn't exist remotely, sync it
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] Syncing WAL file: ${wal_filename}"
      
      scp -i "${SSH_KEY_PATH}" \
          -o StrictHostKeyChecking=no \
          -o UserKnownHostsFile=/dev/null \
          -o ConnectTimeout=10 \
          "${wal_file}" \
          "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BACKUP_PATH}/wal-archive/${wal_filename}" 2>/dev/null
      
      if [ $? -eq 0 ]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Successfully synced: ${wal_filename}"
      else
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: Failed to sync: ${wal_filename} (will retry)"
      fi
    fi
  done
}

# Initial sync
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting WAL archive synchronization service"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Sync interval: ${SYNC_INTERVAL} seconds"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Remote target: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BACKUP_PATH}/wal-archive"

# Continuous sync loop
while true; do
  sync_wal_files
  sleep "${SYNC_INTERVAL}"
done

