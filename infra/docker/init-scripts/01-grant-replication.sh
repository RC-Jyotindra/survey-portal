#!/bin/bash
# Grant replication privileges to the database user
# This allows pg_basebackup to work

set -e

# Get the database user from environment (set in docker-compose)
DB_USER="${POSTGRES_USER:-rc_survey_user}"

# Wait for PostgreSQL to be ready
# Use the database user as superuser (when POSTGRES_USER is set, that user is the superuser)
until pg_isready -U "${DB_USER}" -d postgres; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 1
done

# Grant replication privilege to the user
# Connect as the superuser (which is DB_USER when POSTGRES_USER is set)
psql -v ON_ERROR_STOP=1 --username "${DB_USER}" <<-EOSQL
    -- Grant replication privilege to the database user
    ALTER USER ${DB_USER} WITH REPLICATION;
    
    -- Verify the grant
    SELECT rolname, rolreplication FROM pg_roles WHERE rolname = '${DB_USER}';
EOSQL

echo "Replication privileges granted to ${DB_USER}"

