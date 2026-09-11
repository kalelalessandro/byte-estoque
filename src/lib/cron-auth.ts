// Autenticacao do cron: compara o header Authorization com CRON_SECRET em tempo
// constante. Puro/testavel.
import { timingSafeEqual } from "crypto";

export function authorizeCron(authHeader: string | null | undefined, secret: string | undefined): boolean {
  if (!secret) return false; // sem segredo configurado => nega
  const expected = `Bearer ${secret}`;
  const got = authHeader ?? "";
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
