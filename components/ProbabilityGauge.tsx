"use client";

import { useI18n } from "@/lib/i18n";

function color(p: number): string {
  const hue = Math.round(140 * (1 - p)); // 140=green ... 0=red
  return `hsl(${hue} 72% 45%)`;
}

export default function ProbabilityGauge({
  scenario,
  baseline,
}: {
  scenario: number;
  baseline: number | null;
}) {
  const { t } = useI18n();
  const pct = Math.round(scenario * 100);
  const deltaPp = baseline === null ? null : Math.round((scenario - baseline) * 100);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: "clamp(36px, 9vw, 52px)", fontWeight: 700, color: color(scenario), lineHeight: 1 }}>
          {pct}%
        </span>
        <span style={{ color: "#555", fontSize: 14 }}>{t("gaugeLabel")}</span>
      </div>

      <div style={{ position: "relative", height: 22, background: "#eceef3", borderRadius: 11, marginTop: 12, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`, height: "100%", background: color(scenario),
            borderRadius: 11, transition: "width 0.5s ease, background 0.5s ease",
          }}
        />
        {baseline !== null && (
          <div
            title={`${t("gaugeBase")}: ${Math.round(baseline * 100)}%`}
            style={{
              position: "absolute", top: -3,
              left: `calc(${Math.round(baseline * 100)}% - 1px)`,
              width: 2, height: 28, background: "#1a1a2e",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "#666" }}>
          {baseline !== null ? `${t("gaugeBase")}: ${Math.round(baseline * 100)}%` : " "}
        </span>
        {deltaPp !== null && deltaPp !== 0 && (
          <span style={{ fontWeight: 700, color: deltaPp < 0 ? "#0a7d28" : "#c0341d" }}>
            {deltaPp > 0 ? "▲" : "▼"} {deltaPp > 0 ? "+" : ""}
            {deltaPp} {t("gaugeDelta")}
          </span>
        )}
      </div>
    </div>
  );
}
