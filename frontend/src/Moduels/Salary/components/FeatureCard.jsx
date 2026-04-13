import { ChevronRight } from "lucide-react";

const BADGE_LABELS = {
  new: "New",
  frequent: "Frequent",
  important: "Important",
};

const BADGE_CLASS =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

const BADGE_VARIANTS = {
  new: `${BADGE_CLASS} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70`,
  frequent: `${BADGE_CLASS} bg-slate-100 text-slate-600 ring-1 ring-slate-200/90`,
  important: `${BADGE_CLASS} bg-amber-50 text-amber-800 ring-1 ring-amber-200/80`,
};

/**
 * Premium module card — uses theme-neutral slate/blue accents (matches app shell).
 * No emojis; icon passed as Lucide component.
 */
export default function FeatureCard({
  title,
  description,
  icon: Icon,
  badge,
  onClick,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex w-full min-h-[8.75rem] flex-col rounded-xl border border-slate-200/90 bg-white p-4 text-left",
        "shadow-sm shadow-slate-900/5 transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:border-blue-200/80 hover:shadow-md hover:shadow-slate-900/10",
        "hover:ring-1 hover:ring-blue-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2",
        "active:scale-[0.99] active:duration-150",
        className,
      ].join(" ")}
    >
      <div className="mb-3 flex w-full items-start justify-between gap-2">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100/80 transition-colors duration-200 group-hover:bg-blue-100/80 group-hover:text-blue-700"
          aria-hidden
        >
          {Icon ? <Icon className="h-5 w-5" strokeWidth={1.75} /> : null}
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {badge && BADGE_LABELS[badge] ? (
            <span className={BADGE_VARIANTS[badge]}>{BADGE_LABELS[badge]}</span>
          ) : null}
          <ChevronRight
            className="h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500"
            aria-hidden
          />
        </div>
      </div>
      <h3 className="mb-1.5 font-semibold leading-snug text-slate-900">{title}</h3>
      <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{description}</p>
    </button>
  );
}
