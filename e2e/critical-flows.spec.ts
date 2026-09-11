import { test, expect } from "@playwright/test";

// Fluxos criticos ponta a ponta. NAO executados no sandbox (sem app+DB): rodar
// localmente/CI com o app no ar e um Postgres de teste.
const rnd = () => Math.random().toString(36).slice(2, 8);

test("cadastro -> dashboard -> criar produto -> criar cliente", async ({ page }) => {
  const email = `e2e_${rnd()}@example.com`;
  await page.goto("/signup");
  await page.fill('input[name="name"]', "E2E Owner");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "senha12345");
  await page.fill('input[name="companyName"]', `E2E ${rnd()}`);
  await page.getByRole("button", { name: /criar conta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/produtos");
  await page.getByRole("button", { name: /adicionar produto/i }).click();
  await page.fill('input[name="name"]', "Produto E2E");
  await page.fill('input[name="sku"]', `SKU-${rnd()}`);
  await page.getByRole("button", { name: /salvar produto/i }).click();
  await expect(page.getByText("Produto E2E")).toBeVisible();

  await page.goto("/clientes");
  await page.getByRole("button", { name: /adicionar cliente/i }).click();
  await page.fill('input[name="name"]', "Cliente E2E");
  await page.getByRole("button", { name: /salvar cliente/i }).click();
  await expect(page.getByText("Cliente E2E")).toBeVisible();
});

test("login exige credenciais validas", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "naoexiste@example.com");
  await page.fill('input[type="password"]', "errada");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page.getByText(/invalidos/i)).toBeVisible();
});
