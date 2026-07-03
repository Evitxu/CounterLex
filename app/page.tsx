"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyze, counterfactual, downloadReport, listFactors } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type {
  CounterfactualResult,
  Factor,
  Factors,
  OutcomePrediction,
  PrecedentRef,
} from "@/lib/types";
import ProbabilityGauge from "@/components/ProbabilityGauge";
import FactorToggles from "@/components/FactorToggles";
import ContributionBars from "@/components/ContributionBars";
import PrecedentList from "@/components/PrecedentList";
import EvaluationPanel from "@/components/EvaluationPanel";
import SensitivityWaterfall from "@/components/SensitivityWaterfall";
import { reconstructModel } from "@/lib/model";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

export default function Home() {
  const { t, lang } = useI18n();
  const [catalog, setCatalog] = useState<Factor[]>([]);
  const [caseText, setCaseText] = useState("");
  const [baseFactors, setBaseFactors] = useState<Factors>({});
  const [scenarioFactors, setScenarioFactors] = useState<Factors>({});
  const [baseline, setBaseline] = useState<OutcomePrediction | null>(null);
  const [cf, setCf] = useState<CounterfactualResult | null>(null);
  const [analyzePrecedents, setAnalyzePrecedents] = useState<PrecedentRef[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const byKey = useMemo(
    () => Object.fromEntries(catalog.map((f) => [f.key, f])),
    [catalog]
  );
  const labelFor = useCallback(
    (key: string) => {
      const f = byKey[key];
      if (!f) return key;
      return lang === "en" ? f.label_en : f.label_es;
    },
    [byKey, lang]
  );

  const normalize = useCallback(
    (f: Factors): Factors => {
      const out: Factors = {};
      for (const fac of catalog) out[fac.key] = !!f[fac.key];
      return out;
    },
    [catalog]
  );

  const inited = useRef(false);
  useEffect(() => {
    // Guard against React Strict Mode's double effect-invocation in dev, which
    // would otherwise consume (and clear) the handoff prefill on the first run
    // and reset to empty on the second.
    if (inited.current) return;
    inited.current = true;

    // Read the handoff synchronously, before any await, so it can't be lost.
    let prefill: Factors | null = null;
    try {
      const raw = sessionStorage.getItem("counterlex_prefill");
      if (raw) {
        prefill = JSON.parse(raw) as Factors;
        sessionStorage.removeItem("counterlex_prefill");
      }
    } catch {
      /* ignore */
    }

    (async () => {
      try {
        const cat = await listFactors();
        setCatalog(cat);
        const base: Factors = Object.fromEntries(
          cat.map((f) => [f.key, prefill ? !!prefill[f.key] : false])
        );
        setBaseFactors(base);
        setScenarioFactors(base);
        const res = await counterfactual(base, {});
        setBaseline(res.base);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  const recompute = useCallback(async (scenario: Factors, base: Factors) => {
    const diff: Factors = {};
    for (const k of Object.keys(scenario)) {
      if (!!scenario[k] !== !!base[k]) diff[k] = !!scenario[k];
    }
    if (Object.keys(diff).length === 0) {
      setCf(null);
      return;
    }
    try {
      const res = await counterfactual(base, diff);
      setCf(res);
      setBaseline(res.base);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  async function runAnalyze() {
    if (caseText.trim().length < 10) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await analyze(caseText);
      const factors = normalize(res.factors);
      setBaseFactors(factors);
      setScenarioFactors(factors);
      setBaseline(res.prediction);
      setAnalyzePrecedents(res.precedents);
      setSource(res.extraction_source);
      setCf(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggle(key: string) {
    const next = { ...scenarioFactors, [key]: !scenarioFactors[key] };
    setScenarioFactors(next);
    void recompute(next, baseFactors);
  }

  function resetScenario() {
    setScenarioFactors(baseFactors);
    setCf(null);
  }

  // Persist the current case so the Reports module can pick it up.
  useEffect(() => {
    if (catalog.length === 0) return;
    try {
      localStorage.setItem(
        "counterlex_last_case",
        JSON.stringify({ factors: baseFactors, scenario: scenarioFactors })
      );
    } catch {
      /* ignore */
    }
  }, [baseFactors, scenarioFactors, catalog.length]);

  const [reporting, setReporting] = useState(false);
  async function downloadPdf() {
    const overrides: Factors = {};
    for (const k of Object.keys(scenarioFactors)) {
      if (!!scenarioFactors[k] !== !!baseFactors[k]) overrides[k] = !!scenarioFactors[k];
    }
    setReporting(true);
    try {
      await downloadReport(baseFactors, overrides, lang);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setReporting(false);
    }
  }

  async function setAsBaseline() {
    setBusy(true);
    try {
      const res = await counterfactual(scenarioFactors, {});
      setBaseFactors({ ...scenarioFactors });
      setBaseline(res.base);
      setCf(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const linModel = useMemo(() => (baseline ? reconstructModel(baseline) : null), [baseline]);

  const scenarioProb = cf ? cf.counterfactual.probability : baseline?.probability ?? 0;
  const baselineProb = baseline?.probability ?? null;
  const contributions = cf ? cf.counterfactual.contributions : baseline?.contributions ?? [];
  const precedents = cf ? cf.driving_precedents : analyzePrecedents;
  const changedCount = Object.keys(scenarioFactors).filter(
    (k) => !!scenarioFactors[k] !== !!baseFactors[k]
  ).length;

  // Localized narrative built from the structured counterfactual result.
  const narrative = useMemo(() => {
    if (!cf) return "";
    const changed = Object.keys(cf.changed);
    if (changed.length === 0) return "";
    const labels = changed.map(labelFor).join(", ");
    const dir = cf.delta < 0 ? t("dirDown") : cf.delta > 0 ? t("dirUp") : t("dirSame");
    const d = Math.round(cf.delta * 100);
    const n = cf.driving_precedents.length;
    const conv = cf.driving_precedents.filter((p) => p.convicted).length;
    return t("cfNarrative", {
      labels,
      dir,
      a: Math.round(cf.base.probability * 100),
      b: Math.round(cf.counterfactual.probability * 100),
      d: d > 0 ? `+${d}` : `${d}`,
      n,
      r: n ? Math.round((100 * conv) / n) : 0,
    });
  }, [cf, labelFor, t]);

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>{t("h1")}</h1>
      <p style={{ color: "#555", maxWidth: 760 }}>{t("intro")}</p>
      {err && <p style={{ color: "crimson" }}>{err} — {t("backendError")}</p>}

      <div className="cl-grid">
        {/* ---- Left: input + factors ---- */}
        <div>
          <div style={card}>
            <label style={{ fontSize: 13, color: "#444", fontWeight: 600 }}>{t("caseLabel")}</label>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder={t("casePlaceholder")}
              style={{ width: "100%", resize: "vertical", marginTop: 6, padding: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={runAnalyze} disabled={busy || caseText.trim().length < 10}>
                {busy ? t("analyzing") : t("analyze")}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setCaseText(t("exampleText"))} disabled={busy}>
                {t("example")}
              </button>
              {source && (
                <span style={{ fontSize: 12, color: "#888" }}>
                  {t("extraction")} {source === "llm" ? t("srcAI") : t("srcKeyword")}
                </span>
              )}
            </div>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <strong>{t("factorsTitle")}</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" type="button" onClick={resetScenario} disabled={changedCount === 0}>
                  {t("reset")}
                </button>
                <button className="btn btn-secondary" type="button" onClick={setAsBaseline} disabled={busy || changedCount === 0} title={t("setBaselineTitle")}>
                  {t("setBaseline")}
                </button>
                <button className="btn btn-secondary" type="button" onClick={downloadPdf} disabled={reporting}>
                  📑 {reporting ? t("generating") : t("downloadReport")}
                </button>
              </div>
            </div>
            {catalog.length === 0 ? (
              <p style={{ color: "#888" }}>{t("loadingFactors")}</p>
            ) : (
              <FactorToggles catalog={catalog} values={scenarioFactors} baseline={baseFactors} onToggle={toggle} />
            )}
          </div>
        </div>

        {/* ---- Right: results ---- */}
        <div>
          <div style={card}>
            <ProbabilityGauge scenario={scenarioProb} baseline={baselineProb} />
          </div>

          <div style={card}>
            <strong>{t("cfTitle")}</strong>
            <p style={{ margin: "8px 0 0", color: "#333", lineHeight: 1.5 }}>
              {narrative || (changedCount === 0 ? t("cfPrompt") : "")}
            </p>
          </div>

          {linModel && changedCount > 0 && (
            <div style={card}>
              <SensitivityWaterfall
                model={linModel}
                base={baseFactors}
                scenario={scenarioFactors}
                labelFor={labelFor}
              />
            </div>
          )}

          <div style={card}>
            <strong>{t("contribTitle")}</strong>
            <div style={{ marginTop: 10 }}>
              <ContributionBars contributions={contributions} labelFor={labelFor} />
            </div>
          </div>

          <div style={card}>
            <strong>{cf ? t("precTitleCf") : t("precTitleSim")}</strong>
            <div style={{ marginTop: 10 }}>
              <PrecedentList precedents={precedents} labelFor={labelFor} />
            </div>
          </div>
        </div>
      </div>

      <EvaluationPanel labelFor={labelFor} />

      <p style={{ color: "#999", fontSize: 12, marginTop: 16 }}>{t("disclaimer")}</p>
    </section>
  );
}
