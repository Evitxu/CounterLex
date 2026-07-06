"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyze, analyzePdf, listFactors } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";
import { presentFactorEffects, reconstructModel } from "@/lib/model";
import type { CaseAnalysis, Factor } from "@/lib/types";
import ProbabilityGauge from "@/components/ProbabilityGauge";
import PrecedentList from "@/components/PrecedentList";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

export default function AnalyzePage() {
  const { t, lang } = useI18n();
  const { run: track, setProgress } = useBusy();
  const router = useRouter();
  const [catalog, setCatalog] = useState<Factor[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_PDF = 20 * 1024 * 1024;

  useEffect(() => {
    track(listFactors()).then(setCatalog).catch((e) => setErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the analysed case so the Reports module can pick it up directly.
  useEffect(() => {
    if (!analysis) return;
    try {
      localStorage.setItem(
        "counterlex_last_case",
        JSON.stringify({ factors: analysis.factors, scenario: analysis.factors })
      );
    } catch {
      /* ignore */
    }
  }, [analysis]);

  const byKey = useMemo(() => Object.fromEntries(catalog.map((f) => [f.key, f])), [catalog]);
  const labelFor = useCallback(
    (k: string) => {
      const f = byKey[k];
      return f ? (lang === "en" ? f.label_en : f.label_es) : k;
    },
    [byKey, lang]
  );

  async function run() {
    if (text.trim().length < 10) return;
    setBusy(true);
    setErr(null);
    try {
      setAnalysis(await track(analyze(text)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onPdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ""; // allow re-selecting same file
    if (!file) return;
    if (file.size > MAX_PDF) {
      setErr(t("pdfTooLarge"));
      return;
    }
    setBusy(true);
    setErr(null);
    setPdfName(file.name);
    try {
      setAnalysis(
        await track(
          analyzePdf(file, (pct) => setProgress(pct >= 100 ? null : pct))
        )
      );
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const model = useMemo(() => (analysis ? reconstructModel(analysis.prediction) : null), [analysis]);
  const influences = useMemo(
    () => (model && analysis ? presentFactorEffects(model, analysis.factors) : []),
    [model, analysis]
  );
  const detected = analysis ? Object.keys(analysis.factors).filter((k) => analysis.factors[k]) : [];
  const verdict = analysis ? analysis.detected_outcome : null;
  const modelConvicts = analysis ? analysis.prediction.probability >= 0.5 : false;
  const agree = verdict !== null && modelConvicts === verdict;
  const opinionColor = verdict === null ? "#c7ccd6" : agree ? "#0a7d28" : "#f0a500";

  function openInSimulator() {
    if (!analysis) return;
    sessionStorage.setItem("counterlex_prefill", JSON.stringify(analysis.factors));
    router.push("/");
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>📄 {t("analyzeTitle")}</h1>
      <p style={{ color: "#555", maxWidth: 760 }}>{t("analyzeIntro")}</p>
      {err && <p style={{ color: "crimson" }}>{err} — {t("backendError")}</p>}

      <div style={card}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          maxLength={5000}
          placeholder={t("analyzePlaceholder")}
          style={{ width: "100%", resize: "vertical", padding: 8 }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={run} disabled={busy || text.trim().length < 10}>
            {busy ? t("analyzeRunning") : t("analyzeRun")}
          </button>
          <span style={{ color: "#999", fontSize: 13 }}>{t("orSeparator")}</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={onPdfSelected}
            style={{ display: "none" }}
          />
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title={t("pdfHint")}
          >
            📎 {t("uploadPdf")}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setText(t("exampleText"))} disabled={busy}>
            {t("example")}
          </button>
          {pdfName && <span style={{ fontSize: 12, color: "#666" }}>{pdfName}</span>}
          {analysis && (
            <span style={{ fontSize: 12, color: "#888" }}>
              {t("extraction")} {analysis.extraction_source === "llm" ? t("srcAI") : t("srcKeyword")}
            </span>
          )}
        </div>
      </div>

      {analysis && (
        <>
          <div style={{ ...card, borderLeft: `4px solid ${opinionColor}` }}>
            <strong>{t("opinionTitle")}</strong>
            {verdict === null ? (
              <p style={{ color: "#888", margin: "8px 0 0", fontSize: 14 }}>{t("opinionUnknown")}</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 28, flexWrap: "wrap", margin: "10px 0" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#777" }}>{t("opinionActual")}</div>
                    <strong>{verdict ? t("convicted") : t("acquitted")}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#777" }}>{t("opinionModel")}</div>
                    <strong>
                      {modelConvicts ? t("convicted") : t("acquitted")} (
                      {Math.round(analysis.prediction.probability * 100)}%)
                    </strong>
                  </div>
                </div>
                <p style={{ fontWeight: 700, color: agree ? "#0a7d28" : "#b8860b", margin: "4px 0" }}>
                  {agree ? t("opinionAgree") : t("opinionDisagree")}
                </p>
              </>
            )}
            <p style={{ fontSize: 12, color: "#999", margin: "6px 0 0" }}>{t("opinionNote")}</p>
          </div>

          <div className="cl-grid">
            <div>
              <div style={card}>
                <ProbabilityGauge scenario={analysis.prediction.probability} baseline={null} />
            </div>
            <div style={card}>
              <strong>{t("analyzeInfluential")}</strong>
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {influences.length === 0 && <p style={{ color: "#888", fontSize: 14 }}>{t("analyzeNone")}</p>}
                {influences.map((inf, i) => {
                  const pp = Math.round(inf.delta * 100);
                  return (
                    <div key={inf.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                      <span style={{ width: 20, color: "#999" }}>{i + 1}.</span>
                      <span style={{ flex: 1 }}>{labelFor(inf.key)}</span>
                      <span style={{ fontWeight: 700, color: pp >= 0 ? "#c0341d" : "#0a7d28" }}>
                        {pp > 0 ? "+" : ""}
                        {pp}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button className="btn btn-primary" onClick={openInSimulator} style={{ width: "100%" }}>
              ⚖ {t("analyzeOpenSim")}
            </button>
          </div>

          <div>
            <div style={card}>
              <strong>{t("analyzeDetected")}</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {detected.length === 0 && <span style={{ color: "#888", fontSize: 14 }}>{t("analyzeNone")}</span>}
                {detected.map((k) => (
                  <span key={k} style={{ fontSize: 12, background: "#eef1f8", color: "#3050b0", padding: "3px 8px", borderRadius: 6 }}>
                    {labelFor(k)}
                  </span>
                ))}
              </div>
            </div>
            <div style={card}>
              <strong>{t("precTitleSim")}</strong>
              <div style={{ marginTop: 10 }}>
                <PrecedentList precedents={analysis.precedents} labelFor={labelFor} />
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </section>
  );
}
