import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: parseInt("465"),
  secure: true,
  auth: {
    user: "learnandcodewithchatgpt@gmail.com",
    pass: "hwyr qlry gpjt nfxx",
  },
});

export async function sendCompletionNotificationEmail(
  to: string | string[],
  surveyTitle: string,
  sessionId: string,
  respondentName?: string
) {
  const from = "no-reply@research-connectllc.com";
  const subject = "Survey Respondent Completed";
  
  // Build the respondent info section
  const respondentInfo = respondentName 
    ? `<p style="margin: 0; color: #333;">
         <strong>Respondent Name:</strong> ${respondentName}
       </p>`
    : '';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">You Have a Completed Respondent</h2>
      <p style="color: #666; line-height: 1.6;">
        A respondent has completed the survey: <strong>${surveyTitle}</strong>
      </p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        ${respondentInfo}
        <p style="margin: ${respondentName ? '10px 0 0 0' : '0'}; color: #333;">
          <strong>Session ID:</strong> ${sessionId}
        </p>
        <p style="margin: 10px 0 0 0; color: #333;">
          <strong>Survey:</strong> ${surveyTitle}
        </p>
      </div>
      <p style="color: #666; line-height: 1.6;">
        You can view the response in your survey dashboard.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This is an automated notification from Research Connect Survey Platform.
      </p>
    </div>
  `;

  try {
    // Nodemailer accepts both string and array for 'to' field
    await transporter.sendMail({ to, from, subject, html });
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    console.log(`✅ [EMAIL_SENT] Completion notification sent to: ${recipients}`);
  } catch (error) {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    console.error(`❌ [EMAIL_ERROR] Failed to send completion notification to ${recipients}:`, error);
    throw error;
  }
}

