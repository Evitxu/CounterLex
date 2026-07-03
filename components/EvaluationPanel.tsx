"use client";

import { useEffect, useState } from "react";
import { getEvaluation } from "@/lib/api";
import type { Evaluation } from "@/lib/types";

// Shows how well the learned model recovered the KNOWN synthetic ground-truth
// weights — the quantitative honesty that makes the counterfactuals defensible.
export default function EvaluationPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Evaluation | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    getEvaluation().then(setData).catch((e) => setErr((e as Error).message));
  }, [open, data]);

  return (
    <div style={{ marginTop: 24, border: "1px solid #e2e4ea", borderRadius: 10, background: "#fff" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", padding: 14, border: "none", background: "none", cursor: "pointer", fontSize: 15, fontWeight: 600 }}
      >
        {open ? "▾" : "▸"} Validación del modelo — recuperación de los efectos reales
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {err && <p style={{ color: "crimson" }}>{err}</p>}
          {!data && !err && <p style={{ color: "#888" }}>Cargando…</p>}
          {data && (
            <>
              <p style={{ fontSize: 13, color: "#555" }}>
                Error absoluto medio entre pesos aprendidos y reales:{" "}
                <strong>{data.mean_abs_error}</strong> (log-odds). Precisión de
                entrenamiento: <strong>{String(data.training_metrics.train_accuracy)}</strong>,
                Brier: <strong>{String(data.training_metrics.brier_score)}</strong>.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#666" }}>
                    <th style={{ padding: "4px 6px" }}>Factor</th>
                    <th style={{ padding: "4px 6px" }}>Real</th>
                    <th style={{ padding: "4px 6px" }}>Aprendido</th>
                    <th style={{ padding: "4px 6px" }}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weights.map((w) => (
                    <tr key={w.key} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: "4px 6px" }}>{w.label}</td>
                      <td style={{ padding: "4px 6px" }}>{w.true_weight}</td>
                      <td style={{ padding: "4px 6px" }}>{w.learned_weight}</td>
                      <td style={{ padding: "4px 6px", color: w.abs_error > 0.5 ? "#c0341d" : "#0a7d28" }}>
                        {w.abs_error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
