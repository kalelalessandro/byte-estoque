export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}

/** Soma linhas + ajustes (frete/desconto), nunca abaixo de zero. */
export function docTotal(lines: number[], opts: { add?: number; sub?: number } = {}): number {
  const base = lines.reduce((s, v) => s + v, 0);
  return round2(Math.max(0, base + (opts.add ?? 0) - (opts.sub ?? 0)));
}
