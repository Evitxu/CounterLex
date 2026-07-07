import type {
  CaseAnalysis,
  CounterfactualResult,
  DebateResult,
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

// Uses XMLHttpRequest (not fetch) so we can report upload progress via
// upload.onprogress. onProgress receives 0–100 as the file is sent.
export function analyzePdf(
  file: File,
  onProgress?: (pct: number) => void
): Promise<CaseAnalysis> {
  return new Promise<CaseAnalysis>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/analyze/pdf`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CaseAnalysis);
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        reject(new Error(`API ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

export function searchJurisprudence(text: string, topK = 10): Promise<JurisprudenceSearch> {
  return fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ text, top_k: topK }),
  }).then(json<JurisprudenceSearch>);
}

export function debate(factors: Factors, lang: string): Promise<DebateResult> {
  return fetch(`${API_BASE}/debate`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ factors, lang }),
  }).then(json<DebateResult>);
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

export async function downloadReport(
  factors: Factors,
  overrides: Factors,
  lang: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/report`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ factors, overrides, lang }),
  });
  if (!res.ok) {
    const b = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${b || res.statusText}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "counterlex-report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
