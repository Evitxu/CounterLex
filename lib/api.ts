import type {
  CaseAnalysis,
  CounterfactualResult,
  Evaluation,
  Factor,
  Factors,
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
