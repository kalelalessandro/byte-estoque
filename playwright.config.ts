import { defineConfig } from "@playwright/test";
// Execucao real requer app rodando + Postgres. No CI, subir o app antes (webServer).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  // webServer: { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true },
});
