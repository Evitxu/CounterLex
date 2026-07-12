// Mirrors the backend domain (app/domain/entities.py, factors.py).

export interface Factor {
  key: string;
  label_es: string;
  label_en: string;
  description_es: string;
  direction: number; // +1 tends to convict, -1 tends to acquit
}

export type Factors = Record<string, boolean>;

export interface FactorContribution {
  key: string;
  label: string;
  present: boolean;
  weight: number;
  contribution: number;
}

export interface OutcomePrediction {
  probability: number;
  log_odds: number;
  contributions: FactorContribution[];
}

export interface PrecedentRef {
  id: string;
  reference: string | null;
  convicted: boolean;
  similarity: number;
  shared_factors: string[];
  text_preview: string;
}

export interface CaseAnalysis {
  factors: Factors;
  prediction: OutcomePrediction;
  precedents: PrecedentRef[];
  extraction_source: string; // "llm" | "keyword"
  detected_outcome: boolean | null; // true=conviction, false=acquittal, null=unknown
}

export interface DebateTurn {
  role: string; // "fiscal" | "defensa" | "juez"
  argument: string;
}

export interface DebateResult {
  probability: number;
  turns: DebateTurn[];
  consensus: string;
  precedents: PrecedentRef[];
  llm_available: boolean;
}

export interface JurisprudenceSearch {
  query_factors: Factors;
  extraction_source: string;
  results: PrecedentRef[];
}

export interface CounterfactualResult {
  base: OutcomePrediction;
  counterfactual: OutcomePrediction;
  changed: Factors;
  delta: number;
  narrative: string;
  driving_precedents: PrecedentRef[];
}

export interface EvaluationWeight {
  key: string;
  label: string;
  true_weight: number;
  learned_weight: number;
  abs_error: number;
}

export interface Evaluation {
  intercept: number;
  mean_abs_error: number;
  training_metrics: Record<string, number | string>;
  weights: EvaluationWeight[];
}

// Contact form (mirrors app/presentation/api.py ContactBody / ContactResult).
export interface ContactPayload {
  name: string;
  surname: string;
  email: string;
  observations: string;
}

export interface ContactResult {
  id: string;
  email_sent: boolean; // false when SMTP isn't configured on the server (dev mode)
}

// KPI dashboard (GET /stats).
export interface Stats {
  model: {
    trained: boolean;
    test_accuracy?: number | null;
    test_auc?: number | null;
    test_brier?: number | null;
    train_accuracy?: number | null;
    mae?: number | null;
    n?: number | null;
    backend?: string | null;
  };
  corpus: { total: number; synthetic: number; real: number; factors: number };
  contact: { total: number; emailed: number; saved_only: number };
  usage: {
    analyze_text: number;
    analyze_pdf: number;
    search: number;
    counterfactual: number;
    debate: number;
    report: number;
    contact: number;
    total: number;
  };
}

// A stored submission (admin read: GET /contact/messages).
export interface ContactMessage {
  id: string;
  name: string;
  surname: string;
  reply_email: string;
  observations: string;
  created_at: string; // ISO-8601 UTC
  email_sent: boolean;
}
