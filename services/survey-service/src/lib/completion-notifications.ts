import { PrismaClient } from '@prisma/client';
import { sendCompletionNotificationEmail } from './mailer';

/**
 * Get hardcoded recipient emails for completion notifications
 * Edit the array below to add/remove recipient emails
 */
function getRecipientEmails(): string[] {
  // Hardcoded recipient emails - edit this array to add/remove emails
  const hardcodedEmails: string[] = [
    'vijay@research-connectllc.com',
    'support@research-connectllc.com',
    'rajesh@research-world.net',
    'jyotindra@research-world.net',
  ];

  return hardcodedEmails.filter(email => email.length > 0);
}

/**
 * Send completion notification email when a session/respondent is completed
 * 
 * Sends a single email to all hardcoded recipient emails in the 'to' field.
 * Edit the hardcodedEmails array in getRecipientEmails() to configure recipients.
 */
export async function sendCompletionNotificationForSession(
  prisma: PrismaClient,
  tenantId: string,
  surveyId: string,
  sessionId: string
): Promise<void> {
  try {
    // Fetch survey for title
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: {
        id: true,
        title: true,
      }
    });

    if (!survey) {
      console.warn(`⚠️ Survey not found: ${surveyId} - cannot send completion notification`);
      return;
    }

    // Get the first question of the survey (ordered by page index and question index)
    const firstQuestion = await prisma.question.findFirst({
      where: {
        surveyId,
        tenantId,
      },
      include: {
        page: {
          select: {
            index: true,
          },
        },
      },
      orderBy: [
        { page: { index: 'asc' } },
        { index: 'asc' },
      ],
    });

    // Try to get the answer for the first question to extract respondent name
    let respondentName: string | undefined = undefined;
    
    if (firstQuestion) {
      const firstAnswer = await prisma.answer.findUnique({
        where: {
          sessionId_questionId: {
            sessionId,
            questionId: firstQuestion.id,
          },
        },
        select: {
          jsonValue: true,
        },
      });

      // Extract name from jsonValue if it's a CONTACT_FORM question
      if (firstAnswer?.jsonValue && typeof firstAnswer.jsonValue === 'object') {
        const jsonData = firstAnswer.jsonValue as any;
        if (jsonData.name && typeof jsonData.name === 'string') {
          respondentName = jsonData.name;
        }
      }
    }

    // Get recipient emails (hardcoded)
    const recipientEmails = getRecipientEmails();

    if (recipientEmails.length === 0) {
      console.warn(`⚠️ No recipient emails configured for completion notifications - skipping email for session ${sessionId}`);
      return;
    }

    // Send a single email to all recipients
    await sendCompletionNotificationEmail(recipientEmails, survey.title, sessionId, respondentName);
    console.log(`✅ Completion notification email sent to ${recipientEmails.join(', ')} for survey ${surveyId} (session ${sessionId})`);
    
  } catch (error) {
    // Don't fail the request if email sending fails - just log the error
    console.error(`❌ Error sending completion notification for session ${sessionId}:`, error);
  }
}

