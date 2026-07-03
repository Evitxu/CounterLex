"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "en";
const STORAGE_KEY = "counterlex_lang";

type Vars = Record<string, string | number>;

const messages: Record<Lang, Record<string, string>> = {
  es: {
    "subtitle": "Explorador contrafactual de precedentes — ¿y si un hecho hubiera sido distinto?",
    "h1": "Análisis Jurídico Contrafactual",
    "intro": "Describe un caso penal o ajusta los factores. El modelo estima la probabilidad de condena; cambia cualquier factor para ver el efecto contrafactual y los precedentes que lo explican.",
    "backendError": "¿está el backend en marcha en el puerto 8000?",
    "caseLabel": "Descripción del caso",
    "casePlaceholder": "p. ej. Se halló el arma con huellas del acusado y un testigo lo identificó…",
    "analyze": "Analizar caso",
    "analyzing": "Analizando…",
    "example": "Ejemplo",
    "exampleText": "Un testigo presencial identificó al acusado y se halló un arma en el lugar de los hechos. El acusado no confesó y la defensa cuestiona la fiabilidad del testigo.",
    "extraction": "extracción:",
    "srcAI": "IA (Ollama)",
    "srcKeyword": "palabras clave",
    "factorsTitle": "Factores del caso",
    "reset": "Restablecer",
    "setBaseline": "Fijar como base",
    "setBaselineTitle": "Fijar el escenario actual como referencia",
    "loadingFactors": "Cargando factores…",
    "groupIncriminating": "Factores incriminatorios",
    "groupExculpatory": "Factores exculpatorios",
    "modified": "modificado",
    "gaugeLabel": "probabilidad de condena",
    "gaugeBase": "Base",
    "gaugeDelta": "puntos vs. base",
    "cfTitle": "Explicación contrafactual",
    "cfPrompt": "Modifica uno o más factores para ver cómo cambia la probabilidad respecto a la base.",
    "contribTitle": "Influencia de cada factor",
    "contribNone": "Ningún factor activo.",
    "contribCaption": "Valores en log-odds. Rojo → empuja a condena; verde → empuja a absolución.",
    "precTitleCf": "Precedentes que respaldan el escenario",
    "precTitleSim": "Precedentes similares",
    "precNone": "Sin precedentes.",
    "convicted": "CONDENA",
    "acquitted": "ABSOLUCIÓN",
    "similarity": "similitud",
    "evalToggle": "Validación del modelo — recuperación de los efectos reales",
    "evalLoading": "Cargando…",
    "evalIntro": "Error absoluto medio entre pesos aprendidos y reales: {mae} (log-odds). Precisión de entrenamiento: {acc}, Brier: {brier}.",
    "evalHoldout": "En datos no vistos ({n} casos): precisión {acc}, AUC {auc}, Brier {brier}.",
    "colFactor": "Factor",
    "colReal": "Real",
    "colLearned": "Aprendido",
    "colError": "Error",
    "disclaimer": "Sistema analítico con fines académicos. Corpus mayoritariamente sintético; las probabilidades son estimaciones de un modelo interpretable, no asesoramiento jurídico.",
    "cfNarrative": "Al modificar «{labels}», la probabilidad de condena {dir} del {a}% al {b}% ({d} puntos). De {n} precedentes similares, el {r}% terminaron en condena.",
    "dirDown": "baja",
    "dirUp": "sube",
    "dirSame": "no varía",
    "nav.counterfactual": "Análisis Contrafactual",
    "nav.analyze": "Analizar Sentencia",
    "nav.search": "Buscar Jurisprudencia",
    "nav.reports": "Informes",
    "nav.soon": "pronto",
    "wfTitle": "Análisis de sensibilidad",
    "wfBase": "Base",
    "cardOutcome": "Resultado",
    "cardWhy": "Por qué se recupera",
    "cardOpen": "Abrir",
    "analyzeTitle": "Analizar Sentencia",
    "analyzeIntro": "Pega el texto de una sentencia. El sistema extrae los factores jurídicos, estima la probabilidad de condena e identifica los factores más influyentes; luego puedes abrirla en el simulador contrafactual.",
    "analyzePlaceholder": "Pega aquí el texto de la sentencia…",
    "analyzeRun": "Analizar sentencia",
    "analyzeRunning": "Analizando…",
    "analyzeInfluential": "Factores más influyentes",
    "analyzeDetected": "Factores detectados",
    "analyzeOpenSim": "Abrir en el simulador contrafactual",
    "analyzeProb": "Probabilidad de condena estimada",
    "analyzeNone": "No se detectaron factores en el texto.",
    "uploadPdf": "Subir PDF",
    "pdfHint": "PDF de texto, máx. 20 MB",
    "pdfTooLarge": "El PDF supera los 20 MB.",
    "orSeparator": "o",
    "searchTitle": "Buscar Jurisprudencia",
    "searchIntro": "Describe un caso con sus elementos jurídicos. El sistema extrae los factores y recupera los precedentes más parecidos, explicando por qué coincide cada uno.",
    "searchPlaceholder": "p. ej. arma hallada, testigo presencial y confesión",
    "searchRun": "Buscar",
    "searchRunning": "Buscando…",
    "searchQueryFactors": "Factores detectados en la búsqueda",
    "searchResults": "Resultados",
    "searchNone": "No se encontraron precedentes relevantes. Prueba a describir factores penales (arma, confesión, testigo, prueba forense…).",
    "searchDomainNote": "La búsqueda es por factores de casos penales; consultas fuera de ese dominio no coincidirán.",
    "downloadReport": "Descargar informe PDF",
    "reportsIntro": "Genera un informe PDF del último caso analizado: factores, probabilidad, análisis contrafactual, precedentes y limitaciones.",
    "reportsNoCase": "Aún no hay ningún caso. Ve a «Análisis Contrafactual», ajusta los factores y volverás aquí para descargar el informe.",
    "reportsLatest": "Último caso",
    "reportsChanges": "Cambios (contrafactual)",
    "reportGenerate": "Generar informe PDF",
    "generating": "Generando…",
    "none": "Ninguno",
    "lang.es": "Español (España)",
    "lang.en": "English (UK)",
  },
  en: {
    "subtitle": "Counterfactual precedent explorer — what if a fact had been different?",
    "h1": "Counterfactual Legal Analysis",
    "intro": "Describe a criminal case or adjust the factors. The model estimates the probability of conviction; change any factor to see the counterfactual effect and the precedents that explain it.",
    "backendError": "is the backend running on port 8000?",
    "caseLabel": "Case description",
    "casePlaceholder": "e.g. The weapon was found with the defendant's fingerprints and a witness identified him…",
    "analyze": "Analyse case",
    "analyzing": "Analysing…",
    "example": "Example",
    "exampleText": "An eyewitness identified the defendant and a weapon was found at the scene. The defendant did not confess and the defence questions the witness's reliability.",
    "extraction": "extraction:",
    "srcAI": "AI (Ollama)",
    "srcKeyword": "keywords",
    "factorsTitle": "Case factors",
    "reset": "Reset",
    "setBaseline": "Set as baseline",
    "setBaselineTitle": "Fix the current scenario as the reference",
    "loadingFactors": "Loading factors…",
    "groupIncriminating": "Incriminating factors",
    "groupExculpatory": "Exculpatory factors",
    "modified": "modified",
    "gaugeLabel": "probability of conviction",
    "gaugeBase": "Base",
    "gaugeDelta": "points vs. base",
    "cfTitle": "Counterfactual explanation",
    "cfPrompt": "Change one or more factors to see how the probability shifts relative to the baseline.",
    "contribTitle": "Influence of each factor",
    "contribNone": "No active factors.",
    "contribCaption": "Values in log-odds. Red → pushes toward conviction; green → toward acquittal.",
    "precTitleCf": "Precedents supporting the scenario",
    "precTitleSim": "Similar precedents",
    "precNone": "No precedents.",
    "convicted": "CONVICTED",
    "acquitted": "ACQUITTED",
    "similarity": "similarity",
    "evalToggle": "Model validation — recovery of the true effects",
    "evalLoading": "Loading…",
    "evalIntro": "Mean absolute error between learned and true weights: {mae} (log-odds). Training accuracy: {acc}, Brier: {brier}.",
    "evalHoldout": "On unseen data ({n} cases): accuracy {acc}, AUC {auc}, Brier {brier}.",
    "colFactor": "Factor",
    "colReal": "True",
    "colLearned": "Learned",
    "colError": "Error",
    "disclaimer": "Analytical system for academic purposes. Corpus mostly synthetic; probabilities are estimates from an interpretable model, not legal advice.",
    "cfNarrative": "Changing «{labels}», the probability of conviction {dir} from {a}% to {b}% ({d} points). Of {n} similar precedents, {r}% ended in conviction.",
    "dirDown": "drops",
    "dirUp": "rises",
    "dirSame": "is unchanged",
    "nav.counterfactual": "Counterfactual Analysis",
    "nav.analyze": "Analyze Judgment",
    "nav.search": "Search Jurisprudence",
    "nav.reports": "Reports",
    "nav.soon": "soon",
    "wfTitle": "Sensitivity analysis",
    "wfBase": "Base",
    "cardOutcome": "Outcome",
    "cardWhy": "Why retrieved",
    "cardOpen": "Open",
    "analyzeTitle": "Analyze Judgment",
    "analyzeIntro": "Paste the text of a judgment. The system extracts the legal factors, estimates the probability of conviction and identifies the most influential factors; then you can open it in the counterfactual simulator.",
    "analyzePlaceholder": "Paste the judgment text here…",
    "analyzeRun": "Analyze judgment",
    "analyzeRunning": "Analysing…",
    "analyzeInfluential": "Most influential factors",
    "analyzeDetected": "Detected factors",
    "analyzeOpenSim": "Open in counterfactual simulator",
    "analyzeProb": "Estimated probability of conviction",
    "analyzeNone": "No factors detected in the text.",
    "uploadPdf": "Upload PDF",
    "pdfHint": "Text PDF, max 20 MB",
    "pdfTooLarge": "The PDF exceeds 20 MB.",
    "orSeparator": "or",
    "searchTitle": "Search Jurisprudence",
    "searchIntro": "Describe a case and its legal elements. The system extracts the factors and retrieves the most similar precedents, explaining why each one matches.",
    "searchPlaceholder": "e.g. weapon found, eyewitness and confession",
    "searchRun": "Search",
    "searchRunning": "Searching…",
    "searchQueryFactors": "Factors detected in the query",
    "searchResults": "Results",
    "searchNone": "No relevant precedents found. Try describing criminal-case factors (weapon, confession, eyewitness, forensic evidence…).",
    "searchDomainNote": "Search is by criminal-case factors; queries outside that domain won't match.",
    "downloadReport": "Download PDF report",
    "reportsIntro": "Generate a PDF report of the latest analysed case: factors, probability, counterfactual analysis, precedents and limitations.",
    "reportsNoCase": "No case yet. Go to \"Counterfactual Analysis\", adjust the factors, and come back here to download the report.",
    "reportsLatest": "Latest case",
    "reportsChanges": "Changes (counterfactual)",
    "reportGenerate": "Generate PDF report",
    "generating": "Generating…",
    "none": "None",
    "lang.es": "Español (España)",
    "lang.en": "English (UK)",
  },
};

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      let s = messages[lang][key] ?? messages.es[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <LanguageProvider>");
  return ctx;
}
