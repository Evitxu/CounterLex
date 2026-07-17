"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { counterfactual, listFactors } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";
import { presentFactorEffects, probability, reconstructModel, type LinModel } from "@/lib/model";
import { CASES } from "@/lib/cases";
import type { Factor } from "@/lib/types";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

function probColor(p: number): string {
  return `hsl(${Math.round(140 * (1 - p))} 72% 45%)`;
}

export default function DetectivePage() {
  const { t, lang } = useI18n();
  const { run } = useBusy();
  const [catalog, setCatalog] = useState<Factor[]>([]);
  const [model, setModel] = useState<LinModel | null>(null);
  const [caseIdx, setCaseIdx] = useState(0);
  const [accused, setAccused] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCatalog(await run(listFactors()));
        const res = await run(counterfactual({}, {}));
        setModel(reconstructModel(res.base));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byKey = useMemo(() => Object.fromEntries(catalog.map((f) => [f.key, f])), [catalog]);
  const labelFor = useCallback(
    (k: string) => {
      const f = byKey[k];
      return f ? (lang === "en" ? f.label_en : f.label_es) : k;
    },
    [byKey, lang]
  );

  const scene = CASES[caseIdx];
  const nameOf = (s: (typeof scene.suspects)[number]) => (lang === "en" ? s.name_en : s.name_es);

  const scores = useMemo(() => {
    if (!model) return {} as Record<string, number>;
    return Object.fromEntries(scene.suspects.map((s) => [s.id, probability(model, s.factors)]));
  }, [model, scene]);

  const culprit = useMemo(() => {
    if (!model) return null;
    return scene.suspects.reduce((best, s) => (scores[s.id] > scores[best.id] ? s : best), scene.suspects[0]);
  }, [model, scene, scores]);

  const decisive = useMemo(() => {
    if (!model || !culprit) return null;
    const effs = presentFactorEffects(model, culprit.factors);
    if (effs.length === 0) return null;
    const top = effs[0];
    const p = scores[culprit.id];
    return { key: top.key, a: Math.round(p * 100), b: Math.round((p - top.delta) * 100) };
  }, [model, culprit, scores]);

  function newCase() {
    setAccused(null);
    setCaseIdx((i) => (i + 1) % CASES.length);
  }

  const revealed = accused !== null;
  const correct = revealed && culprit && accused === culprit.id;

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>🕵️ {t("detTitle")}</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 760 }}>{t("detIntro")}</p>
      {err && <p style={{ color: "var(--danger)" }}>{err} — {t("backendError")}</p>}

      {/* Scene */}
      <div style={{ ...card, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{scene.emoji}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{lang === "en" ? scene.title_en : scene.title_es}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>{lang === "en" ? scene.intro_en : scene.intro_es}</div>
        </div>
      </div>

      {/* Result banner */}
      {revealed && culprit && (
        <div
          style={{
            ...card,
            borderLeft: `4px solid ${correct ? "var(--role-defensa)" : "var(--role-fiscal)"}`,
          }}
        >
          <strong style={{ color: correct ? "var(--role-defensa)" : "var(--role-fiscal)" }}>
            {correct
              ? t("detCorrect", { name: nameOf(culprit), p: Math.round(scores[culprit.id] * 100) })
              : t("detWrong", {
                  accused: nameOf(scene.suspects.find((s) => s.id === accused)!),
                  culprit: nameOf(culprit),
                  p: Math.round(scores[culprit.id] * 100),
                })}
          </strong>
          {decisive && (
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text)" }}>
              {t("detDecisive", { name: nameOf(culprit), factor: labelFor(decisive.key), a: decisive.a, b: decisive.b })}
            </p>
          )}
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-faint)" }}>{t("detNote")}</p>
          <button className="btn btn-secondary" onClick={newCase} style={{ marginTop: 10 }}>
            🔄 {t("detNewCase")}
          </button>
        </div>
      )}

      {!revealed && (
        <p style={{ fontWeight: 600 }}>{t("detAccuseWho")}</p>
      )}

      {/* Suspects */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {scene.suspects.map((s) => {
          const isCulprit = revealed && culprit?.id === s.id;
          const isAccused = accused === s.id;
          const p = scores[s.id] ?? 0;
          return (
            <div
              key={s.id}
              style={{
                border: `2px solid ${isCulprit ? "var(--role-defensa)" : isAccused ? "var(--role-fiscal)" : "var(--border)"}`,
                borderRadius: 10,
                padding: 12,
                background: "var(--surface)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 30 }}>{s.emoji}</span>
                <strong>{nameOf(s)}</strong>
                {isCulprit && <span style={{ marginLeft: "auto" }}>🎯</span>}
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("detEvidence")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Object.keys(s.factors)
                  .filter((k) => s.factors[k])
                  .map((k) => {
                    const incrim = (byKey[k]?.direction ?? 1) >= 0;
                    return (
                      <span
                        key={k}
                        style={{
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: incrim ? "var(--danger-bg)" : "var(--good-bg)",
                          color: incrim ? "var(--role-fiscal)" : "var(--role-defensa)",
                        }}
                      >
                        {labelFor(k)}
                      </span>
                    );
                  })}
              </div>

              {revealed ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ height: 10, background: "var(--surface-2)", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round(p * 100)}%`, height: "100%", background: probColor(p) }} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                    {Math.round(p * 100)}% {t("detProb")}
                  </div>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={() => setAccused(s.id)} style={{ marginTop: 4 }}>
                  {t("detAccuse")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
