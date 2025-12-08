# Survey Runtime Testing Guide

## Prerequisites
1. Make sure your survey service is running on port 3002
2. Make sure your web app is running on port 3000
3. Have a survey created in the survey builder

## Testing Steps

### 1. Create a Test Survey Link

1. **Navigate to Survey Builder**
   ```
   http://localhost:3000/survey-builder/edit/[your-survey-id]
   ```

2. **Go to Distribute Tab**
   - Click on the "Distribute" tab
   - You should see the collector management interface

3. **Create a Public Link**
   - Click "Create Link"
   - Fill out:
     - Type: "Public Link"
     - Name: "Test Survey Link"
     - Slug: "test-survey" (or leave empty for auto-generation)
     - Max Responses: 10 (for testing)
     - Allow Multiple Devices: Yes
     - Allow Test: Yes
   - Click "Create Link"

4. **Copy the Generated Link**
   - The system will show you a public URL like:
     ```
     http://localhost:3000/c/test-survey
     ```

### 2. Test the Survey Flow

#### **Test 1: Basic Survey Flow**
1. **Open the survey link** in a new browser tab/incognito window
2. **Expected behavior:**
   - Should redirect to `/c/test-survey`
   - Should show "Starting Survey" loading screen
   - Should redirect to `/s/[session-id]`
   - Should load the first page of your survey

3. **Fill out the survey:**
   - Answer questions as they appear
   - Click "Next" to proceed
   - Complete the survey

4. **Expected completion:**
   - Should redirect to `/thank-you` page
   - Should show success message

#### **Test 2: Test Response Limits**
1. **Create a new link with max responses = 1**
2. **Complete the survey once**
3. **Try to access the same link again**
4. **Expected:** Should show "Survey quota has been reached" error

#### **Test 3: Test Date Restrictions**
1. **Create a link with:**
   - Opens At: Tomorrow's date
   - Closes At: Yesterday's date
2. **Try to access the link**
3. **Expected:** Should show appropriate error message

#### **Test 4: Test Single-Use Links**
1. **Create a Single-Use link**
2. **Click "Manage Invites"**
3. **Add test emails:**
   ```
   test1@example.com
   test2@example.com
   ```
4. **Create invites**
5. **Copy one of the invite URLs**
6. **Test the invite:**
   - First use: Should work normally
   - Second use: Should show "This access link has already been used"

### 3. Test Admin Interface

#### **Test Collector Management**
1. **View collector stats:**
   - Should show response counts
   - Should show completion rates

2. **Test link copying:**
   - Click copy button
   - Paste in new tab
   - Should work correctly

3. **Test collector deletion:**
   - Delete a collector
   - Try to access its link
   - Should show "Survey link not found"

#### **Test Invite Management**
1. **Create multiple invites**
2. **View invite stats:**
   - Total, Active, Used, Expired counts
3. **Test invite revocation:**
   - Revoke an active invite
   - Try to use it
   - Should show "Invalid access token"
4. **Test CSV export:**
   - Click "Export CSV"
   - Should download a file with invite data

### 4. Test Error Scenarios

#### **Test Invalid Links**
1. **Access non-existent slug:**
   ```
   http://localhost:3000/c/non-existent
   ```
   - Expected: "Survey link not found"

2. **Access invalid session:**
   ```
   http://localhost:3000/s/invalid-session-id
   ```
   - Expected: "Session not found"

#### **Test Survey Completion Edge Cases**
1. **Try to submit without answers:**
   - Expected: Validation errors should appear

2. **Try to access completed session:**
   - Complete a survey
   - Try to access the session URL again
   - Expected: Should redirect to thank you page

### 5. Test Different Question Types

Make sure your test survey includes various question types:
- Single Choice
- Multiple Choice
- Text Input
- Email
- Number
- Date
- Yes/No

Test that each type:
- Renders correctly
- Validates properly
- Submits successfully

### 6. Test Mobile Responsiveness

1. **Open survey on mobile device or browser dev tools**
2. **Test the responsive design:**
   - Questions should be readable
   - Buttons should be touch-friendly
   - Navigation should work smoothly

## Debugging Tips

### Check Browser Console
- Look for JavaScript errors
- Check network requests in DevTools
- Verify API calls are successful

### Check Server Logs
- Monitor survey service logs on port 3002
- Look for any runtime errors
- Check database queries

### Common Issues
1. **CORS errors:** Make sure CORS is configured properly
2. **API not found:** Check that routes are properly registered
3. **Database errors:** Ensure Prisma client is connected
4. **Session issues:** Check that session IDs are valid UUIDs

## API Testing with curl

You can also test the APIs directly:

```bash
# Start a session
curl -X POST "http://localhost:3002/api/runtime/start?slug=test-survey" \
  -H "Content-Type: application/json"

# Get page layout (replace with actual session ID)
curl "http://localhost:3002/api/runtime/[session-id]/pages/[page-id]/layout"

# Submit answers
curl -X POST "http://localhost:3002/api/runtime/[session-id]/answers" \
  -H "Content-Type: application/json" \
  -d '{"pageId":"[page-id]","answers":[{"questionId":"[question-id]","textValue":"Test answer"}]}'
```

## Expected Results

After successful testing, you should have:
1. ✅ Working survey links that start sessions
2. ✅ Complete survey flow from start to finish
3. ✅ Proper validation and error handling
4. ✅ Admin interface for managing collectors
5. ✅ Single-use invite system working
6. ✅ Response tracking and statistics
7. ✅ Mobile-responsive design

This confirms that your responses engine is fully functional!
