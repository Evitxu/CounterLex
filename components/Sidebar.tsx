"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

interface Item {
  href: string;
  icon: string;
  key: string;
  soon?: boolean;
}

const ITEMS: Item[] = [
  { href: "/", icon: "⚖", key: "nav.counterfactual" },
  { href: "/analyze", icon: "📄", key: "nav.analyze" },
  { href: "/search", icon: "🔍", key: "nav.search" },
  { href: "/reports", icon: "📑", key: "nav.reports", soon: true },
];

export default function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="cl-sidebar">
      {ITEMS.map((it) => {
        const active = pathname === it.href;
        const content = (
          <>
            <span style={{ fontSize: 16 }}>{it.icon}</span>
            <span style={{ flex: 1 }}>{t(it.key)}</span>
            {it.soon && <span className="cl-badge-soon">{t("nav.soon")}</span>}
          </>
        );
        const style: React.CSSProperties = {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
          color: active ? "#fff" : it.soon ? "#9aa0ad" : "#2b3444",
          background: active ? "#3050b0" : "transparent",
          cursor: it.soon ? "default" : "pointer",
        };
        return it.soon ? (
          <span key={it.href} style={style}>{content}</span>
        ) : (
          <Link key={it.href} href={it.href} style={style}>{content}</Link>
        );
      })}
    </nav>
  );
}
