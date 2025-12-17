# How WAL (Write-Ahead Log) Archiving Works

## 📝 When WAL Segments Are Created

WAL segments are created **continuously** during normal database operations. Here's how it works:

### 1. **During Database Transactions** (Continuous)

Every time you:
- INSERT data
- UPDATE records
- DELETE records
- CREATE/ALTER/DROP tables
- Any other data modification

PostgreSQL writes these changes to the **current WAL segment** first (before writing to the actual data files). This is the "Write-Ahead" part of WAL.

### 2. **When WAL Segment Fills Up** (16MB Default)

WAL segments have a fixed size (16MB by default). When the current segment fills up:
- PostgreSQL automatically switches to a new WAL segment
- The full segment is ready to be archived
- The `archive_command` runs to copy it to the archive directory

### 3. **During Checkpoints** (Periodic)

PostgreSQL runs checkpoints periodically (every 15 minutes by default, or when `max_wal_size` is reached):
- Checkpoints flush dirty data pages to disk
- Old WAL segments that are no longer needed can be recycled or archived
- This triggers archiving of completed WAL segments

### 4. **Manual WAL Switch** (On Demand)

You can manually force a WAL switch:
```sql
SELECT pg_switch_wal();
```
This immediately closes the current segment and starts a new one, triggering archiving.

## 🔄 WAL Lifecycle

```
Transaction Occurs
    ↓
Write to Current WAL Segment (in memory/buffer)
    ↓
WAL Segment Fills Up (16MB) OR Checkpoint Occurs
    ↓
PostgreSQL Switches to New WAL Segment
    ↓
Old WAL Segment is Marked for Archiving
    ↓
archive_command Runs (copies to /var/lib/postgresql/wal-archive/)
    ↓
WAL File Appears in Archive Directory
```

## 📊 WAL Segment Size

- **Default Size**: 16MB per segment
- **Configurable**: Can be 1MB, 2MB, 4MB, 8MB, 16MB, 32MB, 64MB, 128MB, 256MB, 512MB, 1GB, 2GB, 4GB, 8GB, 16GB
- **Your Current**: 16MB (default)

## ⏰ Timeline Example

Let's say you have a busy database:

```
06:00 AM - Base backup created (full snapshot)
06:01 AM - User inserts 100 records → WAL written (segment 000006)
06:05 AM - User updates 50 records → WAL written (still segment 000006)
06:10 AM - User deletes 20 records → WAL written (still segment 000006)
06:15 AM - Segment 000006 fills up (16MB) → Archived automatically
06:16 AM - New segment 000007 starts
06:20 AM - Checkpoint occurs → Any pending WAL segments archived
06:30 AM - More transactions → WAL written to segment 000007
...
02:00 AM (next day) - New base backup created
```

## 🎯 Key Points

1. **WAL is Continuous**: Not tied to base backup schedule
   - Base backups: Daily at 2 AM (scheduled)
   - WAL archiving: Continuous (as transactions occur)

2. **WAL Segments Archive When**:
   - Segment fills up (16MB)
   - Checkpoint occurs
   - Manual `pg_switch_wal()` is called
   - Database is shut down gracefully

3. **Archive Command Runs Automatically**: 
   - You don't need to do anything
   - PostgreSQL calls `archive_command` whenever a segment is ready

4. **WAL Files Accumulate**:
   - They keep growing until the next base backup
   - After a base backup, old WAL files can be cleaned up (but we keep them for PITR)

## 🔍 Monitoring WAL Activity

```bash
# Check current WAL segment
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT pg_current_wal_lsn(), pg_walfile_name(pg_current_wal_lsn());"

# Check WAL archive statistics
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SELECT * FROM pg_stat_archiver;"

# Count WAL files in archive
docker exec postgres-backup ls /var/lib/postgresql/wal-archive/ | wc -l

# Check WAL size settings
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres psql -U rc_survey_user -d rc_survey_db -c "SHOW max_wal_size; SHOW min_wal_size;"
```

## 📈 Expected Behavior

### Low Activity Database
- Few transactions → WAL segments fill slowly
- Segments might archive only during checkpoints (every 15 min)
- You might see 1-2 WAL files per hour

### High Activity Database
- Many transactions → WAL segments fill quickly
- Segments archive frequently (every few minutes)
- You might see 10+ WAL files per hour

### Your Current Status
- 5 WAL files archived (64MB total)
- This is normal for the testing you did
- As your application runs, more WAL files will be created automatically

## 🎓 Summary

**WAL segments are created:**
- ✅ Continuously as transactions occur
- ✅ When current segment fills up (16MB)
- ✅ During checkpoints
- ✅ When manually switched

**They are NOT created:**
- ❌ Only during base backups
- ❌ On a fixed schedule
- ❌ Only when you tell it to

**Base backups vs WAL:**
- **Base Backup**: Full snapshot, scheduled (daily at 2 AM)
- **WAL Archive**: Incremental changes, continuous (as transactions happen)

Your backup system is working perfectly! WAL files will continue to be created and archived automatically as your application processes transactions.

