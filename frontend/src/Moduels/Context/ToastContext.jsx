import { createContext, useCallback, useContext, useMemo } from "react";
import { ToastStack, useToastStack } from "../../components/ui/ToastStack";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { toasts, addToast, removeToast } = useToastStack();

  const success = useCallback(
    (message) => {
      addToast(message, "success");
    },
    [addToast]
  );

  const error = useCallback(
    (message) => {
      addToast(message, "error");
    },
    [addToast]
  );

  const value = useMemo(
    () => ({
      success,
      error,
    }),
    [success, error]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
