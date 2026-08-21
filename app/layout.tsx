import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Historico Online",
  description: "Aplicacao para preencher, conferir, imprimir e gerar historicos escolares.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
