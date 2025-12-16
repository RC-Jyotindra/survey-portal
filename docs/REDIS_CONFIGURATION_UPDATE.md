# Redis Configuration Updates

## ✅ Changes Made

### 1. `packages/event-bus/src/config/redis.config.ts`

**Security Improvements:**
- ✅ Added password validation warning in production
- ✅ Enhanced error handling for authentication failures
- ✅ Better REDIS_URL construction with password
- ✅ Added connection timeout and retry strategy
- ✅ Improved logging for security-related errors

**Key Changes:**
- Now validates password is provided in production
- Constructs Redis URL with password if not provided
- Better error messages for authentication failures
- Added reconnection handling

### 2. `ecosystem.config.js`

**Security Improvements:**
- ✅ Removed hardcoded empty password
- ✅ Changed to use REDIS_HOST, REDIS_PORT, REDIS_PASSWORD separately
- ✅ Added comments about setting REDIS_PASSWORD environment variable
- ✅ Updated both `env` and `env_production` sections

**Key Changes:**
- No longer uses `REDIS_URL` without password
- Uses separate config options (more secure)
- Password must be set via environment variable

## 🔧 How to Use

### Step 1: Set Redis Password Environment Variable

**Before starting PM2:**
```bash
# Generate strong password
openssl rand -base64 32

# Export as environment variable
export REDIS_PASSWORD=your_generated_password_here

# Or add to your shell profile (~/.bashrc or ~/.zshrc)
echo 'export REDIS_PASSWORD=your_generated_password_here' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: Verify Environment Variable

```bash
echo $REDIS_PASSWORD
# Should show your password
```

### Step 3: Start PM2 with Environment Variable

```bash
# PM2 will automatically use the REDIS_PASSWORD environment variable
pm2 start ecosystem.config.js --env production
```

### Step 4: Verify Redis Connection

Check PM2 logs to ensure Redis connects successfully:
```bash
pm2 logs rc-survey-service | grep -i redis
# Should show: "Redis client connected" and "Redis client ready"
```

## 🔒 Security Notes

### Why These Changes Matter

1. **No Hardcoded Passwords**: Passwords are now only in environment variables
2. **Production Validation**: Code warns if password is missing in production
3. **Better Error Messages**: Clear errors when authentication fails
4. **Flexible Configuration**: Supports both URL and individual config options

### Environment Variable Security

**✅ DO:**
- Set REDIS_PASSWORD via environment variable
- Use strong passwords (32+ characters)
- Never commit passwords to version control
- Use different passwords for different environments

**❌ DON'T:**
- Hardcode passwords in code
- Commit .env files with passwords
- Use weak passwords
- Share passwords in logs or error messages

## 📋 Configuration Options

### Option 1: Using Environment Variables (Recommended)

```javascript
// In ecosystem.config.js
env: {
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD, // From environment
  REDIS_DB: '0'
}
```

**Usage:**
```bash
export REDIS_PASSWORD=your_password
pm2 start ecosystem.config.js
```

### Option 2: Using REDIS_URL

If you prefer URL format:
```javascript
env: {
  REDIS_URL: process.env.REDIS_PASSWORD 
    ? `redis://:${process.env.REDIS_PASSWORD}@localhost:6379/0`
    : undefined
}
```

## 🧪 Testing

### Test Redis Connection

```typescript
import { createRedisClient } from '@repo/event-bus';

const redis = createRedisClient();
await redis.connect();

// Should succeed if password is correct
const isHealthy = await redis.ping();
console.log('Redis healthy:', isHealthy); // Should be true
```

### Test Authentication Failure

If password is wrong, you should see:
```
❌ Redis authentication failed. Check REDIS_PASSWORD environment variable.
Redis error: NOAUTH Authentication required.
```

## ⚠️ Important Notes

1. **Environment Variable Must Be Set**: PM2 services will fail to connect to Redis if REDIS_PASSWORD is not set
2. **Match Docker Password**: The password must match the one in `infra/docker/.env`
3. **Restart Services**: After setting password, restart PM2 services:
   ```bash
   pm2 restart all
   ```

## 🔄 Migration Steps

If you're updating from the old configuration:

1. **Stop PM2 services:**
   ```bash
   pm2 stop all
   ```

2. **Set REDIS_PASSWORD environment variable:**
   ```bash
   export REDIS_PASSWORD=your_password_from_docker_compose
   ```

3. **Verify password matches Docker:**
   ```bash
   # Check docker-compose.yml or .env file
   cat infra/docker/.env | grep REDIS_PASSWORD
   ```

4. **Start PM2 services:**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

5. **Verify connections:**
   ```bash
   pm2 logs | grep -i redis
   # Should show successful connections
   ```

## 📚 Related Files

- `infra/docker/docker-compose.yml` - Docker Redis configuration
- `infra/docker/.env` - Docker environment variables (should match PM2)
- `packages/event-bus/src/config/redis.config.ts` - Redis client code
- `ecosystem.config.js` - PM2 configuration

---

**Status**: Configuration updated. Remember to set REDIS_PASSWORD environment variable before starting services!

