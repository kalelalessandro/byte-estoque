import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform";

export class PlatformForbiddenError extends Error { constructor() { super("FORBIDDEN_PLATFORM"); this.name = "PlatformForbiddenError"; } }

/** Autoridade de plataforma — checada SEMPRE no servidor. Nao confia no frontend. */
export async function requirePlatformAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user || !isPlatformAdmin(session.user.role)) throw new PlatformForbiddenError();
  return { userId: session.user.id };
}
