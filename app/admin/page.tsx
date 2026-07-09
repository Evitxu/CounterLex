"use client";

import { useCallback, useEffect, useState } from "react";
import { listContactMessages } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBusy } from "@/lib/busy";
import type { ContactMessage } from "@/lib/types";

const KEY_STORAGE = "counterlex_admin_key";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e4ea",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid #e2e4ea",
  fontSize: 12,
  color: "#666",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #eef1f5",
  fontSize: 13,
  verticalAlign: "top",
};

export default function AdminPage() {
  const { t } = useI18n();
  const { run: track } = useBusy();
  const [adminKey, setAdminKey] = useState("");
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (key: string) => {
      setBusy(true);
      setErr(null);
      try {
        const data = await track(listContactMessages(key || undefined));
        setMessages(data);
      } catch (e) {
        const msg = (e as Error).message;
        setErr(/\b401\b/.test(msg) ? t("adminUnauthorized") : msg);
        setMessages(null);
      } finally {
        setBusy(false);
      }
    },
    [track, t]
  );

  // Restore a previously entered key (convenience for repeat visits).
  useEffect(() => {
    const saved = window.localStorage.getItem(KEY_STORAGE) ?? "";
    setAdminKey(saved);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.localStorage.setItem(KEY_STORAGE, adminKey);
    load(adminKey);
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>🔐 {t("adminTitle")}</h1>
      <p style={{ color: "#555", maxWidth: 760 }}>{t("adminIntro")}</p>

      <form onSubmit={onSubmit} style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 240 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {t("adminKeyLabel")}
          </span>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder={t("adminKeyPlaceholder")}
            autoComplete="off"
            style={{ width: "100%", padding: 10, border: "1px solid #d2d7e0", borderRadius: 8, fontSize: 14 }}
          />
        </label>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? t("adminLoading") : messages ? t("adminRefresh") : t("adminLoad")}
        </button>
      </form>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {messages && (
        <>
          <p style={{ fontSize: 13, color: "#666" }}>{t("adminCount", { n: messages.length })}</p>
          {messages.length === 0 ? (
            <p style={{ color: "#888" }}>{t("adminNone")}</p>
          ) : (
            <div style={{ ...card, overflowX: "auto", padding: 0 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={th}>{t("adminColDate")}</th>
                    <th style={th}>{t("adminColName")}</th>
                    <th style={th}>{t("adminColEmail")}</th>
                    <th style={th}>{t("adminColMessage")}</th>
                    <th style={th}>{t("adminColSent")}</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m.id}>
                      <td style={{ ...td, whiteSpace: "nowrap", color: "#777" }}>
                        {m.created_at.replace("T", " ").slice(0, 16)}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {m.name} {m.surname}
                      </td>
                      <td style={td}>
                        <a href={`mailto:${m.reply_email}`} style={{ color: "#3050b0" }}>
                          {m.reply_email}
                        </a>
                      </td>
                      <td style={{ ...td, maxWidth: 360, whiteSpace: "pre-wrap" }}>{m.observations}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: m.email_sent ? "#e6f4ea" : "#f2f4f8",
                            color: m.email_sent ? "#1a7f37" : "#8a8f98",
                          }}
                        >
                          {m.email_sent ? t("adminSentYes") : t("adminSentNo")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
