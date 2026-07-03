import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { BusyProvider } from "@/lib/busy";
import SiteHeader from "@/components/SiteHeader";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CounterLex — Counterfactual Precedent Explorer",
  description: "Interpretable prediction of judicial outcomes and counterfactual analysis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f7f9", color: "#14161c" }}>
        <LanguageProvider>
          <BusyProvider>
            <SiteHeader />
            <div className="cl-shell">
              <Sidebar />
              <main className="cl-content">{children}</main>
            </div>
          </BusyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
