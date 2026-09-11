import type { EmailProvider } from "./provider";
import { ConsoleEmailProvider } from "./provider";
import { SmtpEmailProvider } from "./smtp";

export function getEmailProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER) {
    case "smtp": return new SmtpEmailProvider();
    default: return new ConsoleEmailProvider(); // dev: nao envia de verdade
  }
}
export function isEmailConfigured(): boolean {
  return (process.env.EMAIL_PROVIDER ?? "console") !== "console";
}
export type { EmailProvider, EmailMessage } from "./provider";
