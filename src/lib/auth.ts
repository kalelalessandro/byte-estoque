import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { UserRole } from "@prisma/client/wasm";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        // Consulta de identidade: tabela `users` NAO tem RLS, entao roda fora
        // de qualquer contexto de tenant (ainda nao sabemos qual e).
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || !user.active) return null;

        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    session({ session, token }) {
  if (session.user) {
    session.user.id = token.sub as string;
    session.user.role = token.role as UserRole;
    session.user.tenantId = token.tenantId as string;
  }
  return session;
},
  },
});
