"use client";

import { useI18n } from "@/lib/i18n";
import type { PrecedentRef } from "@/lib/types";

export default function PrecedentList({
  precedents,
  labelFor,
}: {
  precedents: PrecedentRef[];
  labelFor: (key: string) => string;
}) {
  const { t } = useI18n();
  if (precedents.length === 0) {
    return <p style={{ color: "#888", fontSize: 14 }}>{t("precNone")}</p>;
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {precedents.map((p) => (
        <div key={p.id} style={{ border: "1px solid #e2e4ea", borderRadius: 8, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {p.reference ?? `#${p.id.slice(0, 8)}`}
            </span>
            <span
              style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, color: "#fff",
                background: p.convicted ? "#c0341d" : "#0a7d28",
              }}
            >
              {p.convicted ? t("convicted") : t("acquitted")}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#777", margin: "4px 0" }}>
            {t("similarity")} {Math.round(p.similarity * 100)}%
          </div>
          {p.shared_factors.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {p.shared_factors.map((k) => (
                <span key={k} style={{ fontSize: 11, background: "#eef1f8", color: "#3050b0", padding: "2px 6px", borderRadius: 6 }}>
                  {labelFor(k)}
                </span>
              ))}
            </div>
          )}
          {p.text_preview && <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{p.text_preview}</div>}
        </div>
      ))}
    </div>
  );
}
