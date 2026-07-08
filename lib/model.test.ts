import { describe, it, expect } from "vitest";
import {
  reconstructModel,
  probability,
  presentFactorEffects,
  compareCases,
  waterfall,
} from "./model";
import type { Factors, OutcomePrediction } from "./types";

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// Build a prediction exactly the way the backend does, from a known linear model,
// so we can assert the client-side reconstruction inverts it.
function predictionFrom(
  weights: Record<string, number>,
  intercept: number,
  factors: Factors
): OutcomePrediction {
  const logOdds =
    intercept + Object.keys(weights).reduce((s, k) => s + (factors[k] ? weights[k] : 0), 0);
  const contributions = Object.keys(weights).map((k) => ({
    key: k,
    label: k,
    present: !!factors[k],
    weight: weights[k],
    contribution: weights[k] * (factors[k] ? 1 : 0),
  }));
  return { probability: sigmoid(logOdds), log_odds: logOdds, contributions };
}

const WEIGHTS = { forensic: 1.5, confession: 2.2, alibi: -1.7, weapon: 1.1 };
const INTERCEPT = -0.4;

describe("reconstructModel", () => {
  it("recovers the intercept and weights from a single prediction", () => {
    const f: Factors = { forensic: true, confession: false, alibi: true, weapon: false };
    const m = reconstructModel(predictionFrom(WEIGHTS, INTERCEPT, f));
    expect(m.intercept).toBeCloseTo(INTERCEPT, 10);
    for (const k of Object.keys(WEIGHTS)) {
      expect(m.weights[k]).toBeCloseTo(WEIGHTS[k as keyof typeof WEIGHTS], 10);
    }
  });
});

describe("probability", () => {
  it("reproduces the probability of the prediction it was reconstructed from", () => {
    const f: Factors = { forensic: true, confession: true, alibi: false, weapon: false };
    const pred = predictionFrom(WEIGHTS, INTERCEPT, f);
    const m = reconstructModel(pred);
    expect(probability(m, f)).toBeCloseTo(pred.probability, 10);
  });

  it("is monotonic: adding an incriminating factor raises P(conviction)", () => {
    const base: Factors = { forensic: false, confession: false, alibi: false, weapon: false };
    const m = reconstructModel(predictionFrom(WEIGHTS, INTERCEPT, base));
    const p0 = probability(m, base);
    const p1 = probability(m, { ...base, confession: true });
    expect(p1).toBeGreaterThan(p0);
  });
});

describe("presentFactorEffects", () => {
  const f: Factors = { forensic: true, confession: true, alibi: true, weapon: false };
  const m = reconstructModel(predictionFrom(WEIGHTS, INTERCEPT, f));
  const effects = presentFactorEffects(m, f);

  it("returns one effect per present factor only", () => {
    expect(effects.map((e) => e.key).sort()).toEqual(["alibi", "confession", "forensic"]);
  });

  it("signs each effect by the factor's direction", () => {
    const byKey = Object.fromEntries(effects.map((e) => [e.key, e.delta]));
    expect(byKey.confession).toBeGreaterThan(0); // incriminating
    expect(byKey.forensic).toBeGreaterThan(0);
    expect(byKey.alibi).toBeLessThan(0); // exculpatory
  });

  it("is sorted by descending absolute impact", () => {
    const abs = effects.map((e) => Math.abs(e.delta));
    expect(abs).toEqual([...abs].sort((a, b) => b - a));
  });
});

describe("compareCases", () => {
  it("attributes the log-odds gap to the differing factors only", () => {
    const a: Factors = { forensic: true, confession: true, alibi: false, weapon: false };
    const b: Factors = { forensic: true, confession: false, alibi: true, weapon: false };
    const m = reconstructModel(predictionFrom(WEIGHTS, INTERCEPT, a));
    const diff = compareCases(m, a, b);
    // Only confession and alibi differ.
    expect(diff.map((d) => d.key).sort()).toEqual(["alibi", "confession"]);
    const byKey = Object.fromEntries(diff.map((d) => [d.key, d.delta]));
    expect(byKey.confession).toBeCloseTo(WEIGHTS.confession * (1 - 0), 10);
    expect(byKey.alibi).toBeCloseTo(WEIGHTS.alibi * (0 - 1), 10);
  });
});

describe("waterfall", () => {
  it("starts at the base probability and ends at the scenario probability", () => {
    const base: Factors = { forensic: false, confession: false, alibi: false, weapon: false };
    const scenario: Factors = { forensic: true, confession: true, alibi: false, weapon: false };
    const m = reconstructModel(predictionFrom(WEIGHTS, INTERCEPT, base));
    const steps = waterfall(m, base, scenario, ["forensic", "confession"]);

    expect(steps[0].key).toBeNull();
    expect(steps[0].prob).toBeCloseTo(probability(m, base), 10);
    expect(steps[steps.length - 1].prob).toBeCloseTo(probability(m, scenario), 10);
    // Each step's delta is the change it introduced.
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].delta).toBeCloseTo(steps[i].prob - steps[i - 1].prob, 10);
    }
  });
});
