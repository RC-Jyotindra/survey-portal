# pgAdmin Connection Setup Guide

## 📋 Step-by-Step Connection Configuration

### Step 1: General Tab

1. **Name**: Enter any descriptive name
   - Example: `Survey Database` or `RC Survey DB`
   - This is just a label for your reference

2. **Server group**: Leave as `RC_SURVEY` (or select/create a group)

3. **Connect now?**: ✅ Turn ON (blue)

4. **Shared?**: Leave OFF (unless you want to share with other pgAdmin users)

### Step 2: Connection Tab (Most Important!)

Fill in these values:

| Field | Value | Notes |
|-------|-------|-------|
| **Host name/address** | `postgres` | Docker service name (since pgAdmin is in Docker) |
| **Port** | `5432` | Already correct |
| **Maintenance database** | `rc_survey_db` | Your database name (NOT "postgres") |
| **Username** | `rc_survey_user` | Your PostgreSQL user (NOT "admin") |
| **Password** | `[Your POSTGRES_PASSWORD]` | From your `.env` file |
| **Save password?** | ✅ **Turn ON** | So you don't have to enter it every time |

### Step 3: Save

Click the **"Save"** button (floppy disk icon) at the bottom.

---

## 🔍 Detailed Field Explanations

### Host name/address

**Use `postgres` because:**
- pgAdmin is running in a Docker container
- PostgreSQL is running in a Docker container
- Both are on the same `internal` Docker network
- Docker service name `postgres` resolves to the PostgreSQL container

**Alternative (if connecting from host machine):**
- If you were connecting from your host machine (not Docker), use: `localhost` or `127.0.0.1`
- But since pgAdmin is in Docker, use: `postgres`

### Port

- `5432` is the default PostgreSQL port
- Already pre-filled correctly

### Maintenance database

- This is the database pgAdmin connects to initially
- Use: `rc_survey_db` (your actual database)
- **NOT** `postgres` (that's the default system database)

### Username

- Use: `rc_survey_user` (from your docker-compose.db.yml)
- **NOT** `admin` (that's for pgAdmin login, not PostgreSQL)

### Password

- This is your `POSTGRES_PASSWORD` from `infra/docker/.env`
- The same password you set for PostgreSQL
- **Turn ON "Save password?"** so you don't have to enter it every time

---

## ✅ Complete Configuration Example

### General Tab:
```
Name: Survey Database
Server group: RC_SURVEY
Connect now?: ✅ ON
Shared?: OFF
```

### Connection Tab:
```
Host name/address: postgres
Port: 5432
Maintenance database: rc_survey_db
Username: rc_survey_user
Password: [Your POSTGRES_PASSWORD from .env]
Save password?: ✅ ON
```

---

## 🆘 Troubleshooting

### "Connection refused" or "Cannot connect"

**Check:**
1. PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```

2. Both containers are on same network:
   ```bash
   docker network inspect docker_internal
   ```

3. Host name is correct:
   - Use `postgres` (Docker service name)
   - NOT `localhost` (that's for host machine connections)

### "Authentication failed"

**Check:**
1. Username is correct: `rc_survey_user` (not `admin`)
2. Password matches your `.env` file
3. Check your `.env` file:
   ```bash
   cat infra/docker/.env | grep POSTGRES_PASSWORD
   ```

### "Database does not exist"

**Check:**
1. Maintenance database is: `rc_survey_db`
2. Database was created:
   ```bash
   docker exec postgres psql -U rc_survey_user -l
   ```

---

## 📝 Quick Reference

**Connection String Format:**
```
postgresql://rc_survey_user:password@postgres:5432/rc_survey_db
```

**Where:**
- `rc_survey_user` = Username
- `password` = Your POSTGRES_PASSWORD
- `postgres` = Host (Docker service name)
- `5432` = Port
- `rc_survey_db` = Database name

---

**After saving, you should see your database in the left sidebar under "Servers" → "Survey Database" → "Databases" → "rc_survey_db"**

