"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

// Toggles the `data-theme` attribute on <html> and persists the choice. The
// initial value is applied before paint by an inline script in the layout, so
// this component only reflects/updates it (avoids a flash and hydration issues).
export default function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-theme");
    setTheme(cur === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("counterlex_theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("themeToggle")}
      title={t("themeToggle")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 30,
        borderRadius: 8,
        cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.10)",
        color: "#fff",
        fontSize: 15,
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}