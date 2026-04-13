import { useMemo } from "react";

function initialsFromName(name) {
  if (!name) return "U";
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UserAvatar({
  name,
  src,
  size = 32,
  className = "",
  roundedClassName = "rounded-lg",
}) {
  const initials = useMemo(() => initialsFromName(name), [name]);
  const s = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={[
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-sm",
        roundedClassName,
        className,
      ].join(" ")}
      style={{ width: s, height: s }}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold">{initials}</span>
      )}
    </div>
  );
}

