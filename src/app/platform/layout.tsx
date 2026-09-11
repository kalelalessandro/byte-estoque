import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform";
import { Logo } from "@/components/logo";

const NAV = [
  ["/platform", "Visao geral"],
  ["/platform/tenants", "Empresas"],
  ["/platform/pagamentos", "Pagamentos"],
  ["/platform/webhooks", "Webhooks"],
  ["/platform/auditoria", "Auditoria"],
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !isPlatformAdmin(session.user.role)) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">Plataforma</span>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-sm text-neutral-500 hover:text-red-500">Sair</button>
        </form>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <nav className="flex w-48 shrink-0 flex-col gap-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">{label}</Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
