"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { analyze, counterfactual, listFactors } from "@/lib/api";
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

const EXAMPLE =
  "Un testigo presencial identificó al acusado y se halló un arma en el lugar de " +
  "los hechos. El acusado no confesó y la defensa cuestiona la fiabilidad del testigo.";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

export default function Home() {
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

  const labels = useMemo(
    () => Object.fromEntries(catalog.map((f) => [f.key, f.label_es])),
    [catalog]
  );

  const normalize = useCallback(
    (f: Factors): Factors => {
      const out: Factors = {};
      for (const fac of catalog) out[fac.key] = !!f[fac.key];
      return out;
    },
    [catalog]
  );

  useEffect(() => {
    (async () => {
      try {
        const cat = await listFactors();
        setCatalog(cat);
        const base: Factors = Object.fromEntries(cat.map((f) => [f.key, false]));
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

  const scenarioProb = cf ? cf.counterfactual.probability : baseline?.probability ?? 0;
  const baselineProb = baseline?.probability ?? null;
  const contributions = cf ? cf.counterfactual.contributions : baseline?.contributions ?? [];
  const precedents = cf ? cf.driving_precedents : analyzePrecedents;
  const changedCount = Object.keys(scenarioFactors).filter(
    (k) => !!scenarioFactors[k] !== !!baseFactors[k]
  ).length;

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>¿Y si un hecho hubiera sido distinto?</h1>
      <p style={{ color: "#555", maxWidth: 760 }}>
        Describe un caso penal o ajusta los factores. El modelo estima la
        probabilidad de condena; cambia cualquier factor para ver el efecto
        <strong> contrafactual</strong> y los precedentes que lo explican.
      </p>
      {err && (
        <p style={{ color: "crimson" }}>
          {err} — ¿está el backend en marcha en el puerto 8000?
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: 20 }}>
        {/* ---- Left: input + factors ---- */}
        <div>
          <div style={card}>
            <label style={{ fontSize: 13, color: "#444", fontWeight: 600 }}>Descripción del caso</label>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              rows={5}
              placeholder="p. ej. Se halló el arma con huellas del acusado y un testigo lo identificó…"
              style={{ width: "100%", resize: "vertical", marginTop: 6, padding: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button onClick={runAnalyze} disabled={busy || caseText.trim().length < 10}>
                {busy ? "Analizando…" : "Analizar caso"}
              </button>
              <button type="button" onClick={() => setCaseText(EXAMPLE)} disabled={busy}>
                Ejemplo
              </button>
              {source && (
                <span style={{ fontSize: 12, color: "#888" }}>
                  extracción: {source === "llm" ? "IA (Ollama)" : "palabras clave"}
                </span>
              )}
            </div>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong>Factores del caso</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={resetScenario} disabled={changedCount === 0}>
                  Restablecer
                </button>
                <button type="button" onClick={setAsBaseline} disabled={busy || changedCount === 0} title="Fijar el escenario actual como referencia">
                  Fijar como base
                </button>
              </div>
            </div>
            {catalog.length === 0 ? (
              <p style={{ color: "#888" }}>Cargando factores…</p>
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
            <strong>Explicación contrafactual</strong>
            <p style={{ margin: "8px 0 0", color: "#333", lineHeight: 1.5 }}>
              {cf?.narrative ??
                (changedCount === 0
                  ? "Modifica uno o más factores para ver cómo cambia la probabilidad respecto a la base."
                  : "")}
            </p>
          </div>

          <div style={card}>
            <strong>Influencia de cada factor</strong>
            <div style={{ marginTop: 10 }}>
              <ContributionBars contributions={contributions} />
            </div>
          </div>

          <div style={card}>
            <strong>Precedentes {cf ? "que respaldan el escenario" : "similares"}</strong>
            <div style={{ marginTop: 10 }}>
              <PrecedentList precedents={precedents} labels={labels} />
            </div>
          </div>
        </div>
      </div>

      <EvaluationPanel />

      <p style={{ color: "#999", fontSize: 12, marginTop: 16 }}>
        Sistema analítico con fines académicos. Corpus mayoritariamente sintético;
        las probabilidades son estimaciones de un modelo interpretable, no asesoramiento jurídico.
      </p>
    </section>
  );
}
