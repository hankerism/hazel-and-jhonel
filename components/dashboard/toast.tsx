"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(
  () => {},
);

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`fade-slide-in rounded-full border px-5 py-2.5 text-sm shadow-[0_8px_30px_rgba(26,24,21,0.12)] backdrop-blur-md ${
              toast.tone === "success"
                ? "border-line bg-ivory/95 text-charcoal"
                : "border-[#c4a09a] bg-[#f7ece9]/95 text-[#8c4a3e]"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
