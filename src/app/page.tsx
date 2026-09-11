import Link from "next/link";
import { Logo } from "@/components/logo";
import { PLAN_LIMITS } from "@/lib/entitlements";

const NAV = [
  ["Recursos", "#recursos"],
  ["Planos", "#planos"],
  ["FAQ", "#faq"],
];

const FEATURES = [
  ["Multi-tenant seguro", "Cada empresa isolada por Row-Level Security no Postgres. Os dados de uma nunca alcancam a outra."],
  ["Estoque em tempo real", "Entradas, saidas e ajustes transacionais, a prova de corrida. Nada de estoque negativo."],
  ["Vendas & PDV", "Carrinho, formas de pagamento, venda a prazo que vira conta a receber automaticamente."],
  ["Compras & Fornecedores", "Compras que dao entrada no estoque e geram contas a pagar num passo so."],
  ["Financeiro", "Contas a pagar e a receber, baixa, atrasos e fluxo alimentado por vendas e compras."],
  ["Controle de acesso", "Papeis e permissoes por modulo, validados no servidor — a interface nao e a unica barreira."],
];

const PLAN_META: Record<string, { label: string; price: string; highlight?: boolean }> = {
  STARTER: { label: "Starter", price: "R$ 49/mes" },
  PRO: { label: "Pro", price: "R$ 149/mes", highlight: true },
  BUSINESS: { label: "Business", price: "R$ 399/mes" },
  ENTERPRISE: { label: "Enterprise", price: "Sob consulta" },
};

const FAQ = [
  ["Preciso instalar algo?", "Nao. O Byte Force e um SaaS: voce cria a conta, escolhe o plano e comeca a usar no navegador."],
  ["Meus dados ficam isolados?", "Sim. O isolamento entre empresas e garantido no proprio banco (RLS), alem da aplicacao e do controle de acesso."],
  ["Posso comecar pequeno e crescer?", "Sim. Os planos definem limites de produtos, usuarios e clientes, e voce faz upgrade quando precisar."],
  ["Como funciona a cobranca?", "Assinatura mensal ou anual. O plano anual sai mais barato no total do ano."],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050914] text-neutral-100">
      {/* fundo com brilho ciano */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] bg-brand-blue/10 blur-[120px]" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden gap-7 text-sm text-neutral-300 md:flex">
          {NAV.map(([l, h]) => <a key={h} href={h} className="hover:text-white">{l}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-neutral-300 hover:text-white">Entrar</Link>
          <Link href="/signup" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-dark">Criar conta</Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 px-4 py-1.5 text-sm text-brand">
          Gestao empresarial multi-tenant
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          A gestao da sua empresa,<br /><span className="bg-gradient-to-r from-brand to-brand-blue bg-clip-text text-transparent">num so lugar</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-300">
          Produtos, estoque, vendas, compras e financeiro integrados — com isolamento de dados de nivel empresarial e controle de acesso de verdade.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="rounded-full bg-brand px-7 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(34,211,238,0.35)] transition hover:bg-brand-dark">Comecar agora</Link>
          <a href="#recursos" className="rounded-full border border-brand/50 px-7 py-3 text-sm font-semibold text-brand transition hover:bg-brand/10">Ver recursos</a>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Tudo que a operacao precisa</h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-brand/40">
              <h3 className="font-semibold text-white">{t}</h3>
              <p className="mt-2 text-sm text-neutral-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Planos que crescem com voce</h2>
        <p className="mt-2 text-center text-sm text-neutral-400">Mensal ou anual. Limites configuraveis por plano.</p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(PLAN_META) as (keyof typeof PLAN_LIMITS)[]).map((key) => {
            const meta = PLAN_META[key];
            const lim = PLAN_LIMITS[key];
            const fmt = (n: number) => (n < 0 ? "Ilimitado" : n.toLocaleString("pt-BR"));
            return (
              <div key={key} className={`rounded-2xl border p-6 ${meta.highlight ? "border-brand bg-brand/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
                <div className="text-sm font-medium text-brand">{meta.label}</div>
                <div className="mt-2 text-2xl font-bold">{meta.price}</div>
                <ul className="mt-4 space-y-1.5 text-sm text-neutral-300">
                  <li>{fmt(lim.products)} produtos</li>
                  <li>{fmt(lim.users)} usuarios</li>
                  <li>{fmt(lim.customers)} clientes</li>
                  <li>{fmt(lim.suppliers)} fornecedores</li>
                </ul>
                <Link href="/signup" className={`mt-6 block rounded-full px-4 py-2 text-center text-sm font-semibold ${meta.highlight ? "bg-brand text-black hover:bg-brand-dark" : "border border-white/15 text-black hover:border-brand/50"}`}>
                  Escolher {meta.label}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <summary className="cursor-pointer list-none font-medium text-white">{q}</summary>
              <p className="mt-2 text-sm text-neutral-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="rounded-3xl border border-brand/30 bg-gradient-to-b from-brand/10 to-transparent p-12">
          <h2 className="text-3xl font-bold tracking-tight">Pronto para organizar sua empresa?</h2>
          <p className="mt-3 text-neutral-300">Crie sua conta em minutos. Sua empresa comeca do zero, do seu jeito.</p>
          <Link href="/signup" className="mt-7 inline-block rounded-full bg-brand px-8 py-3 text-sm font-semibold text-black transition hover:bg-brand-dark">Criar conta gratis</Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-neutral-500 sm:flex-row">
          <Logo />
          <span>© {new Date().getFullYear()} Byte Force. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
