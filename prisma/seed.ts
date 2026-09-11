// Seed APENAS de desenvolvimento: cria 1 empresa + 1 usuario OWNER para voce
// conseguir logar e testar. NUNCA cria produtos/clientes ficticios.
// Em producao, o tenant nasce vazio (via onboarding/signup — modulo futuro).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@demo.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "senha123";
  const tenantName = process.env.SEED_TENANT_NAME ?? "Empresa Demo";

  const tenant = await prisma.tenant.upsert({
    where: { slug: "empresa-demo" },
    update: {},
    create: { name: tenantName, slug: "empresa-demo" },
  });

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Owner Demo",
      passwordHash: await bcrypt.hash(password, 12),
      role: "OWNER",
      tenantId: tenant.id,
    },
  });

  console.log(`Conta de dev pronta -> login: ${email} / senha: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
