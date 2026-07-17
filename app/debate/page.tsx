"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { debate, listFactors } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";
import type { DebateResult, Factor, Factors } from "@/lib/types";
import FactorToggles from "@/components/FactorToggles";
import PrecedentList from "@/components/PrecedentList";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

const ROLE_COLOR: Record<string, string> = {
  fiscal: "var(--role-fiscal)",
  defensa: "var(--role-defensa)",
  juez: "var(--accent)",
};

export default function DebatePage() {
  const { t, lang } = useI18n();
  const { run } = useBusy();
  const [catalog, setCatalog] = useState<Factor[]>([]);
  const [factors, setFactors] = useState<Factors>({});
  const [result, setResult] = useState<DebateResult | null>(null);
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
    run(listFactors())
      .then((cat) => {
        setCatalog(cat);
        const base: Factors = Object.fromEntries(cat.map((f) => [f.key, false]));
        setFactors({ ...base, forensic_evidence: true, eyewitness: true, weapon_present: true });
      })
      .catch((e) => setErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key: string) {
    setFactors((s) => ({ ...s, [key]: !s[key] }));
  }

  async function generate() {
    setErr(null);
    try {
      setResult(await run(debate(factors, lang)));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>🗣️ {t("debateTitle")}</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 760 }}>{t("debateIntro")}</p>
      {err && <p style={{ color: "var(--danger)" }}>{err} — {t("backendError")}</p>}

      <div className="cl-grid">
        {/* Left: configure + generate */}
        <div>
          <div style={card}>
            <div style={{ marginBottom: 10 }}>
              <button className="btn btn-primary" onClick={generate} disabled={catalog.length === 0}>
                🗣️ {t("debateRun")}
              </button>
            </div>
            {catalog.length > 0 && (
              <FactorToggles catalog={catalog} values={factors} baseline={factors} onToggle={toggle} />
            )}
          </div>
        </div>

        {/* Right: debate + consensus + precedents */}
        <div>
          {result ? (
            <>
              <div style={card}>
                <strong>{t("debateConsensus")}</strong>
                <p style={{ margin: "8px 0 0", color: "var(--text)" }}>{result.consensus}</p>
              </div>

              {!result.llm_available && (
                <div style={{ ...card, background: "var(--warn-bg)", border: "1px solid var(--warn-border)" }}>
                  <span style={{ fontSize: 14, color: "var(--warn-text)" }}>{t("debateNoLlm")}</span>
                </div>
              )}

              {result.turns.map((turn) => (
                <div key={turn.role} style={{ ...card, borderLeft: `4px solid ${ROLE_COLOR[turn.role] ?? "var(--text-faint)"}` }}>
                  <strong style={{ color: ROLE_COLOR[turn.role] ?? "var(--text)" }}>
                    {t(`role.${turn.role}`)}
                  </strong>
                  <p style={{ margin: "8px 0 0", color: "var(--text)", lineHeight: 1.5 }}>{turn.argument}</p>
                </div>
              ))}

              <div style={card}>
                <strong>{t("precTitleSim")}</strong>
                <div style={{ marginTop: 10 }}>
                  <PrecedentList precedents={result.precedents} labelFor={labelFor} />
                </div>
              </div>
            </>
          ) : (
            <div style={card}>
              <p style={{ color: "var(--text-faint)", margin: 0 }}>{t("debateIntro")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
