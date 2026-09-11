// Captura de erros — abstracao. Default: loga estruturado. Para Sentry/etc.,
// pluga-se aqui lendo SENTRY_DSN (documentado); sem acoplar dependencia agora.
import { logger } from "@/lib/logger";
export function captureError(err: unknown, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error("unhandled_error", { message, stack, ...(context ?? {}) });
  // if (process.env.SENTRY_DSN) { /* integrar provedor externo aqui */ }
}
