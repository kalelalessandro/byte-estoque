// Politica de retry (pura). Backoff exponencial com teto.
export function nextBackoffMs(attempts: number): number {
  const base = 60_000; // 1 min
  return Math.min(base * 2 ** Math.max(0, attempts - 1), 6 * 60 * 60_000); // teto 6h
}
// Chave de idempotencia estavel para um e-mail (impede enfileirar duplicado).
export function emailIdempotencyKey(parts: (string | number)[]): string {
  return parts.map((x) => String(x)).join(":");
}
