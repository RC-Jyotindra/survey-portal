# Survey Runtime Setup Guide

## Prerequisites

### 1. Database Setup
Make sure you've run the Prisma migration for the new collector models:

```bash
cd packages/database
npx prisma migrate dev --name add_survey_collectors
npx prisma generate
```

### 2. Environment Variables

#### Survey Service (port 3002)
Create/update `services/survey-service/.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/rc_survey"
PORT=3002
CORS_ORIGIN="http://localhost:3000"
PUBLIC_BASE_URL="http://localhost:3000"
ADMIN_BASE_URL="http://localhost:3000"
```

#### Web App (port 3000)
Make sure your Next.js app can connect to the survey service:
```env
NEXT_PUBLIC_API_URL="http://localhost:3002/api"
```

### 3. Start Services

#### Terminal 1: Survey Service
```bash
cd services/survey-service
npm install
npm run dev
```

#### Terminal 2: Web App
```bash
cd apps/web
npm install
npm run dev
```

## Quick Test Setup

### 1. Create a Test Survey
1. Go to `http://localhost:3000/survey-builder/create`
2. Create a simple survey with:
   - Title: "Test Survey"
   - Add a few questions (text, single choice, etc.)
   - Save the survey

### 2. Create a Test Link
1. Go to the survey's edit page
2. Click the "Distribute" tab
3. Create a public link with:
   - Name: "Test Link"
   - Type: "Public Link"
   - Allow test responses: Yes

### 3. Test the Link
1. Copy the generated URL
2. Open it in a new browser tab
3. Complete the survey
4. Check that it redirects to thank you page

## Troubleshooting

### Common Issues

#### 1. "Survey link not found"
- Check that the collector exists in the database
- Verify the slug is correct
- Make sure the survey service is running

#### 2. "Failed to start session"
- Check database connection
- Verify CORS settings
- Check survey service logs

#### 3. "No accessible pages found"
- Make sure your survey has at least one page
- Check that pages are published/active
- Verify page visibility conditions

#### 4. Frontend not loading
- Check that Next.js app is running on port 3000
- Verify API calls are reaching the survey service
- Check browser console for errors

### Database Verification

Check that the new tables exist:
```sql
-- Check collectors table
SELECT * FROM "SurveyCollector" LIMIT 5;

-- Check invites table  
SELECT * FROM "CollectorInvite" LIMIT 5;

-- Check updated sessions table
SELECT id, "collectorId", status FROM "SurveySession" LIMIT 5;
```

### API Health Check

Test the survey service health:
```bash
curl http://localhost:3002/health
```

Should return:
```json
{
  "status": "OK",
  "service": "survey-service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "env": "development"
}
```

## Next Steps

Once everything is working:

1. **Create more complex surveys** with different question types
2. **Test quota management** with response limits
3. **Test single-use invites** with email lists
4. **Test date restrictions** and access controls
5. **Test mobile responsiveness** on different devices

## Production Considerations

For production deployment:

1. **Set up proper authentication** for admin endpoints
2. **Configure rate limiting** for public endpoints
3. **Set up monitoring** and logging
4. **Configure SSL/HTTPS** for all endpoints
5. **Set up database backups** and monitoring
6. **Configure CDN** for static assets
7. **Set up error tracking** (Sentry, etc.)

The system is now ready for production use with proper security and monitoring in place!
