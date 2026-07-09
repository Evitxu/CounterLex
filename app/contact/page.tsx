"use client";

import { useMemo, useState } from "react";
import { submitContact } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";

// Mirrors the backend limits (app/core/config.py) and email check (api.py).
const LIMITS = { name: 60, surname: 150, email: 255, observations: 1000 } as const;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Field = keyof typeof LIMITS;

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
  maxWidth: 640,
};

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: 10,
  border: "1px solid #d2d7e0",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
};

export default function ContactPage() {
  const { t } = useI18n();
  const { run: track } = useBusy();

  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    surname: "",
    email: "",
    observations: "",
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { emailSent: boolean }>(null);

  function validate(field: Field, value: string): string | null {
    const v = value.trim();
    if (!v) return t("contactRequired");
    if (v.length > LIMITS[field]) return t("contactTooLong", { max: LIMITS[field] });
    if (field === "email" && !EMAIL_RE.test(v)) return t("contactEmailInvalid");
    return null;
  }

  const errors = useMemo(() => {
    const e: Partial<Record<Field, string>> = {};
    (Object.keys(LIMITS) as Field[]).forEach((f) => {
      const msg = validate(f, values[f]);
      if (msg) e[f] = msg;
    });
    return e;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, t]);

  const isValid = Object.keys(errors).length === 0;

  function set(field: Field, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setDone(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, surname: true, email: true, observations: true });
    if (!isValid) return;
    setBusy(true);
    setServerError(null);
    try {
      const res = await track(
        submitContact({
          name: values.name.trim(),
          surname: values.surname.trim(),
          email: values.email.trim(),
          observations: values.observations.trim(),
        })
      );
      setDone({ emailSent: res.email_sent });
      setValues({ name: "", surname: "", email: "", observations: "" });
      setTouched({});
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function fieldError(f: Field): string | null {
    return touched[f] ? errors[f] ?? null : null;
  }

  const labels: Record<Field, string> = {
    name: t("contactName"),
    surname: t("contactSurname"),
    email: t("contactEmail"),
    observations: t("contactObservations"),
  };
  const placeholders: Record<Field, string> = {
    name: t("contactNamePlaceholder"),
    surname: t("contactSurnamePlaceholder"),
    email: t("contactEmailPlaceholder"),
    observations: t("contactObservationsPlaceholder"),
  };

  function renderField(f: Field, textarea = false) {
    const err = fieldError(f);
    const left = LIMITS[f] - values[f].length;
    const border = err ? "1px solid crimson" : inputBase.border;
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {labels[f]} <span style={{ color: "crimson" }}>*</span>
        </label>
        {textarea ? (
          <textarea
            value={values[f]}
            onChange={(e) => set(f, e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, [f]: true }))}
            placeholder={placeholders[f]}
            maxLength={LIMITS[f]}
            rows={5}
            style={{ ...inputBase, border, resize: "vertical" }}
          />
        ) : (
          <input
            type={f === "email" ? "email" : "text"}
            value={values[f]}
            onChange={(e) => set(f, e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, [f]: true }))}
            placeholder={placeholders[f]}
            maxLength={LIMITS[f]}
            style={{ ...inputBase, border }}
          />
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 12, color: "crimson" }}>{err ?? ""}</span>
          <span style={{ fontSize: 12, color: "#999" }}>
            {t("contactCharsLeft", { n: left })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>✉️ {t("contactTitle")}</h1>
      <p style={{ color: "#555", maxWidth: 640 }}>{t("contactIntro")}</p>

      <form onSubmit={onSubmit} style={card} noValidate>
        {renderField("name")}
        {renderField("surname")}
        {renderField("email")}
        {renderField("observations", true)}

        <button className="btn btn-primary" disabled={busy || !isValid}>
          {busy ? t("contactSending") : t("contactSend")}
        </button>

        {done && (
          <p style={{ color: "#1a7f37", marginTop: 14, marginBottom: 0 }}>
            {done.emailSent ? t("contactOk") : t("contactOkStored")}
          </p>
        )}
        {serverError && (
          <p style={{ color: "crimson", marginTop: 14, marginBottom: 0 }}>
            {t("contactError")} {serverError}
          </p>
        )}
      </form>
    </section>
  );
}
