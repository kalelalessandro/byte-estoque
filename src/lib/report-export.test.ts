import { describe, it, expect } from "vitest";
import { toXlsx, toPdf } from "./report-export";

const headers = ["Data", "Valor"];
const rows = [["01/01", 10], ["02/01", 20]];

describe("export XLSX/PDF", () => {
  it("XLSX gera um buffer nao-vazio com assinatura ZIP (PK)", () => {
    const buf = toXlsx("Vendas", headers, rows);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 2).toString()).toBe("PK"); // xlsx = zip
  });
  it("PDF gera um buffer nao-vazio com assinatura %PDF", async () => {
    const buf = await toPdf("Vendas", headers, rows);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
