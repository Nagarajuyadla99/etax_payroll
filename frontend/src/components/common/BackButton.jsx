import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const DEFAULT_HIDE_PATHS = ["/dashboard", "/", "/login", "/register", "/reset-password"];

function normalizePath(p) {
  const s = (p || "/").trim();
  const noTrail = s.length > 1 ? s.replace(/\/+$/, "") : s;
  return noTrail || "/";
}

function canGoBack() {
  // react-router stores an `idx` number in the history state for in-app navigation.
  // If idx > 0, a safe back navigation exists.
  const st = window.history?.state;
  const idx = st && typeof st.idx === "number" ? st.idx : null;
  if (typeof idx === "number") return idx > 0;

  // Fallback heuristic: if history length is 1, it's almost certainly a direct entry.
  // (Not perfect, but good enough when idx isn't available.)
  return (window.history?.length || 1) > 1;
}

function isEditableTarget(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(el.isContentEditable);
}

export default function BackButton({
  fallbackPath = "/dashboard",
  hidePaths = DEFAULT_HIDE_PATHS,
  showLabel = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile((window.innerWidth || 0) <= 768);
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const normalizedPathname = normalizePath(location.pathname);
  const hideSet = useMemo(() => {
    return new Set((hidePaths || []).map((p) => normalizePath(p).toLowerCase()));
  }, [hidePaths]);
  const hidden = hideSet.has(normalizedPathname.toLowerCase());

  const onBack = useCallback(() => {
    if (canGoBack()) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath);
  }, [navigate, fallbackPath]);

  useEffect(() => {
    const onKey = (e) => {
      if (hidden) return;
      if (!e.altKey || e.key !== "ArrowLeft" || e.repeat) return;
      if (isEditableTarget(document.activeElement)) return;
      e.preventDefault();
      onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, hidden]);

  if (hidden) return null;

  const navH = "var(--nav-height, 58px)";
  const topOffset = `calc(${navH} + ${isMobile ? "10px" : "12px"} + env(safe-area-inset-top, 0px))`;
  const rightOffset = isMobile
    ? "max(12px, env(safe-area-inset-right, 0px))"
    : "max(22px, env(safe-area-inset-right, 0px))";

  return (
    <>
      <style>{`
        .pw-backbtn-wrap {
          position: fixed;
          top: ${topOffset};
          right: ${rightOffset};
          z-index: 120; /* above navbar (100), below dropdown (500) */
          animation: pw-backbtn-enter 240ms ease-in-out both;
        }
        @keyframes pw-backbtn-enter {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .pw-backbtn {
          display: inline-flex;
          align-items: center;
          gap: ${isMobile ? "6px" : "8px"};
          padding: ${isMobile ? "8px 10px" : "9px 12px"};
          min-height: ${isMobile ? "40px" : "42px"};
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(12px) saturate(160%);
          -webkit-backdrop-filter: blur(12px) saturate(160%);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 6px 18px rgba(15, 23, 42, 0.08);
          color: var(--slate-700, #334155);
          font-family: var(--font-body, system-ui, sans-serif);
          font-size: ${isMobile ? "12px" : "13px"};
          font-weight: 600;
          cursor: pointer;
          outline: none;
          transition: transform 220ms ease-in-out, box-shadow 220ms ease-in-out, background 220ms ease-in-out, border-color 220ms ease-in-out, color 220ms ease-in-out;
        }
        .pw-backbtn:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06), 0 10px 28px rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.92);
          border-color: rgba(59, 130, 246, 0.35);
          color: var(--slate-900, #0f172a);
        }
        .pw-backbtn:active { transform: scale(0.98); }
        .pw-backbtn:focus-visible {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.28), 0 6px 18px rgba(15, 23, 42, 0.08);
        }
      `}</style>

      <div className="pw-backbtn-wrap" key={normalizedPathname}>
        <button type="button" className="pw-backbtn" onClick={onBack} title="Go Back" aria-label="Go Back">
          <ArrowLeft size={isMobile ? 17 : 18} strokeWidth={2} aria-hidden />
          {showLabel ? <span>Back</span> : null}
        </button>
      </div>
    </>
  );
}

export { DEFAULT_HIDE_PATHS };
