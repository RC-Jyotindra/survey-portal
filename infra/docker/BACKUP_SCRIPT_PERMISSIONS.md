# Fixing Backup Script Permissions

## Problem

When scripts are pulled from git, they may not have execute permissions, causing:
```
exec: "/backup-scripts/entrypoint.sh": permission denied
```

## Solution 1: Set Permissions on Server (Quick Fix)

```bash
# On your server
cd /var/www/survey-portal/infra/docker/backup-scripts
chmod +x *.sh
cd ..
docker compose -f docker-compose.db.yml up -d
```

## Solution 2: Commit Scripts with Execute Permissions (Recommended)

### On Your Local Machine (Windows/Mac)

```bash
# Add execute permissions to scripts
cd infra/docker/backup-scripts
git update-index --chmod=+x *.sh

# Commit the permission changes
git add backup-scripts/*.sh
git commit -m "Add execute permissions to backup scripts"
git push origin master
```

### On Server (After Pull)

```bash
# Pull the changes
cd /var/www/survey-portal
git pull origin master

# Verify permissions (should show 'x' in permissions)
ls -la infra/docker/backup-scripts/*.sh

# If still not executable, set them manually
chmod +x infra/docker/backup-scripts/*.sh

# Restart containers
cd infra/docker
docker compose -f docker-compose.db.yml up -d
```

## Solution 3: Use sh Explicitly (Already Implemented)

The docker-compose.yml now uses:
```yaml
entrypoint: ["/bin/sh", "/backup-scripts/entrypoint.sh"]
```

This executes the script via `sh`, which doesn't require execute permissions. The entrypoint script will then set execute permissions on all other scripts.

## Verification

After fixing, verify:

```bash
# Check container is running
docker ps | grep postgres-backup

# Check logs (should show "Backup Service Started Successfully")
docker logs postgres-backup

# Verify scripts are executable inside container
docker exec postgres-backup ls -la /backup-scripts/*.sh
```

## Files That Need Execute Permissions

- `backup-scripts/entrypoint.sh`
- `backup-scripts/base-backup.sh`
- `backup-scripts/wal-sync.sh`

All three scripts must be executable.

