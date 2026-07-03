"use client";

import { useI18n } from "@/lib/i18n";
import { waterfall, type LinModel } from "@/lib/model";
import type { Factors } from "@/lib/types";

function color(p: number): string {
  return `hsl(${Math.round(140 * (1 - p))} 72% 45%)`;
}

export default function SensitivityWaterfall({
  model,
  base,
  scenario,
  labelFor,
}: {
  model: LinModel;
  base: Factors;
  scenario: Factors;
  labelFor: (key: string) => string;
}) {
  const { t } = useI18n();

  // Changed factors, most influential first (by |weight|).
  const changed = Object.keys(scenario)
    .filter((k) => !!scenario[k] !== !!base[k])
    .sort((a, b) => Math.abs(model.weights[b] ?? 0) - Math.abs(model.weights[a] ?? 0));

  if (changed.length === 0) return null;

  const steps = waterfall(model, base, scenario, changed);

  return (
    <div>
      <strong>{t("wfTitle")}</strong>
      <div style={{ marginTop: 10 }}>
        {steps.map((s, i) => {
          const pct = Math.round(s.prob * 100);
          const dpp = Math.round(s.delta * 100);
          const label = s.key === null ? t("wfBase") : labelFor(s.key);
          const removed = s.key !== null && !scenario[s.key];
          return (
            <div key={i} className="cl-wf-row">
              <span style={{ width: 150, fontSize: 13, color: s.key === null ? "#14161c" : "#444", fontWeight: s.key === null ? 700 : 400 }}>
                {s.key !== null && (removed ? "− " : "+ ")}
                {label}
              </span>
              <div className="cl-wf-bar-track">
                <div className="cl-wf-bar-fill" style={{ width: `${pct}%`, background: color(s.prob) }} />
              </div>
              <span style={{ width: 44, textAlign: "right", fontWeight: 700, color: color(s.prob) }}>{pct}%</span>
              <span style={{ width: 52, textAlign: "right", fontSize: 12, color: dpp < 0 ? "#0a7d28" : dpp > 0 ? "#c0341d" : "#999" }}>
                {s.key === null ? "" : `${dpp > 0 ? "+" : ""}${dpp} pp`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
