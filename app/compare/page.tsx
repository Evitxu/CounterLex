"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { counterfactual, listFactors } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";
import { compareCases, probability, reconstructModel, type LinModel } from "@/lib/model";
import type { Factor, Factors } from "@/lib/types";
import ProbabilityGauge from "@/components/ProbabilityGauge";
import FactorToggles from "@/components/FactorToggles";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

export default function ComparePage() {
  const { t, lang } = useI18n();
  const { run } = useBusy();
  const [catalog, setCatalog] = useState<Factor[]>([]);
  const [model, setModel] = useState<LinModel | null>(null);
  const [a, setA] = useState<Factors>({});
  const [b, setB] = useState<Factors>({});
  const [err, setErr] = useState<string | null>(null);

  const byKey = useMemo(() => Object.fromEntries(catalog.map((f) => [f.key, f])), [catalog]);
  const labelFor = useCallback(
    (k: string) => {
      const f = byKey[k];
      return f ? (lang === "en" ? f.label_en : f.label_es) : k;
    },
    [byKey, lang]
  );

  useEffect(() => {
    (async () => {
      try {
        const cat = await run(listFactors());
        setCatalog(cat);
        const empty: Factors = Object.fromEntries(cat.map((f) => [f.key, false]));
        // Preset A with two incriminating factors so a difference is visible.
        setA({ ...empty, forensic_evidence: true, eyewitness: true });
        setB(empty);
        const res = await run(counterfactual(empty, {}));
        setModel(reconstructModel(res.base));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pA = model ? probability(model, a) : 0;
  const pB = model ? probability(model, b) : 0;
  const diffs = model ? compareCases(model, a, b) : [];
  const deltaPp = Math.round((pA - pB) * 100);
  const maxAbs = Math.max(...diffs.map((d) => Math.abs(d.delta)), 0.1);

  function toggle(which: "a" | "b", key: string) {
    if (which === "a") setA((s) => ({ ...s, [key]: !s[key] }));
    else setB((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>🆚 {t("compareTitle")}</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 760 }}>{t("compareIntro")}</p>
      {err && <p style={{ color: "var(--danger)" }}>{err} — {t("backendError")}</p>}

      <div className="cl-grid">
        <div style={card}>
          <strong>{t("caseA")}</strong>
          <div style={{ margin: "10px 0" }}>
            <ProbabilityGauge scenario={pA} baseline={pB} />
          </div>
          {catalog.length > 0 && (
            <FactorToggles catalog={catalog} values={a} baseline={a} onToggle={(k) => toggle("a", k)} />
          )}
        </div>
        <div style={card}>
          <strong>{t("caseB")}</strong>
          <div style={{ margin: "10px 0" }}>
            <ProbabilityGauge scenario={pB} baseline={pA} />
          </div>
          {catalog.length > 0 && (
            <FactorToggles catalog={catalog} values={b} baseline={b} onToggle={(k) => toggle("b", k)} />
          )}
        </div>
      </div>

      <div style={card}>
        <strong>{t("compareDiffTitle")}</strong>
        <p style={{ margin: "8px 0", color: "var(--text)" }}>
          {t("compareDelta", { a: Math.round(pA * 100), b: Math.round(pB * 100), d: deltaPp > 0 ? `+${deltaPp}` : `${deltaPp}` })}
        </p>
        {diffs.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>{t("compareNoDiff")}</p>
        ) : (
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {diffs.map((d) => {
              const w = (Math.abs(d.delta) / maxAbs) * 50;
              const favorsA = d.delta > 0;
              return (
                <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 160, textAlign: "right", color: "var(--text)" }}>{labelFor(d.key)}</span>
                  <div style={{ position: "relative", flex: 1, height: 16, background: "var(--surface-2)", borderRadius: 4, minWidth: 60 }}>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border-input)" }} />
                    <div
                      style={{
                        position: "absolute", top: 2, bottom: 2, borderRadius: 3,
                        ...(favorsA
                          ? { left: "50%", width: `${w}%`, background: "var(--accent)" }
                          : { right: "50%", width: `${w}%`, background: "var(--role-fiscal)" }),
                      }}
                    />
                  </div>
                  <span style={{ width: 120, fontSize: 11, color: favorsA ? "var(--accent)" : "var(--role-fiscal)" }}>
                    {favorsA ? t("compareFavorsA") : t("compareFavorsB")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
