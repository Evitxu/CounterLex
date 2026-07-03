"use client";

// Conviction-probability bar. Colored green (low) → red (high), with the
// baseline marked and the delta vs baseline shown. Animates on change.

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
  const pct = Math.round(scenario * 100);
  const deltaPp =
    baseline === null ? null : Math.round((scenario - baseline) * 100);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 52, fontWeight: 700, color: color(scenario), lineHeight: 1 }}>
          {pct}%
        </span>
        <span style={{ color: "#555", fontSize: 14 }}>probabilidad de condena</span>
      </div>

      <div
        style={{
          position: "relative",
          height: 22,
          background: "#eceef3",
          borderRadius: 11,
          marginTop: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color(scenario),
            borderRadius: 11,
            transition: "width 0.5s ease, background 0.5s ease",
          }}
        />
        {baseline !== null && (
          <div
            title={`Base: ${Math.round(baseline * 100)}%`}
            style={{
              position: "absolute",
              top: -3,
              left: `calc(${Math.round(baseline * 100)}% - 1px)`,
              width: 2,
              height: 28,
              background: "#1a1a2e",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
        <span style={{ color: "#666" }}>
          {baseline !== null ? `Base: ${Math.round(baseline * 100)}%` : " "}
        </span>
        {deltaPp !== null && deltaPp !== 0 && (
          <span
            style={{
              fontWeight: 700,
              color: deltaPp < 0 ? "#0a7d28" : "#c0341d",
            }}
          >
            {deltaPp > 0 ? "▲" : "▼"} {deltaPp > 0 ? "+" : ""}
            {deltaPp} puntos vs. base
          </span>
        )}
      </div>
    </div>
  );
}
