"use client";

import { useI18n } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <FlagButton active={lang === "es"} onClick={() => setLang("es")} label={t("lang.es")} code="ES">
        <SpainFlag />
      </FlagButton>
      <FlagButton active={lang === "en"} onClick={() => setLang("en")} label={t("lang.en")} code="EN">
        <UKFlag />
      </FlagButton>
    </div>
  );
}

function FlagButton({
  active, onClick, label, code, children,
}: {
  active: boolean; onClick: () => void; label: string; code: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "3px 8px",
        borderRadius: 8, cursor: "pointer",
        border: active ? "1px solid #fff" : "1px solid transparent",
        background: active ? "rgba(255,255,255,0.16)" : "transparent",
        color: "#fff", fontSize: 12, fontWeight: 600,
        opacity: active ? 1 : 0.6, transition: "opacity .15s, background .15s",
      }}
    >
      {children}
      <span>{code}</span>
    </button>
  );
}

function SpainFlag() {
  return (
    <svg width="22" height="16" viewBox="0 0 60 40" aria-hidden="true">
      <clipPath id="cl-flag-es"><rect width="60" height="40" rx="6" /></clipPath>
      <g clipPath="url(#cl-flag-es)">
        <rect width="60" height="40" fill="#c60b1e" />
        <rect y="10" width="60" height="20" fill="#ffc400" />
      </g>
    </svg>
  );
}

function UKFlag() {
  return (
    <svg width="22" height="16" viewBox="0 0 60 40" aria-hidden="true">
      <clipPath id="cl-flag-gb"><rect width="60" height="40" rx="6" /></clipPath>
      <g clipPath="url(#cl-flag-gb)">
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#c8102e" strokeWidth="4" />
        <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="13" />
        <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" strokeWidth="8" />
      </g>
    </svg>
  );
}
