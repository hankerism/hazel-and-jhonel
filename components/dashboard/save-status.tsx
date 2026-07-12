"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

interface SaveStatusContextValue {
  status: Status;
  setStatus: (s: Status) => void;
}

const SaveStatusContext = createContext<SaveStatusContextValue>({
  status: "idle",
  setStatus: () => {},
});

export const useSaveStatus = () => useContext(SaveStatusContext);

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatusState] = useState<Status>("idle");
  const resetTimer = useRef<number | null>(null);

  const setStatus = useCallback((s: Status) => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setStatusState(s);
    if (s === "saved") {
      resetTimer.current = window.setTimeout(() => setStatusState("idle"), 2500);
    }
  }, []);

  return (
    <SaveStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </SaveStatusContext.Provider>
  );
}

const LABELS: Record<Status, string | null> = {
  idle: null,
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

/** Topbar indicator: quiet dot + label reflecting the active page's state. */
export function SaveStatusIndicator() {
  const { status } = useSaveStatus();
  const label = LABELS[status];
  if (!label) return null;

  const dot = {
    dirty: "bg-gold",
    saving: "bg-gold animate-pulse",
    saved: "bg-[#7a9471]",
    error: "bg-[#b0564a]",
    idle: "",
  }[status];

  return (
    <span className="flex items-center gap-2 text-xs text-stone">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
