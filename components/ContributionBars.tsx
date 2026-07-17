"use client";

import { useI18n } from "@/lib/i18n";
import type { FactorContribution } from "@/lib/types";

export default function ContributionBars({
  contributions,
  labelFor,
}: {
  contributions: FactorContribution[];
  labelFor: (key: string) => string;
}) {
  const { t } = useI18n();
  const active = contributions.filter((c) => c.present && c.contribution !== 0);
  if (active.length === 0) {
    return <p style={{ color: "var(--text-faint)", fontSize: 14 }}>{t("contribNone")}</p>;
  }
  const maxAbs = Math.max(...active.map((c) => Math.abs(c.contribution)), 0.1);

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {active.map((c) => {
        const w = (Math.abs(c.contribution) / maxAbs) * 50;
        const positive = c.contribution > 0;
        return (
          <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span className="cl-contrib-label" style={{ width: 150, textAlign: "right", color: "var(--text)" }}>
              {labelFor(c.key)}
            </span>
            <div style={{ position: "relative", flex: 1, height: 16, background: "var(--surface-2)", borderRadius: 4, minWidth: 60 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border-input)" }} />
              <div
                style={{
                  position: "absolute", top: 2, bottom: 2, borderRadius: 3, transition: "width 0.4s ease",
                  ...(positive
                    ? { left: "50%", width: `${w}%`, background: "var(--role-fiscal)" }
                    : { right: "50%", width: `${w}%`, background: "var(--role-defensa)" }),
                }}
              />
            </div>
            <span className="cl-contrib-value" style={{ width: 52, color: positive ? "var(--role-fiscal)" : "var(--role-defensa)" }}>
              {c.contribution > 0 ? "+" : ""}
              {c.contribution.toFixed(2)}
            </span>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{t("contribCaption")}</div>
    </div>
  );
}
