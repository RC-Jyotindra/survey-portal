# Fix: Grant Replication Privileges for pg_basebackup

## Problem

```
FATAL: no pg_hba.conf entry for replication connection from host "172.18.0.7", user "rc_survey_user", no encryption
```

The database user needs replication privileges to use `pg_basebackup`.

## Quick Fix (For Existing Database)

Run this SQL command to grant replication privileges:

**Note**: If you set a custom `POSTGRES_USER`, that user is the superuser (not `postgres`).

```bash
# Grant replication privilege to the user (connect as the superuser, which is rc_survey_user)
docker exec postgres psql -U rc_survey_user -d postgres -c "ALTER USER rc_survey_user WITH REPLICATION;"

# Verify it worked
docker exec postgres psql -U rc_survey_user -d postgres -c "SELECT rolname, rolreplication FROM pg_roles WHERE rolname = 'rc_survey_user';"
```

**Alternative**: If you need to use the postgres superuser, you can create it:

```bash
# Create postgres superuser (optional)
docker exec postgres psql -U rc_survey_user -d postgres -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'your_password';"
```

Expected output:
```
 rolname      | rolreplication 
--------------+----------------
 rc_survey_user | t
```

## Then Test Backup Again

```bash
docker exec postgres-backup /backup-scripts/base-backup.sh
```

## Permanent Fix (For New Databases)

I've created an init script that will automatically grant replication privileges when the database is first created. However, since your database already exists, you need to grant it manually (see Quick Fix above).

For future fresh installations, the init script will handle this automatically.

## Alternative: Create Dedicated Replication User

If you prefer a separate user for backups:

```bash
# Create replication user
docker exec postgres psql -U postgres -d postgres <<EOF
CREATE USER backup_user WITH REPLICATION PASSWORD 'your_backup_password';
GRANT CONNECT ON DATABASE rc_survey_db TO backup_user;
EOF

# Then update docker-compose.db.yml to use backup_user for backups
```

But the simpler approach is to just grant replication to the existing user.

