// Abstracao de provedor de e-mail. O dominio depende SO desta interface.
// Config exclusivamente por env; nenhuma credencial no codigo.
export type EmailMessage = { to: string; subject: string; html: string; text?: string };
export interface EmailProvider {
  readonly id: string;
  send(msg: EmailMessage): Promise<{ providerId?: string }>;
}

// DEV: apenas registra no console. NAO envia e-mail de verdade (documentado).
export class ConsoleEmailProvider implements EmailProvider {
  readonly id = "console";
  async send(msg: EmailMessage): Promise<{ providerId?: string }> {
    console.log(`[email:console] para=${msg.to} assunto="${msg.subject}" (nao enviado de verdade)`);
    return { providerId: `console-${Date.now()}` };
  }
}
