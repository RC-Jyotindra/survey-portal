# Completion Email Notifications Feature

## Overview

This feature automatically sends email notifications when a survey respondent completes a survey (session status = COMPLETED).

## How It Works

When a session is marked as `COMPLETED` in the survey-service, the system:
1. Queries the survey to get notification settings and creator information
2. Determines the recipient email (priority: configured notification email → survey creator email)
3. Sends an email notification with survey details

**Simple & Direct**: No Kafka/event dependencies - emails are sent synchronously right when the session is completed.

## Implementation Details

### Files Created

- `services/survey-service/src/lib/mailer.ts` - Email sending functionality using nodemailer
- `services/survey-service/src/lib/completion-notifications.ts` - Notification logic that queries survey/user data and sends emails
- `docs/COMPLETION_EMAIL_NOTIFICATIONS.md` - This documentation

### Files Modified

- `services/survey-service/package.json` - Added nodemailer dependency
- `services/survey-service/src/controllers/runtime.controller.ts` - Added email notification calls when sessions complete
- `services/survey-service/src/runtime-quota/index.ts` - Added email notification in quota completion flow
- `services/survey-service/env.example` - Added SMTP configuration variables

### Email Recipient Priority

The system uses the following priority to determine who receives the notification email:

1. **Configured Notification Email** (from survey settings)
   - Path: `survey.settings.notifications.completionEmail`
   - Example: `{ settings: { notifications: { completionEmail: "notify@example.com" } } }`

2. **Survey Creator Email** (fallback)
   - Queries the User table using `survey.createdByUserId`
   - Uses the creator's email address

3. **No Email Sent** (if neither is available)
   - Logs a warning and skips sending

### Configuration

#### Environment Variables

Add these to your `services/survey-service/.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=no-reply@research-connectllc.com
```

**Note**: For Gmail, you'll need to use an App Password, not your regular password. Go to Google Account → Security → 2-Step Verification → App passwords.

#### Survey Settings (Optional)

You can configure a specific notification email in the survey settings JSON:

```json
{
  "notifications": {
    "completionEmail": "custom-email@example.com"
  }
}
```

This allows you to send notifications to a different email than the survey creator (e.g., a team inbox).

### Email Template

The notification email includes:
- Survey title
- Session ID
- Professional HTML formatting
- Link reference to view in dashboard (you can enhance this)

### Where Emails Are Sent

Emails are automatically sent in these scenarios:

1. **Normal Survey Completion** - When a respondent finishes all questions in `runtime.controller.ts`
2. **Manual Session Completion** - When `completeSession` endpoint is called
3. **Quota-Based Completion** - When quota-based completion happens in `runtime-quota/index.ts`

## Error Handling

- Email sending failures do **not** block the request or session completion
- Errors are logged but don't cause the API to fail
- If no recipient email is found, a warning is logged and no email is sent

## Testing

1. **Complete a survey session** - When a respondent finishes a survey, an email should be sent automatically.

2. **Check logs** - Look for these log messages:
   - `✅ Completion notification email sent to [email] for survey [surveyId]`
   - `📧 Using configured notification email from settings for survey [surveyId]`
   - `📧 Using survey creator email for survey [surveyId]`
   - `⚠️ No recipient email found for survey [surveyId] (session [sessionId]) - skipping notification`

3. **Check recipient inbox** - Verify the email was received.

## Dependencies

- `nodemailer` - Email sending library
- `@repo/database` - Database access (Prisma) - already included

## Advantages of This Approach

✅ **Simple** - No Kafka/event system dependencies  
✅ **Direct** - Emails sent immediately when completion happens  
✅ **Reliable** - No message queue to manage  
✅ **Easy to debug** - All logic in one service  
✅ **Low latency** - No event processing delays  

## Notes

- The feature works automatically once configured - no manual triggering needed
- Email sending is non-blocking (errors won't fail the request)
- The system gracefully handles missing email configurations
- All email sending happens in the survey-service, keeping it simple and direct