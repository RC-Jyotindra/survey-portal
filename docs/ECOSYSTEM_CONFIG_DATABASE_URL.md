# ecosystem.config.js DATABASE_URL Configuration

## 🔑 How It Works

### Current Configuration

The `ecosystem.config.js` now **automatically URL-encodes** the password when building the DATABASE_URL:

```javascript
DATABASE_URL: (() => {
  if (process.env.POSTGRES_PASSWORD) {
    const user = process.env.POSTGRES_USER || 'rc_survey_user';
    const password = encodeURIComponent(process.env.POSTGRES_PASSWORD); // URL-encode!
    const db = process.env.POSTGRES_DB || 'rc_survey_db';
    return `postgresql://${user}:${password}@localhost:5432/${db}`;
  }
  return 'postgresql://rc_survey_user:CHANGE_THIS_PASSWORD@localhost:5432/rc_survey_db';
})(),
```

---

## 📋 How It Works Step-by-Step

### Step 1: Set Environment Variable

```bash
export POSTGRES_PASSWORD=3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=
```

**Plain password** (with special characters: `+`, `/`, `=`)

### Step 2: PM2 Reads Environment Variable

When you run:
```bash
pm2 start ecosystem.config.js --env production
```

PM2 reads `process.env.POSTGRES_PASSWORD` = `3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=`

### Step 3: Password Gets URL-Encoded

The code runs:
```javascript
const password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
```

**Result:** `3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D`

### Step 4: DATABASE_URL is Built

```javascript
`postgresql://rc_survey_user:3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D@localhost:5432/rc_survey_db`
```

### Step 5: Service Uses DATABASE_URL

Your service (e.g., `rc-survey-service`) receives:
```
DATABASE_URL=postgresql://rc_survey_user:3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D@localhost:5432/rc_survey_db
```

### Step 6: Prisma/PostgreSQL Decodes Automatically

When Prisma connects:
1. Reads: `3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D`
2. Decodes: `3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=`
3. Sends to PostgreSQL
4. PostgreSQL compares with stored password
5. ✅ Match! Connection succeeds

---

## ✅ Complete Setup

### 1. Set Environment Variables

```bash
# Set plain password (with special characters)
export POSTGRES_PASSWORD=3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=
export POSTGRES_USER=rc_survey_user
export POSTGRES_DB=rc_survey_db

# Make permanent (optional)
echo 'export POSTGRES_PASSWORD=3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=' >> ~/.bashrc
source ~/.bashrc
```

### 2. Start PM2

```bash
pm2 start ecosystem.config.js --env production
```

**What happens:**
- PM2 reads `POSTGRES_PASSWORD` from environment
- `ecosystem.config.js` automatically encodes it
- Service receives properly encoded DATABASE_URL
- Connection works! ✅

### 3. Verify

```bash
# Check PM2 environment
pm2 env 0 | grep DATABASE_URL
# Should show encoded password

# Check service logs
pm2 logs rc-survey-service | grep -i "database\|prisma\|connected"
# Should show successful connection
```

---

## 🔍 Comparison with packages/database/.env

### packages/database/.env (for Prisma migrations)

```env
DATABASE_URL=postgresql://rc_survey_user:3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D@localhost:5432/rc_survey_db
```

**Manual encoding** - You encode it yourself when writing the file

### ecosystem.config.js (for PM2 services)

```javascript
DATABASE_URL: `postgresql://${user}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@localhost:5432/${db}`
```

**Automatic encoding** - The code encodes it for you

**Both result in the same DATABASE_URL!** ✅

---

## 🧪 Testing

### Test 1: Verify Encoding

```bash
# Set password
export POSTGRES_PASSWORD=3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=

# Test encoding (should match your .env)
node -e "console.log(encodeURIComponent('$POSTGRES_PASSWORD'))"
# Output: 3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D
```

### Test 2: Verify PM2 Gets Correct URL

```bash
# Start PM2
pm2 start ecosystem.config.js --env production

# Check environment
pm2 describe rc-survey-service | grep DATABASE_URL
# Should show encoded password
```

### Test 3: Verify Service Connects

```bash
# Check logs
pm2 logs rc-survey-service | grep -i "database\|prisma"
# Should show successful connection, no authentication errors
```

---

## 📊 Summary

| Location | Password Format | Encoding |
|----------|----------------|----------|
| **infra/docker/.env** | `3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=` | Plain (no encoding) |
| **packages/database/.env** | `3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D` | Manual encoding |
| **ecosystem.config.js** | `3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=` | Auto-encoded by code |
| **PM2 Service receives** | `3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D` | Encoded (in DATABASE_URL) |

**All represent the same password!**

---

## ✅ What You Need to Do

1. **Set environment variable** (plain password):
   ```bash
   export POSTGRES_PASSWORD=3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=
   ```

2. **Start PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

3. **That's it!** The code automatically encodes the password for you.

---

**The ecosystem.config.js now handles password encoding automatically - you just need to set the plain password in the environment variable!**

