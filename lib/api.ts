import type {
  CaseAnalysis,
  CounterfactualResult,
  Evaluation,
  Factor,
  Factors,
  JurisprudenceSearch,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const jsonHeaders = { "Content-Type": "application/json" };

export function listFactors(): Promise<Factor[]> {
  return fetch(`${API_BASE}/factors`).then(json<Factor[]>);
}

export function analyze(text: string): Promise<CaseAnalysis> {
  return fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ text }),
  }).then(json<CaseAnalysis>);
}

export function analyzePdf(file: File): Promise<CaseAnalysis> {
  const form = new FormData();
  form.append("file", file);
  // No Content-Type header: the browser sets the multipart boundary.
  return fetch(`${API_BASE}/analyze/pdf`, { method: "POST", body: form }).then(json<CaseAnalysis>);
}

export function searchJurisprudence(text: string, topK = 10): Promise<JurisprudenceSearch> {
  return fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ text, top_k: topK }),
  }).then(json<JurisprudenceSearch>);
}

export function counterfactual(
  factors: Factors,
  overrides: Factors
): Promise<CounterfactualResult> {
  return fetch(`${API_BASE}/counterfactual`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ factors, overrides }),
  }).then(json<CounterfactualResult>);
}

export function getEvaluation(): Promise<Evaluation> {
  return fetch(`${API_BASE}/model/evaluation`).then(json<Evaluation>);
}
