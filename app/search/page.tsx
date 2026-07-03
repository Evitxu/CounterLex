"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listFactors, searchJurisprudence } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Factor, JurisprudenceSearch } from "@/lib/types";
import PrecedentList from "@/components/PrecedentList";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

export default function SearchPage() {
  const { t, lang } = useI18n();
  const [catalog, setCatalog] = useState<Factor[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<JurisprudenceSearch | null>(null);

  useEffect(() => {
    listFactors().then(setCatalog).catch((e) => setErr((e as Error).message));
  }, []);

  const byKey = useMemo(() => Object.fromEntries(catalog.map((f) => [f.key, f])), [catalog]);
  const labelFor = useCallback(
    (k: string) => {
      const f = byKey[k];
      return f ? (lang === "en" ? f.label_en : f.label_es) : k;
    },
    [byKey, lang]
  );

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 3) return;
    setBusy(true);
    setErr(null);
    try {
      setData(await searchJurisprudence(q));
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const queryOn = data ? Object.keys(data.query_factors).filter((k) => data.query_factors[k]) : [];

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>🔍 {t("searchTitle")}</h1>
      <p style={{ color: "#555", maxWidth: 760 }}>{t("searchIntro")}</p>

      <form onSubmit={run} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          maxLength={500}
          style={{ flex: 1, minWidth: 220, padding: 10 }}
        />
        <button className="btn btn-primary" disabled={busy || q.trim().length < 3}>
          {busy ? t("searchRunning") : t("searchRun")}
        </button>
      </form>
      <p style={{ fontSize: 12, color: "#999", marginTop: 6 }}>{t("searchDomainNote")}</p>
      {err && <p style={{ color: "crimson" }}>{err} — {t("backendError")}</p>}

      {data && (
        <>
          {queryOn.length > 0 && (
            <div style={{ ...card, marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#777", marginBottom: 8 }}>
                {t("searchQueryFactors")}
                {data.extraction_source === "keyword" ? " · palabras clave" : " · IA"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {queryOn.map((k) => (
                  <span key={k} style={{ fontSize: 12, background: "#eef1f8", color: "#3050b0", padding: "3px 8px", borderRadius: 6 }}>
                    {labelFor(k)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: 16 }}>
            {t("searchResults")} ({data.results.length})
          </h2>
          {data.results.length === 0 ? (
            <p style={{ color: "#888" }}>{t("searchNone")}</p>
          ) : (
            <PrecedentList precedents={data.results} labelFor={labelFor} />
          )}
        </>
      )}
    </section>
  );
}
