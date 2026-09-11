import { describe, it, expect } from "vitest";
import { can } from "./permissions";

describe("permissoes (RBAC)", () => {
  it("OWNER pode tudo", () => {
    expect(can("OWNER", "customers:delete")).toBe(true);
    expect(can("OWNER", "users:manage")).toBe(true);
  });
  it("SELLER nao apaga clientes nem gerencia usuarios", () => {
    expect(can("SELLER", "customers:write")).toBe(true);
    expect(can("SELLER", "customers:delete")).toBe(false);
    expect(can("SELLER", "users:manage")).toBe(false);
  });
  it("STOCKIST mexe em produtos mas nao em clientes", () => {
    expect(can("STOCKIST", "products:write")).toBe(true);
    expect(can("STOCKIST", "customers:read")).toBe(false);
  });
  it("MEMBER e somente leitura", () => {
    expect(can("MEMBER", "products:read")).toBe(true);
    expect(can("MEMBER", "products:write")).toBe(false);
  });
});
