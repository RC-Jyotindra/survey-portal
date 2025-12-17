# Fix: pg_hba.conf for Replication Connections

## Problem

After granting replication privileges, you still get:
```
FATAL: no pg_hba.conf entry for replication connection from host "172.18.0.7", user "rc_survey_user", no encryption
```

This means PostgreSQL's host-based authentication (`pg_hba.conf`) doesn't allow replication connections from the backup container.

## Solution

I've created a custom `pg_hba.conf` file that allows replication connections from Docker networks. The docker-compose.yml now mounts this file.

## Quick Fix (For Existing Database)

Since your database already exists, you need to manually update pg_hba.conf:

### Option 1: Update pg_hba.conf Manually (Recommended)

```bash
# Connect to PostgreSQL container
docker exec -it postgres sh

# Edit pg_hba.conf (add replication entries)
echo "host    replication     all             172.18.0.0/16           scram-sha-256" >> /var/lib/postgresql/data/pg_hba.conf

# Reload PostgreSQL configuration
psql -U rc_survey_user -d postgres -c "SELECT pg_reload_conf();"

# Exit container
exit
```

### Option 2: Copy Custom pg_hba.conf

```bash
# Copy the custom pg_hba.conf to the container
docker cp infra/docker/pg_hba.conf postgres:/var/lib/postgresql/data/pg_hba.conf

# Reload configuration
docker exec postgres psql -U rc_survey_user -d postgres -c "SELECT pg_reload_conf();"
```

### Option 3: Restart with New Configuration

If you restart PostgreSQL with the new docker-compose.yml (which mounts the custom pg_hba.conf), it will use the new configuration:

```bash
cd infra/docker
docker compose -f docker-compose.db.yml restart postgres

# Wait for PostgreSQL to be healthy
docker compose -f docker-compose.db.yml ps

# Then test backup
docker exec postgres-backup /backup-scripts/base-backup.sh
```

## Verify Configuration

After updating, verify replication connections are allowed:

```bash
# Check pg_hba.conf entries
docker exec postgres cat /var/lib/postgresql/data/pg_hba.conf | grep replication

# Test backup
docker exec postgres-backup /backup-scripts/base-backup.sh
```

## What the Custom pg_hba.conf Does

The custom `pg_hba.conf` file:
- Allows replication connections from Docker networks (172.16.0.0/12, 172.17-20.0.0/16, 10.0.0.0/8)
- Uses `scram-sha-256` authentication (secure)
- Allows both regular and replication connections

## For New Installations

The docker-compose.yml now automatically mounts the custom pg_hba.conf, so new installations will work out of the box.

