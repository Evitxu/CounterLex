"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { downloadReport, listFactors } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Factor, Factors } from "@/lib/types";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

interface LastCase {
  factors: Factors;
  scenario: Factors;
}

export default function ReportsPage() {
  const { t, lang } = useI18n();
  const [catalog, setCatalog] = useState<Factor[]>([]);
  const [last, setLast] = useState<LastCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listFactors().then(setCatalog).catch((e) => setErr((e as Error).message));
    try {
      const raw = localStorage.getItem("counterlex_last_case");
      if (raw) setLast(JSON.parse(raw) as LastCase);
    } catch {
      /* ignore */
    }
  }, []);

  const byKey = useMemo(() => Object.fromEntries(catalog.map((f) => [f.key, f])), [catalog]);
  const labelFor = useCallback(
    (k: string) => {
      const f = byKey[k];
      return f ? (lang === "en" ? f.label_en : f.label_es) : k;
    },
    [byKey, lang]
  );

  const present = last ? Object.keys(last.factors).filter((k) => last.factors[k]) : [];
  const changed = last
    ? Object.keys(last.scenario).filter((k) => !!last.scenario[k] !== !!last.factors[k])
    : [];

  async function generate() {
    if (!last) return;
    const overrides: Factors = {};
    for (const k of changed) overrides[k] = !!last.scenario[k];
    setBusy(true);
    setErr(null);
    try {
      await downloadReport(last.factors, overrides, lang);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>📑 {t("nav.reports")}</h1>
      <p style={{ color: "#555", maxWidth: 760 }}>{t("reportsIntro")}</p>
      {err && <p style={{ color: "crimson" }}>{err} — {t("backendError")}</p>}

      {!last ? (
        <div style={card}>
          <p style={{ color: "#666", margin: 0 }}>
            {t("reportsNoCase")}{" "}
            <Link href="/">⚖ {t("nav.counterfactual")}</Link>
          </p>
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 12, color: "#777" }}>{t("reportsLatest")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
            {present.length === 0 ? (
              <span style={{ color: "#888", fontSize: 14 }}>{t("none")}</span>
            ) : (
              present.map((k) => (
                <span key={k} style={{ fontSize: 12, background: "#eef1f8", color: "#3050b0", padding: "3px 8px", borderRadius: 6 }}>
                  {labelFor(k)}
                </span>
              ))
            )}
          </div>

          {changed.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "#777" }}>{t("reportsChanges")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
                {changed.map((k) => (
                  <span key={k} style={{ fontSize: 12, background: "#fff8e6", color: "#b8860b", border: "1px solid #f0d48a", padding: "3px 8px", borderRadius: 6 }}>
                    {(last.scenario[k] ? "+ " : "− ") + labelFor(k)}
                  </span>
                ))}
              </div>
            </>
          )}

          <button className="btn btn-primary" onClick={generate} disabled={busy} style={{ marginTop: 8 }}>
            📑 {busy ? t("generating") : t("reportGenerate")}
          </button>
        </div>
      )}
    </section>
  );
}
