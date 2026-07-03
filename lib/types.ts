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
