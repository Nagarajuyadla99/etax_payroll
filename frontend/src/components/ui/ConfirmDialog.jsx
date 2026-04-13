import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-5 shadow-xl transition duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3">
          <span
            className={[
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
              danger ? "bg-red-50 text-red-600 ring-red-100" : "bg-amber-50 text-amber-700 ring-amber-100",
            ].join(" ")}
            aria-hidden
          >
            <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {message ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{message}</p> : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={[
              "inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50",
              danger
                ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
                : "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500",
            ].join(" ")}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
