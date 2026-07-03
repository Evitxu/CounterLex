import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "CounterLex — Explorador Contrafactual de Precedentes",
  description: "Predicción interpretable de resultados judiciales y análisis contrafactual.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f7f9", color: "#14161c" }}>
        <header style={{ padding: "16px 28px", background: "#14161c", color: "#fff" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>CounterLex</div>
          <div style={{ fontSize: 13, color: "#aeb4c2" }}>
            Explorador contrafactual de precedentes — ¿y si un hecho hubiera sido distinto?
          </div>
        </header>
        <main style={{ maxWidth: 1160, margin: "24px auto", padding: "0 20px" }}>{children}</main>
      </body>
    </html>
  );
}
