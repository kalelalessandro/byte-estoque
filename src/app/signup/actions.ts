"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/lib/auth";
import { signupSchema } from "@/lib/validators/signup";
import { ensureDefaultBranch } from "@/server/branches";
import { ensureSubscription } from "@/server/subscriptions";
import { recordConsent } from "@/server/lgpd";

type Result = { ok: false; error: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

// Retorna erro em caso de falha; em caso de sucesso NAO retorna (faz signIn->redirect).
export async function signupAction(formData: FormData): Promise<Result | void> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { ok: false, error: "Ja existe uma conta com esse e-mail." };

  const slug = `${slugify(data.companyName)}-${Math.random().toString(36).slice(2, 6)}`;
  let created = "";

  try {
    // Tenant + OWNER criados atomicamente. Nenhum dado de negocio e inserido:
    // a empresa comeca vazia (produtos/clientes/etc. sao cadastrados depois).
    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          slug,
          cnpj: data.cnpj || null,
          phone: data.phone || null,
        },
      });
      await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: await hashPassword(data.password),
          role: "OWNER",
          tenantId: tenant.id,
        },
      });
      created = tenant.id;
    });
  } catch {
    return { ok: false, error: "Nao foi possivel criar a conta. Tente novamente." };
  }

  // Filial padrao criada DENTRO do contexto de tenant (RLS exige o GUC setado).
  try { await ensureDefaultBranch(created); await ensureSubscription(created); await recordConsent(created, null, "terms", true, "1.0"); } catch { /* criados sob demanda no 1o uso */ }

  // Fora do try: o redirect do signIn deve propagar normalmente.
  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirectTo: "/dashboard",
  });
}
