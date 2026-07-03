"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/lib/i18n";

interface BusyValue {
  // Wrap any promise: shows a blocking overlay while it runs.
  run: <T>(p: Promise<T>) => Promise<T>;
}

const BusyContext = createContext<BusyValue | null>(null);

export function BusyProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only reveal the overlay if work lasts >200ms — avoids flicker on fast ops.
  useEffect(() => {
    if (count > 0) {
      if (timer.current == null) timer.current = setTimeout(() => setShow(true), 200);
    } else {
      if (timer.current != null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      setShow(false);
    }
  }, [count]);

  const run = useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    setCount((c) => c + 1);
    try {
      return await p;
    } finally {
      setCount((c) => c - 1);
    }
  }, []);

  return (
    <BusyContext.Provider value={{ run }}>
      {children}
      {show && <Overlay />}
    </BusyContext.Provider>
  );
}

function Overlay() {
  const { t } = useI18n();
  return (
    <div
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(20,22,28,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <span className="cl-spinner" aria-hidden="true" />
        <span style={{ fontWeight: 600 }}>{t("processing")}</span>
      </div>
    </div>
  );
}

export function useBusy(): BusyValue {
  const ctx = useContext(BusyContext);
  if (!ctx) throw new Error("useBusy must be used within <BusyProvider>");
  return ctx;
}
