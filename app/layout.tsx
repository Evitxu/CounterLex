import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "CounterLex — Counterfactual Precedent Explorer",
  description: "Interpretable prediction of judicial outcomes and counterfactual analysis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f7f9", color: "#14161c" }}>
        <LanguageProvider>
          <SiteHeader />
          <main style={{ maxWidth: 1160, margin: "24px auto", padding: "0 20px" }}>{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
