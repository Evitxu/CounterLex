"use client";

import type { FactorContribution } from "@/lib/types";

// Diverging bars: factors pushing toward conviction (right, red) vs acquittal
// (left, green). Width ∝ |log-odds contribution|. Only present factors shown.

export default function ContributionBars({
  contributions,
}: {
  contributions: FactorContribution[];
}) {
  const active = contributions.filter((c) => c.present && c.contribution !== 0);
  if (active.length === 0) {
    return <p style={{ color: "#888", fontSize: 14 }}>Ningún factor activo.</p>;
  }
  const maxAbs = Math.max(...active.map((c) => Math.abs(c.contribution)), 0.1);

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {active.map((c) => {
        const w = (Math.abs(c.contribution) / maxAbs) * 50; // % of half-width
        const positive = c.contribution > 0;
        return (
          <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 150, textAlign: "right", color: "#444" }}>{c.label}</span>
            <div style={{ position: "relative", flex: 1, height: 16, background: "#f2f3f7", borderRadius: 4 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#c7ccd6" }} />
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                  ...(positive
                    ? { left: "50%", width: `${w}%`, background: "#c0341d" }
                    : { right: "50%", width: `${w}%`, background: "#0a7d28" }),
                }}
              />
            </div>
            <span style={{ width: 52, color: positive ? "#c0341d" : "#0a7d28" }}>
              {c.contribution > 0 ? "+" : ""}
              {c.contribution.toFixed(2)}
            </span>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
        Valores en log-odds. Rojo → empuja a condena; verde → empuja a absolución.
      </div>
    </div>
  );
}
