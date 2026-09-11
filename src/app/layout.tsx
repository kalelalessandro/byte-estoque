import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Byte Force",
  description: "Gestao empresarial multi-tenant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
