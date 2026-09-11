// Provedor SMTP real (nodemailer). Requer env: SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS, EMAIL_FROM. Chamada externa — NAO testavel sem servidor SMTP.
import nodemailer from "nodemailer";
import type { EmailMessage, EmailProvider } from "./provider";

export class SmtpEmailProvider implements EmailProvider {
  readonly id = "smtp";
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  async send(msg: EmailMessage): Promise<{ providerId?: string }> {
    const info = await this.transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "no-reply@byteforce.app",
      to: msg.to, subject: msg.subject, html: msg.html, text: msg.text,
    });
    return { providerId: info.messageId };
  }
}
