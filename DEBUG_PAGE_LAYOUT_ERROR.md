# 🔍 Debug Guide: "Failed to get page layout" Error

## **Problem:**
The survey runtime is failing with "Failed to get page layout" error when trying to load a survey page.

## **What I've Fixed So Far:**

### ✅ **Updated SurveyRuntime Component**
- **File**: `apps/web/app/s/[sessionId]/components/SurveyRuntime.tsx`
- **Changes**: 
  - Added API client import
  - Updated all fetch calls to use `api.get()` and `api.post()`
  - Added proper TypeScript typing
  - Improved error handling

## **Possible Root Causes:**

### **1. Session Doesn't Exist**
- The session ID `37948de6-de2c-489d-8965-89d8221cba7a` might not exist in the database
- The session might have been deleted or expired

### **2. Page Doesn't Exist**
- The page ID being requested might not exist
- The survey might not have any pages

### **3. Survey Doesn't Exist**
- The survey associated with the session might not exist
- The survey might be deleted or inactive

### **4. Database Connection Issues**
- Prisma might not be connecting to the database
- Database might be down or inaccessible

### **5. Runtime Service Issues**
- The survey service might not be running
- The runtime endpoints might not be working

## **Debugging Steps:**

### **Step 1: Check if Service is Running**
```bash
cd services/survey-service && npm run dev
```
- Should see: `🚀 Survey service running on port 3002`
- Check for any error messages

### **Step 2: Test Runtime Endpoints Directly**
```bash
# Test health endpoint
curl https://88be5b4665fe.ngrok-free.app/health

# Test session status (replace with actual session ID)
curl https://88be5b4665fe.ngrok-free.app/api/runtime/37948de6-de2c-489d-8965-89d8221cba7a/status
```

### **Step 3: Check Database**
```bash
cd packages/database && npx prisma studio
```
- Look for the session in `SurveySession` table
- Check if the survey exists in `Survey` table
- Check if pages exist in `SurveyPage` table

### **Step 4: Check Browser Network Tab**
1. Open browser dev tools
2. Go to Network tab
3. Try to access the survey
4. Look for failed requests
5. Check the response body for error details

### **Step 5: Check Console Logs**
1. Open browser dev tools
2. Go to Console tab
3. Look for any JavaScript errors
4. Check for API call errors

## **Quick Fixes to Try:**

### **Fix 1: Restart Services**
```bash
# Stop all services
# Then restart:
cd services/survey-service && npm run dev
cd apps/web && npm run dev
```

### **Fix 2: Check Database Migration**
```bash
cd packages/database && npx prisma migrate dev
```

### **Fix 3: Clear Browser Cache**
- Hard refresh the page (Ctrl+Shift+R)
- Clear browser cache and cookies

### **Fix 4: Check Environment Variables**
- Make sure `DATABASE_URL` is set correctly
- Make sure all required environment variables are present

## **Expected API Flow:**

1. **Start Session**: `POST /api/runtime/start?slug=:slug`
2. **Get Status**: `GET /api/runtime/:sessionId/status`
3. **Get Page Layout**: `GET /api/runtime/:sessionId/pages/:pageId/layout`

## **Common Error Messages:**

- `"Session not found"` → Session doesn't exist in database
- `"Survey not found"` → Survey doesn't exist
- `"Page not found"` → Page doesn't exist
- `"Session is not active"` → Session status is not 'IN_PROGRESS'
- `"Failed to get page layout"` → Error in resolvePage function

## **Next Steps:**

1. **Check if the service is running**
2. **Test the endpoints directly**
3. **Check the database for the session**
4. **Look at the browser network tab for detailed error info**

Let me know what you find in the debugging steps, and I can help you fix the specific issue! 🔧
