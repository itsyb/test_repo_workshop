import "server-only";
import nodemailer from "nodemailer";

export async function sendLoginEmail(to: string, link: string) {
  if (!process.env.SMTP_URL) {
    console.info(`[mail] SMTP_URL not set — sign-in link for ${to}: ${link}`);
    return;
  }
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({
    from: process.env.MAIL_FROM || "Gem Quest <no-reply@localhost>",
    to,
    subject: "Your Gem Quest sign-in link",
    text: `Sign in to Gem Quest:\n\n${link}\n\nThe link works once and expires in 15 minutes.`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;background:#000;color:#f5f5f7;padding:40px;border-radius:24px">
<h1 style="font-weight:600;letter-spacing:-0.02em;margin:0 0 16px">Gem Quest</h1>
<p style="color:#a1a1a6;margin:0 0 28px">Tap the button to sign in. The link works once and expires in 15 minutes.</p>
<a href="${link}" style="display:inline-block;background:#f5f5f7;color:#000;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Sign in</a>
</div>`,
  });
}
