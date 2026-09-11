import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("csv", () => {
  it("monta cabecalho e linhas", () => {
    expect(toCsv(["a", "b"], [[1, 2], [3, 4]])).toBe("a,b\r\n1,2\r\n3,4");
  });
  it("escapa virgula, aspas e quebra de linha", () => {
    expect(toCsv(["x"], [['a,b'], ['c"d'], ["e\nf"]])).toBe('x\r\n"a,b"\r\n"c""d"\r\n"e\nf"');
  });
  it("trata null/undefined como vazio", () => {
    expect(toCsv(["x", "y"], [[null, undefined]])).toBe("x,y\r\n,");
  });
});
