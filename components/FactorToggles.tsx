"use client";

import { useI18n } from "@/lib/i18n";
import type { Factor, Factors } from "@/lib/types";

export default function FactorToggles({
  catalog,
  values,
  baseline,
  onToggle,
}: {
  catalog: Factor[];
  values: Factors;
  baseline: Factors;
  onToggle: (key: string) => void;
}) {
  const { t } = useI18n();
  const incrim = catalog.filter((f) => f.direction >= 0);
  const excul = catalog.filter((f) => f.direction < 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Group title={t("groupIncriminating")} factors={incrim} values={values} baseline={baseline} onToggle={onToggle} />
      <Group title={t("groupExculpatory")} factors={excul} values={values} baseline={baseline} onToggle={onToggle} />
    </div>
  );
}

function Group({
  title, factors, values, baseline, onToggle,
}: {
  title: string; factors: Factor[]; values: Factors; baseline: Factors; onToggle: (key: string) => void;
}) {
  const { lang, t } = useI18n();
  return (
    <div>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-faint)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {factors.map((f) => {
          const on = !!values[f.key];
          const changed = !!values[f.key] !== !!baseline[f.key];
          const label = lang === "en" ? f.label_en : f.label_es;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onToggle(f.key)}
              title={f.description_es}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${changed ? "var(--gold)" : "var(--border)"}`,
                background: changed ? "var(--warn-bg)" : "var(--surface)",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <Switch on={on} />
              <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
              {changed && <span style={{ fontSize: 11, color: "var(--gold)" }}>{t("modified")}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 34, height: 20, borderRadius: 10, background: on ? "var(--accent)" : "var(--border-input)",
        position: "relative", transition: "background 0.15s", flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16,
          borderRadius: "50%", background: "var(--surface)", transition: "left 0.15s",
        }}
      />
    </span>
  );
}
