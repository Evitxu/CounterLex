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
  // Set a 0–100 upload percentage (or null for an indeterminate spinner).
  setProgress: (pct: number | null) => void;
}

const BusyContext = createContext<BusyValue | null>(null);

export function BusyProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
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
      setProgress(null);
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
    <BusyContext.Provider value={{ run, setProgress }}>
      {children}
      {show && <Overlay progress={progress} />}
    </BusyContext.Provider>
  );
}

function Overlay({ progress }: { progress: number | null }) {
  const { t } = useI18n();
  const determinate = progress !== null;
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
          minWidth: 240,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="cl-spinner" aria-hidden="true" />
          <span style={{ fontWeight: 600 }}>
            {determinate ? `${t("uploading")} ${progress}%` : t("processing")}
          </span>
        </div>
        {determinate && (
          <div
            style={{
              marginTop: 12,
              height: 8,
              borderRadius: 4,
              background: "#eceef3",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#3050b0",
                transition: "width 0.15s linear",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function useBusy(): BusyValue {
  const ctx = useContext(BusyContext);
  if (!ctx) throw new Error("useBusy must be used within <BusyProvider>");
  return ctx;
}
