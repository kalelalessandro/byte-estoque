import { describe, it, expect } from "vitest";
import { validateProductCsv } from "./product-import";

const H = "sku,name,salePrice,currentStock,status";

describe("importacao de produtos (validacao pura)", () => {
  it("rejeita cabecalho sem colunas obrigatorias", () => {
    expect(validateProductCsv("foo,bar\n1,2").headerError).toBeTruthy();
  });
  it("valida linhas boas e reporta erros por linha", () => {
    const r = validateProductCsv(`${H}\nSKU1,Produto A,10.50,5,ativo\n,Sem SKU,1,1,ativo`);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].sku).toBe("SKU1");
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(3);
  });
  it("detecta duplicados no arquivo", () => {
    const r = validateProductCsv(`${H}\nDUP,A,1,0,ativo\nDUP,B,1,0,ativo`);
    expect(r.valid).toHaveLength(1);
    expect(r.fileDuplicates).toHaveLength(1);
    expect(r.fileDuplicates[0].line).toBe(3);
  });
  it("aceita numeros no formato pt-BR (1.234,56)", () => {
    const r = validateProductCsv(`${H}\nX,Prod,"1.234,56",0,ativo`);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].data.salePrice).toBeCloseTo(1234.56);
  });
  it("aceita aliases de cabecalho em portugues", () => {
    const r = validateProductCsv(`codigo,nome,preco de venda\nA1,Caneta,3`);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].data.name).toBe("Caneta");
  });
});
