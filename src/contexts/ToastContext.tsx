"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastItem["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, tone }]);
    try { window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200); } catch {}
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? CircleAlert : Info;
          return (
            <div className={`toast toast-${toast.tone}`} key={toast.id} role="status">
              <Icon size={19} aria-hidden="true" />
              <span>{toast.message}</span>
              <button
                className="icon-button icon-button-small"
                onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
