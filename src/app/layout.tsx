import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import UrgentAlarm from "@/components/UrgentAlarm";

const inter = Inter({ subsets: ["latin"] });

import { Viewport } from "next";

export const metadata: Metadata = {
  title: "Vaga-lume | Centro de Desenvolvimento Infantil",
  description: "Aplicativo do Centro de Desenvolvimento Infantil Vaga-lume",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vaga-lume",
  },
};

export const viewport: Viewport = {
  themeColor: "#01b1b0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <UrgentAlarm />
        {children}
      </body>
    </html>
  );
}

