/**
 * Shared field shell: left icon + focus ring (indigo, theme-aligned).
 */
const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 " +
  "focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

export function InputWithIcon({ icon: Icon, className = "", inputClassName = "", ...inputProps }) {
  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
      </span>
      <input className={[fieldBase, inputClassName].filter(Boolean).join(" ")} {...inputProps} />
    </div>
  );
}

export function SelectWithIcon({ icon: Icon, className = "", selectClassName = "", children, ...selectProps }) {
  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
      </span>
      <select
        className={[fieldBase, "cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-9", selectClassName].filter(Boolean).join(" ")}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        }}
        {...selectProps}
      >
        {children}
      </select>
    </div>
  );
}
