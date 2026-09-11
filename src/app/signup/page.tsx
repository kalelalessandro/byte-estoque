"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signupAction } from "./actions";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signupAction(formData);
      if (res && !res.ok) setError(res.error);
      // sucesso => o server redireciona para /dashboard
    });
  }

  const input =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6 text-center">
          <Logo />
          <p className="mt-1 text-sm text-neutral-500">Crie sua conta e sua empresa</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input name="name" placeholder="Seu nome" className={input} required />
          <input name="email" type="email" placeholder="E-mail" className={input} required />
          <input name="password" type="password" placeholder="Senha (min. 8)" className={input} required />
          <hr className="border-neutral-200 dark:border-neutral-800" />
          <input name="companyName" placeholder="Nome da empresa" className={input} required />
          <div className="grid grid-cols-2 gap-3">
            <input name="cnpj" placeholder="CNPJ (opcional)" className={input} />
            <input name="phone" placeholder="Telefone (opcional)" className={input} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Ja tem conta?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
