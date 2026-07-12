"use client";

import { useCallback, useEffect, useState } from "react";
import { getStats } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";
import type { Stats } from "@/lib/types";

// Stat-tile dashboard (no charts → no series palette needed). Uses the app's
// existing tokens: card #fff / border #e2e4ea / ink #2b3444 / muted #777.
const tile: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 12,
  padding: "16px 18px",
};
const bigNum: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: "#1f2733",
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
};
const tileLabel: React.CSSProperties = { fontSize: 12, color: "#777", marginTop: 6 };
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 12,
  marginBottom: 8,
};

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={tile}>
      <div style={bigNum}>{value}</div>
      <div style={tileLabel}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 15, color: "#3050b0", margin: "0 0 10px" }}>{title}</h2>
      {children}
    </div>
  );
}

const DASH = "—";
const pct = (v?: number | null) => (v == null ? DASH : `${(v * 100).toFixed(1)}%`);
const dec = (v?: number | null) => (v == null ? DASH : v.toFixed(3));
const int = (v?: number | null) => (v == null ? DASH : v.toLocaleString());

export default function DashboardPage() {
  const { t } = useI18n();
  const { run: track } = useBusy();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      setStats(await track(getStats()));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [track]);

  useEffect(() => {
    load();
  }, [load]);

  const m = stats?.model;
  const c = stats?.corpus;
  const ct = stats?.contact;
  const u = stats?.usage;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ marginTop: 0 }}>📊 {t("dashTitle")}</h1>
        <button className="btn btn-secondary" onClick={load} disabled={busy}>
          {busy ? t("dashLoading") : t("dashRefresh")}
        </button>
      </div>
      <p style={{ color: "#555", maxWidth: 760 }}>{t("dashIntro")}</p>

      {err && <p style={{ color: "crimson" }}>{err} — {t("backendError")}</p>}

      {stats && (
        <>
          <Section title={t("dashSecModel")}>
            {m?.trained ? (
              <>
                <div style={grid}>
                  <Tile value={pct(m.test_accuracy)} label={t("dashAccuracy")} />
                  <Tile value={dec(m.test_auc)} label={t("dashAuc")} />
                  <Tile value={dec(m.test_brier)} label={t("dashBrier")} />
                  <Tile value={dec(m.mae)} label={t("dashMae")} />
                </div>
                <p style={{ fontSize: 12, color: "#999" }}>
                  {t("dashModelNote", { backend: m.backend ?? DASH, n: m.n ?? DASH })}
                </p>
              </>
            ) : (
              <p style={{ color: "#888" }}>{t("dashModelUntrained")}</p>
            )}
          </Section>

          <Section title={t("dashSecCorpus")}>
            <div style={grid}>
              <Tile value={int(c?.total)} label={t("dashTotalCases")} />
              <Tile value={int(c?.synthetic)} label={t("dashSynthetic")} />
              <Tile value={int(c?.real)} label={t("dashReal")} />
              <Tile value={int(c?.factors)} label={t("dashFactors")} />
            </div>
          </Section>

          <Section title={t("dashSecContact")}>
            <div style={grid}>
              <Tile value={int(ct?.total)} label={t("dashMessages")} />
              <Tile value={int(ct?.emailed)} label={t("dashEmailed")} />
              <Tile value={int(ct?.saved_only)} label={t("dashSavedOnly")} />
            </div>
          </Section>

          <Section title={t("dashSecUsage")}>
            <div style={grid}>
              <Tile value={int(u?.analyze_text)} label={t("dashAnalyzeText")} />
              <Tile value={int(u?.analyze_pdf)} label={t("dashAnalyzePdf")} />
              <Tile value={int(u?.search)} label={t("dashSearches")} />
              <Tile value={int(u?.counterfactual)} label={t("dashCounterfactuals")} />
              <Tile value={int(u?.debate)} label={t("dashDebates")} />
              <Tile value={int(u?.report)} label={t("dashReports")} />
              <Tile value={int(u?.contact)} label={t("dashContacts")} />
              <Tile value={int(u?.total)} label={t("dashUsageTotal")} />
            </div>
            <p style={{ fontSize: 12, color: "#999" }}>{t("dashUsageNote")}</p>
          </Section>
        </>
      )}
    </section>
  );
}
