"use client";

import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SiteHeader() {
  const { t } = useI18n();
  return (
    <header
      style={{
        padding: "14px 20px",
        background: "#14161c",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>CounterLex</div>
        <div style={{ fontSize: 13, color: "#aeb4c2" }}>{t("subtitle")}</div>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
