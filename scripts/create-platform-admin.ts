// Cria um SUPER-ADMIN da plataforma (role PLATFORM_ADMIN, sem tenant).
// USO (ops, fora do fluxo do app — nunca exposto a usuarios de tenant):
//   PLATFORM_ADMIN_EMAIL=... PLATFORM_ADMIN_PASSWORD=... npm run create:platform-admin
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Defina PLATFORM_ADMIN_EMAIL e PLATFORM_ADMIN_PASSWORD.");
  await prisma.user.upsert({
    where: { email },
    update: { role: "PLATFORM_ADMIN", tenantId: null },
    create: { email, name: "Platform Admin", passwordHash: await bcrypt.hash(password, 12), role: "PLATFORM_ADMIN", tenantId: null },
  });
  console.log(`Super-admin pronto: ${email}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
