import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "learnandcodewithchatgpt@gmail.com",
        pass: "hwyr qlry gpjt nfxx",
      },
});

export async function sendOtpEmail(to: string, code: string) {
  const from = process.env.MAIL_FROM || "no-reply@research-connectllc.com";
  const subj = "Your verification code";
  const html = `
    <p>Use this code to verify your email:</p>
    <p style="font-size:22px;font-weight:700;letter-spacing:3px">${code}</p>
    <p>This code expires in 10 minutes.</p>
  `;
  await transporter.sendMail({ to, from, subject: subj, html });
}
