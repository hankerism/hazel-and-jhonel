"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./ui";

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  async () => false,
);

/** Promise-based confirmation: `if (await confirm({...})) { ... }` */
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/40 p-6 backdrop-blur-[2px]"
          onClick={() => close(false)}
          onKeyDown={(e) => e.key === "Escape" && close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={options.title}
            className="fade-slide-in w-full max-w-sm rounded-2xl border border-line bg-ivory p-7 shadow-[0_20px_70px_rgba(26,24,21,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-xl font-light">{options.title}</p>
            {options.body && (
              <p className="mt-2 text-sm leading-relaxed text-stone">{options.body}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => close(false)} autoFocus>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => close(true)}>
                {options.confirmLabel ?? "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
