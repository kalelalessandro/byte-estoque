import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getSubscription } from "@/server/subscriptions";
import { subscriptionAccess } from "@/lib/subscription-state";
import type { Permission } from "@/lib/rbac";
import { Logo } from "@/components/logo";

const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/dashboard", label: "Dashboard", perm: "products:read" },
  { href: "/produtos", label: "Produtos", perm: "products:read" },
  { href: "/clientes", label: "Clientes", perm: "customers:read" },
  { href: "/fornecedores", label: "Fornecedores", perm: "suppliers:read" },
  { href: "/estoque", label: "Estoque", perm: "stock:read" },
  { href: "/compras", label: "Compras", perm: "purchases:read" },
  { href: "/vendas", label: "Vendas / PDV", perm: "sales:read" },
  { href: "/caixa", label: "Caixa", perm: "cash:read" },
  { href: "/filiais", label: "Filiais", perm: "branches:read" },
  { href: "/financeiro", label: "Financeiro", perm: "finance:read" },
  { href: "/relatorios", label: "Relatorios", perm: "reports:read" },
  { href: "/importacao", label: "Importacao", perm: "products:write" },
  { href: "/assinatura", label: "Assinatura", perm: "billing:read" },
  { href: "/notificacoes", label: "Notificacoes", perm: "products:read" },
  { href: "/lgpd", label: "Privacidade (LGPD)", perm: "lgpd:manage" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.tenantId) redirect("/login"); // platform admin usa outra area

  const sub = await getSubscription(session.user.tenantId);
  const access = subscriptionAccess(sub.status);
  if (!access.canUse) redirect("/assinatura");
  const banner = access.warn
    ? sub.status === "TRIALING"
      ? `Periodo de teste ativo ate ${new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}.`
      : sub.status === "PAST_DUE"
        ? "Pagamento pendente — regularize para nao perder o acesso."
        : null
    : null;

  const role = session.user.role;
  const items = NAV.filter((i) => can(role, i.perm));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:flex">
        <div className="mb-6 px-2"><Logo /></div>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="rounded-lg px-3 py-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800">
          <div className="truncate px-3">{session.user.email}</div>
          <div className="px-3 text-neutral-400">{role}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="sm:hidden"><Logo /></div>
          <div className="ml-auto">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-sm text-neutral-500 hover:text-red-500">Sair</button>
            </form>
          </div>
        </header>
        {banner && (
          <div className="border-b border-amber-300/40 bg-amber-50 px-6 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {banner} <a href="/assinatura" className="font-medium underline">Gerenciar assinatura</a>
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
