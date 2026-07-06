// Client-side reconstruction of the interpretable logistic model from any
// prediction the backend returns. Because the model is linear in the factors,
// a single prediction's per-factor `weight` + `log_odds` fully determine it:
//   intercept = log_odds - Σ contribution
// That lets us compute probabilities for arbitrary factor sets instantly (for
// the sensitivity waterfall and the "most influential factors" ranking) without
// extra round-trips.

import type { Factors, OutcomePrediction } from "./types";

export interface LinModel {
  weights: Record<string, number>;
  intercept: number;
}

export function reconstructModel(pred: OutcomePrediction): LinModel {
  const weights: Record<string, number> = {};
  let sumContrib = 0;
  for (const c of pred.contributions) {
    weights[c.key] = c.weight;
    sumContrib += c.contribution;
  }
  return { weights, intercept: pred.log_odds - sumContrib };
}

export function probability(m: LinModel, f: Factors): number {
  let logit = m.intercept;
  for (const k of Object.keys(m.weights)) if (f[k]) logit += m.weights[k];
  return 1 / (1 + Math.exp(-logit));
}

export interface Influence {
  key: string;
  delta: number; // effect of this factor's PRESENCE on P(conviction), in [-1,1]
}

/** For each present factor, how much its presence moves the probability. */
export function presentFactorEffects(m: LinModel, f: Factors): Influence[] {
  const p = probability(m, f);
  const out: Influence[] = [];
  for (const k of Object.keys(m.weights)) {
    if (!f[k]) continue;
    const without = probability(m, { ...f, [k]: false });
    out.push({ key: k, delta: p - without });
  }
  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return out;
}

export interface WaterfallStep {
  key: string | null; // null = base row
  prob: number;
  delta: number;
}

export interface CaseDiff {
  key: string;
  delta: number; // this factor's contribution to the (A − B) log-odds gap
}

/** Decompose why case A and case B differ: per differing factor, weight×(a−b). */
export function compareCases(m: LinModel, a: Factors, b: Factors): CaseDiff[] {
  const out: CaseDiff[] = [];
  for (const k of Object.keys(m.weights)) {
    const av = a[k] ? 1 : 0;
    const bv = b[k] ? 1 : 0;
    if (av !== bv) out.push({ key: k, delta: m.weights[k] * (av - bv) });
  }
  out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return out;
}

/** Base probability, then apply each changed factor one at a time. */
export function waterfall(
  m: LinModel,
  base: Factors,
  scenario: Factors,
  changedOrder: string[]
): WaterfallStep[] {
  const steps: WaterfallStep[] = [];
  let cur: Factors = { ...base };
  let p = probability(m, cur);
  steps.push({ key: null, prob: p, delta: 0 });
  for (const k of changedOrder) {
    cur = { ...cur, [k]: scenario[k] };
    const np = probability(m, cur);
    steps.push({ key: k, prob: np, delta: np - p });
    p = np;
  }
  return steps;
}
