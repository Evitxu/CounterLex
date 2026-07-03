"use client";

import { useState } from "react";
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
    <>
      <div className="cl-cards">
        {precedents.map((p) => (
          <Card key={p.id} p={p} labelFor={labelFor} t={t} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>{t("precCaption")}</p>
    </>
  );
}

function Card({
  p,
  labelFor,
  t,
}: {
  p: PrecedentRef;
  labelFor: (key: string) => string;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cl-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{p.reference ?? `#${p.id.slice(0, 8)}`}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#3050b0" }}>{Math.round(p.similarity * 100)}%</span>
      </div>

      <div style={{ fontSize: 12, color: "#777" }}>{t("cardOutcome")}</div>
      <span
        style={{
          alignSelf: "flex-start",
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 10,
          color: "#fff",
          background: p.convicted ? "#c0341d" : "#0a7d28",
        }}
      >
        {p.convicted ? t("convicted") : t("acquitted")}
      </span>

      {p.shared_factors.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "#777" }}>{t("cardWhy")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {p.shared_factors.map((k) => (
              <span key={k} style={{ fontSize: 11, background: "#eef1f8", color: "#3050b0", padding: "2px 6px", borderRadius: 6 }}>
                {labelFor(k)}
              </span>
            ))}
          </div>
        </>
      )}

      {p.text_preview && (
        <>
          <button type="button" className="cl-card-open" onClick={() => setOpen((o) => !o)}>
            {t("cardOpen")}
          </button>
          {open && <div style={{ fontSize: 12, color: "#555" }}>{p.text_preview}</div>}
        </>
      )}
    </div>
  );
}
