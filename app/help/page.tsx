"use client";

import { useEffect, useMemo, useState } from "react";
import { listFactors } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";
import type { Factor } from "@/lib/types";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "16px 18px",
  marginBottom: 16,
  maxWidth: 820,
};

interface Module {
  icon: string;
  name: string;
  desc: string;
}
interface Content {
  title: string;
  intro: string;
  disclaimer: string;
  modulesTitle: string;
  modules: Module[];
  factorsTitle: string;
  factorsIntro: string;
  incriminating: string;
  exculpatory: string;
  methodTitle: string;
  method: string[];
  limitsTitle: string;
  limits: string[];
}

const CONTENT: Record<"es" | "en", Content> = {
  es: {
    title: "Ayuda y guía de uso",
    intro:
      "CounterLex estima la probabilidad de condena de un caso penal a partir de sus factores jurídicos, explica el peso de cada factor y permite preguntas contrafactuales («¿y si un hecho hubiera sido distinto?»).",
    disclaimer:
      "Herramienta analítica con fines académicos. Las probabilidades son estimaciones de un modelo interpretable, no asesoramiento jurídico.",
    modulesTitle: "Módulos",
    modules: [
      { icon: "⚖", name: "Simulador contrafactual", desc: "Activa o desactiva factores y observa cómo cambian la probabilidad, las contribuciones de cada factor y el análisis de sensibilidad. Fija un escenario como base y compáralo." },
      { icon: "📄", name: "Analizar sentencia", desc: "Pega texto o sube un PDF (con OCR para escaneados). Extrae los factores, estima el resultado y detecta el fallo real para contrastarlo con la estimación del modelo." },
      { icon: "🔎", name: "Buscar jurisprudencia", desc: "Describe un caso y recupera los precedentes más similares por solapamiento de factores, explicando por qué coincide cada uno." },
      { icon: "🆚", name: "Comparar casos", desc: "Configura dos casos y descompone, factor a factor, qué explica la diferencia de probabilidad entre ambos." },
      { icon: "🗣️", name: "Debate multiagente", desc: "Fiscal, defensa y juez argumentan el caso con un LLM; el consenso se ancla en la estimación y los precedentes recuperados." },
      { icon: "📊", name: "Informe PDF", desc: "Descarga un informe del escenario analizado: factores, probabilidad, contrafactual y precedentes." },
      { icon: "🕵️", name: "Detective", desc: "Juego educativo: examina las pruebas, acusa a un sospechoso y compara tu elección con el veredicto del modelo." },
      { icon: "✉️", name: "Contacta conmigo", desc: "Envía un mensaje al autor. La entrada se valida y se sanea (defensa XSS)." },
      { icon: "📈", name: "Panel de métricas", desc: "KPIs del rendimiento del modelo, del corpus, del formulario de contacto y del uso de la API." },
    ],
    factorsTitle: "Factores jurídicos",
    factorsIntro:
      "Un caso se representa como un conjunto de factores. Cada factor tiene un efecto aprendido (log-odds) sobre la probabilidad de condena.",
    incriminating: "Incriminatorios (tienden a la condena)",
    exculpatory: "Exculpatorios (tienden a la absolución)",
    methodTitle: "Cómo funciona (metodología)",
    method: [
      "Modelo interpretable: una regresión logística sobre los factores; el coeficiente de cada factor ES su efecto (log-odds), así que el modelo es transparente por construcción.",
      "Contrafactual: fijar un factor y recomputar el predictor lineal — do(factor = x) — una intervención limpia bajo los supuestos del modelo.",
      "El corpus sintético se genera con pesos verdaderos conocidos, lo que permite medir la recuperación de efectos (MAE sobre los log-odds), además de precisión, AUC y calibración (Brier) en un conjunto de test.",
    ],
    limitsTitle: "Limitaciones y aviso",
    limits: [
      "El corpus es mayoritariamente sintético: la validez externa es limitada.",
      "Supuestos del modelo: los factores son las variables relevantes y no hay confusión no modelada.",
      "Es una estimación estadística basada en patrones de precedentes; no valora si un fallo es jurídicamente correcto ni sustituye el criterio de un profesional.",
    ],
  },
  en: {
    title: "Help & user guide",
    intro:
      "CounterLex estimates the probability of conviction of a criminal case from its legal factors, explains each factor's weight, and supports counterfactual questions (\"what if a fact had been different?\").",
    disclaimer:
      "Analytical tool for academic purposes. Probabilities are estimates from an interpretable model, not legal advice.",
    modulesTitle: "Modules",
    modules: [
      { icon: "⚖", name: "Counterfactual simulator", desc: "Toggle factors and watch the probability, per-factor contributions and sensitivity analysis change. Pin a scenario as the baseline and compare." },
      { icon: "📄", name: "Analyze judgment", desc: "Paste text or upload a PDF (with OCR for scans). It extracts the factors, estimates the outcome and detects the real verdict to contrast it with the model's estimate." },
      { icon: "🔎", name: "Search jurisprudence", desc: "Describe a case and retrieve the most similar precedents by factor overlap, with a reason for each match." },
      { icon: "🆚", name: "Compare cases", desc: "Configure two cases and break down, factor by factor, what accounts for the difference in probability." },
      { icon: "🗣️", name: "Multi-agent debate", desc: "Prosecutor, defence and judge argue the case with an LLM; the consensus is grounded in the estimate and retrieved precedents." },
      { icon: "📊", name: "PDF report", desc: "Download a report of the analysed scenario: factors, probability, counterfactual and precedents." },
      { icon: "🕵️", name: "Detective", desc: "Educational game: weigh the evidence, accuse a suspect and compare your choice with the model's verdict." },
      { icon: "✉️", name: "Contact me", desc: "Send the author a message. Input is validated and sanitized (XSS defence)." },
      { icon: "📈", name: "Metrics dashboard", desc: "KPIs for model performance, the corpus, the contact form and API usage." },
    ],
    factorsTitle: "Legal factors",
    factorsIntro:
      "A case is represented as a set of factors. Each factor has a learned effect (log-odds) on the probability of conviction.",
    incriminating: "Incriminating (push toward conviction)",
    exculpatory: "Exculpatory (push toward acquittal)",
    methodTitle: "How it works (methodology)",
    method: [
      "Interpretable model: a logistic regression over the factors; each factor's coefficient IS its effect (log-odds), so the model is transparent by construction.",
      "Counterfactual: fix a factor and recompute the linear predictor — do(factor = x) — a clean intervention under the model's assumptions.",
      "The synthetic corpus is generated from known true weights, which lets us measure effect recovery (MAE over the log-odds), plus accuracy, AUC and calibration (Brier) on a hold-out test set.",
    ],
    limitsTitle: "Limitations & disclaimer",
    limits: [
      "The corpus is mostly synthetic: external validity is limited.",
      "Model assumptions: the factors are the relevant variables and there is no unmodelled confounding.",
      "It is a statistical estimate based on precedent patterns; it does not judge whether a verdict is legally correct, nor replace a professional's judgement.",
    ],
  },
};

const sectionH: React.CSSProperties = { fontSize: 16, color: "var(--accent)", margin: "0 0 10px" };

export default function HelpPage() {
  const { t, lang } = useI18n();
  const { run: track } = useBusy();
  const [factors, setFactors] = useState<Factor[]>([]);
  const c = CONTENT[lang];

  useEffect(() => {
    track(listFactors()).then(setFactors).catch(() => setFactors([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [incrim, excul] = useMemo(() => {
    const inc = factors.filter((f) => f.direction >= 0);
    const exc = factors.filter((f) => f.direction < 0);
    return [inc, exc];
  }, [factors]);

  function factorList(list: Factor[]) {
    return (
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {list.map((f) => (
          <li key={f.key} style={{ marginBottom: 6, fontSize: 14 }}>
            <strong>{lang === "en" ? f.label_en : f.label_es}</strong>
            {f.description_es ? <> — <span style={{ color: "var(--text-muted)" }}>{f.description_es}</span></> : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>❓ {c.title}</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 820 }}>{c.intro}</p>
      <p
        style={{
          maxWidth: 820,
          fontSize: 13,
          color: "var(--warn-text)",
          background: "var(--warn-bg)",
          border: "1px solid var(--warn-border)",
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        ⚠️ {c.disclaimer}
      </p>

      <div style={card}>
        <h2 style={sectionH}>{c.modulesTitle}</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {c.modules.map((m) => (
            <div key={m.name} style={{ display: "flex", gap: 10 }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{m.icon}</span>
              <div style={{ fontSize: 14 }}>
                <strong>{m.name}</strong> — <span style={{ color: "var(--text-muted)" }}>{m.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h2 style={sectionH}>{c.factorsTitle}</h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0 }}>{c.factorsIntro}</p>
        {factors.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>…</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--role-fiscal)" }}>{c.incriminating}</div>
              {factorList(incrim)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--good)" }}>{c.exculpatory}</div>
              {factorList(excul)}
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <h2 style={sectionH}>{c.methodTitle}</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {c.method.map((m, i) => (
            <li key={i} style={{ marginBottom: 6, fontSize: 14, color: "var(--text)" }}>{m}</li>
          ))}
        </ul>
      </div>

      <div style={card}>
        <h2 style={sectionH}>{c.limitsTitle}</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {c.limits.map((m, i) => (
            <li key={i} style={{ marginBottom: 6, fontSize: 14, color: "var(--text)" }}>{m}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}