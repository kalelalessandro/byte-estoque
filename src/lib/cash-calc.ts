// Logica pura de saldo de caixa (testavel sem DB).
import { round2 } from "@/lib/money";

export type CashMove = { type: "SALE" | "SUPPLY" | "WITHDRAWAL"; amount: number };

/** Saldo esperado = abertura + vendas + suprimentos - sangrias. */
export function expectedBalance(openingBalance: number, movements: CashMove[]): number {
  const delta = movements.reduce((s, m) => s + (m.type === "WITHDRAWAL" ? -m.amount : m.amount), 0);
  return round2(openingBalance + delta);
}
