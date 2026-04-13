import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export function useToastStack() {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const addToast = useCallback((message, type = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function ToastStack({ toasts, onRemove }) {
  if (!toasts?.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-stretch gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto flex max-w-md items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg transition duration-200 ease-out",
            t.type === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900",
          ].join(" ")}
        >
          <span className="mt-0.5 shrink-0">
            {t.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-600" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            )}
          </span>
          <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-current opacity-60 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            onClick={() => onRemove(t.id)}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
