"use client";

import { useEffect, useState } from "react";
import { getEvaluation } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Evaluation } from "@/lib/types";

export default function EvaluationPanel({
  labelFor,
}: {
  labelFor: (key: string) => string;
}) {
  const { t } = useI18n();
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
        {open ? "▾" : "▸"} {t("evalToggle")}
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {err && <p style={{ color: "crimson" }}>{err}</p>}
          {!data && !err && <p style={{ color: "#888" }}>{t("evalLoading")}</p>}
          {data && (
            <>
              <p style={{ fontSize: 13, color: "#555" }}>
                {t("evalIntro", {
                  mae: data.mean_abs_error,
                  acc: String(data.training_metrics.train_accuracy),
                  brier: String(data.training_metrics.brier_score),
                })}
              </p>
              {data.training_metrics.test_accuracy !== undefined && (
                <p style={{ fontSize: 13, color: "#14161c", fontWeight: 600 }}>
                  {t("evalHoldout", {
                    n: String(data.training_metrics.n_test ?? ""),
                    acc: String(data.training_metrics.test_accuracy),
                    auc: String(data.training_metrics.test_auc ?? "—"),
                    brier: String(data.training_metrics.test_brier),
                  })}
                </p>
              )}
              <div className="cl-scroll-x">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 360 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#666" }}>
                      <th style={{ padding: "4px 6px" }}>{t("colFactor")}</th>
                      <th style={{ padding: "4px 6px" }}>{t("colReal")}</th>
                      <th style={{ padding: "4px 6px" }}>{t("colLearned")}</th>
                      <th style={{ padding: "4px 6px" }}>{t("colError")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weights.map((w) => (
                      <tr key={w.key} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: "4px 6px" }}>{labelFor(w.key)}</td>
                        <td style={{ padding: "4px 6px" }}>{w.true_weight}</td>
                        <td style={{ padding: "4px 6px" }}>{w.learned_weight}</td>
                        <td style={{ padding: "4px 6px", color: w.abs_error > 0.5 ? "#c0341d" : "#0a7d28" }}>
                          {w.abs_error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
