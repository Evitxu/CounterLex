import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { BusyProvider } from "@/lib/busy";
import SiteHeader from "@/components/SiteHeader";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CounterLex — Counterfactual Precedent Explorer",
  description: "Interpretable prediction of judicial outcomes and counterfactual analysis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Apply the saved/preferred theme before paint (no flash, no hydration mismatch). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('counterlex_theme');if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();",
          }}
        />
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "var(--bg)", color: "var(--text)" }}>
        <LanguageProvider>
          <BusyProvider>
            <SiteHeader />
            <div className="cl-shell">
              <Sidebar />
              <main className="cl-content">{children}</main>
            </div>
            <footer
              style={{
                textAlign: "center",
                color: "var(--text-faint)",
                fontSize: 12,
                padding: "20px",
                borderTop: "1px solid var(--border)",
                marginTop: 8,
              }}
            >
              <svg
                viewBox="0 0 64 64"
                width="15"
                height="15"
                aria-hidden="true"
                style={{ verticalAlign: "middle", marginRight: 6 }}
              >
                <defs>
                  <linearGradient id="clbg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3f5fc4" />
                    <stop offset="1" stopColor="#24409a" />
                  </linearGradient>
                </defs>
                <rect width="64" height="64" rx="14" fill="url(#clbg)" />
                <g fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="17" y1="22" x2="47" y2="22" />
                  <line x1="32" y1="18" x2="32" y2="45" />
                  <line x1="24" y1="47" x2="40" y2="47" />
                  <path d="M17 22 L12 31 M17 22 L22 31" />
                  <path d="M10 31 Q17 39 24 31" />
                  <path d="M47 22 L42 31 M47 22 L52 31" />
                  <path d="M40 31 Q47 39 54 31" />
                </g>
                <circle cx="32" cy="16" r="3.4" fill="#ffffff" />
              </svg>
              © {new Date().getFullYear()} CounterLex · EMDA *_*
            </footer>
          </BusyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
