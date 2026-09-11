import { auth } from "@/lib/auth";

/** Garante que ha usuario autenticado; lanca se nao houver. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session;
}

/**
 * Fonte unica e confiavel do tenant: derivada da sessao no servidor.
 * Platform admins nao tem tenant e sao rejeitados aqui (eles usam a area /admin).
 */
export async function requireTenant() {
  const session = await requireSession();
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("NO_TENANT");
  return { tenantId, userId: session.user.id, role: session.user.role };
}
