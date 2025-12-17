# Database URL Password Encoding Fix

## 🚨 Problem

Prisma error: `P1013: The provided database string is invalid. invalid port number in database URL.`

**Cause:** Your password contains special characters (`+`, `/`, `=`) that need to be URL-encoded in the connection string.

**Your password:** `3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=`

**Special characters that need encoding:**
- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`

---

## ✅ Solution: URL-Encode the Password

### Option 1: Manual Encoding

Your password: `3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=`

Encoded password: `3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D`

**Updated DATABASE_URL:**
```
DATABASE_URL=postgresql://rc_survey_user:3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D@localhost:5432/rc_survey_db
```

### Option 2: Use Node.js to Encode (Recommended)

```bash
# In Node.js
node -e "console.log(encodeURIComponent('3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM='))"
```

**Output:**
```
3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D
```

### Option 3: Use Python

```bash
python3 -c "import urllib.parse; print(urllib.parse.quote('3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=', safe=''))"
```

---

## 🔧 Quick Fix

### Step 1: Get Your Password

```bash
# From your .env file
cat packages/database/.env | grep DATABASE_URL
```

### Step 2: Extract and Encode Password

```bash
# Extract password (the part between : and @)
PASSWORD="3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM="

# Encode it
ENCODED=$(node -e "console.log(encodeURIComponent('$PASSWORD'))")
echo $ENCODED
```

### Step 3: Update .env File

```bash
cd packages/database
nano .env
```

**Replace the DATABASE_URL with:**
```env
DATABASE_URL=postgresql://rc_survey_user:3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D@localhost:5432/rc_survey_db
```

### Step 4: Test Connection

```bash
npm run db:migrate
```

---

## 📋 Character Encoding Reference

| Character | URL Encoded | When to Encode |
|-----------|------------|----------------|
| `+` | `%2B` | Always |
| `/` | `%2F` | Always |
| `=` | `%3D` | Always |
| `@` | `%40` | In password (but @ separates user:pass from host) |
| `#` | `%23` | Always |
| `?` | `%3F` | Always |
| `&` | `%26` | Always |
| `%` | `%25` | Always |
| `:` | `%3A` | In password (but : separates user from pass) |
| ` ` (space) | `%20` or `+` | Always |

---

## 🔍 Verify Your Connection String

### Test with psql

```bash
# Try connecting with the encoded password
psql "postgresql://rc_survey_user:3XJPUj9Wf9%2BZUiqbgoY%2FIl150vTuIPmglk9GQxHTOWM%3D@localhost:5432/rc_survey_db"
```

### Test with Prisma

```bash
cd packages/database
npx prisma db pull
# Should work without errors
```

---

## 💡 Best Practice: Use Environment Variables

Instead of hardcoding the password in the connection string, use separate variables:

```env
# In packages/database/.env
POSTGRES_USER=rc_survey_user
POSTGRES_PASSWORD=3XJPUj9Wf9+ZUiqbgoY/Il150vTuIPmglk9GQxHTOWM=
POSTGRES_DB=rc_survey_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Build DATABASE_URL in code (Prisma will handle encoding)
# Or use a script to build it
```

**Then in your code:**
```typescript
const password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
const databaseUrl = `postgresql://${process.env.POSTGRES_USER}:${password}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
```

---

## 🆘 Alternative: Use a Simpler Password

If you want to avoid encoding issues, generate a password without special characters:

```bash
# Generate password without special chars
openssl rand -base64 32 | tr -d '+/=' | head -c 32
```

Or use only alphanumeric:
```bash
openssl rand -hex 32
```

---

## ✅ Quick Fix Command

```bash
cd packages/database

# Get current password from DATABASE_URL
CURRENT_URL=$(grep DATABASE_URL .env | cut -d'=' -f2-)

# Extract password (between : and @)
PASSWORD=$(echo $CURRENT_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Encode password
ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('$PASSWORD'))")

# Build new URL
USER=$(echo $CURRENT_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
HOST_PORT_DB=$(echo $CURRENT_URL | sed -n 's/.*@\(.*\)/\1/p')
NEW_URL="postgresql://${USER}:${ENCODED_PASSWORD}@${HOST_PORT_DB}"

# Update .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" .env

echo "✅ Updated DATABASE_URL with encoded password"
echo "New URL: $NEW_URL"
```

---

**The fix: URL-encode the special characters in your password!**

