import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ═══════════════════════════════════════════
           PAYWISE DESIGN SYSTEM
        ═══════════════════════════════════════════ */
        :root {
          --sidebar-width: 252px;
          --sidebar-collapsed: 68px;
          --nav-height: 58px;

          /* Backgrounds */
          --bg-base:    #F8FAFC;
          --bg-surface: #FFFFFF;
          --bg-hover:   #F1F5F9;
          --bg-active:  #EFF6FF;
          --bg-subtle:  #F1F5F9;

          /* Brand Blue */
          --blue-700:   #1D4ED8;
          --blue-600:   #2563EB;
          --blue-500:   #3B82F6;
          --blue-100:   #DBEAFE;
          --blue-50:    #EFF6FF;

          /* Teal */
          --teal-700:   #0F766E;
          --teal-600:   #0D9488;
          --teal-500:   #14B8A6;
          --teal-100:   #CCFBF1;
          --teal-50:    #F0FDFA;

          /* Green (salary/success) */
          --green-700:  #15803D;
          --green-600:  #16A34A;
          --green-500:  #22C55E;
          --green-100:  #DCFCE7;
          --green-50:   #F0FDF4;

          /* Amber (warnings) */
          --amber-700:  #B45309;
          --amber-600:  #D97706;
          --amber-500:  #F59E0B;
          --amber-100:  #FEF3C7;
          --amber-50:   #FFFBEB;

          /* Red */
          --red-600:    #DC2626;
          --red-100:    #FEE2E2;
          --red-50:     #FEF2F2;

          /* Purple */
          --purple-600: #9333EA;
          --purple-100: #F3E8FF;
          --purple-50:  #FAF5FF;

          /* Slate typography */
          --slate-900:  #0F172A;
          --slate-800:  #1E293B;
          --slate-700:  #334155;
          --slate-600:  #475569;
          --slate-500:  #64748B;
          --slate-400:  #94A3B8;
          --slate-300:  #CBD5E1;
          --slate-200:  #E2E8F0;
          --slate-100:  #F1F5F9;

          /* Borders */
          --border:     #E2E8F0;

          /* Shadows */
          --shadow-xs:  0 1px 2px rgba(15,23,42,0.04);
          --shadow-sm:  0 1px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
          --shadow-md:  0 4px 16px rgba(15,23,42,0.08);
          --shadow-lg:  0 8px 28px rgba(15,23,42,0.10);
          --shadow-xl:  0 20px 44px rgba(15,23,42,0.12);

          /* Radii */
          --r-xs: 4px;
          --r-sm: 6px;
          --r-md: 8px;
          --r-lg: 12px;
          --r-xl: 16px;
          --r-2xl: 20px;
          --r-full: 999px;

          /* Typography */
          --font-display: 'DM Serif Display', Georgia, serif;
          --font-body:    'DM Sans', system-ui, -apple-system, sans-serif;

          /* Easing */
          --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
          --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
          --dur-fast:    120ms;
          --dur-base:    200ms;
          --dur-slow:    300ms;
          --dur-enter:   400ms;
        }

        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-body);
          background: var(--bg-base);
          color: var(--slate-900);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
          line-height: 1.5;
        }

        /* ── Layout Shell ── */
        .layout-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg-base);
        }

        /* ── Sidebar Region ── */
        .sidebar-region {
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          z-index: 200;
          width: var(--sidebar-width);
          transition: width var(--dur-slow) var(--ease-out);
          will-change: width;
        }
        .sidebar-region.collapsed { width: var(--sidebar-collapsed); }

        /* ── Main Region ── */
        .main-region {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-width: 0;
          margin-left: var(--sidebar-width);
          transition: margin-left var(--dur-slow) var(--ease-out);
          width: calc(100% - var(--sidebar-width));
        }
        .main-region.sidebar-collapsed {
          margin-left: var(--sidebar-collapsed);
          width: calc(100% - var(--sidebar-collapsed));
        }

        .content-area {
          flex: 1;
          padding: 24px 28px;
          overflow-y: auto;
          min-width: 0;
        }

        /* ── Animations ── */
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .enter-navbar  { animation: fadeDown var(--dur-enter) var(--ease-out) 60ms both; }
        .enter-content { animation: fadeUp var(--dur-enter) var(--ease-out) 140ms both; }
        .page-wrapper  { animation: fadeUp 260ms var(--ease-out) both; }

        /* ── Mobile Overlay ── */
        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(2px);
          z-index: 180;
        }
        .mobile-overlay.visible { display: block; }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .sidebar-region {
            transform: translateX(-100%);
            transition: transform var(--dur-slow) var(--ease-out), width var(--dur-slow) var(--ease-out);
            width: var(--sidebar-width) !important;
          }
          .sidebar-region.mobile-open { transform: translateX(0); }
          .main-region { margin-left: 0 !important; width: 100% !important; }
        }
        @media (min-width: 1025px) {
          .sidebar-region { transform: none !important; }
          .main-region { margin-left: var(--sidebar-width); }
          .main-region.sidebar-collapsed { margin-left: var(--sidebar-collapsed); }
        }
        @media (max-width: 768px) {
          .content-area { padding: 16px; }
        }

        /* ── Global Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--slate-200); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--slate-300); }

        /* ── Utility ── */
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
        button { font-family: var(--font-body); }
        a { text-decoration: none; }
      `}</style>

      <div className="layout-shell">
        <div
          className={`mobile-overlay ${sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <div className={`sidebar-region ${sidebarOpen ? "mobile-open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
          <Sidebar
            mobileOpen={sidebarOpen}
            onCollapsedChange={(c) => {
              setSidebarCollapsed(c);
              const main = document.getElementById("main-region");
              if (main) {
                c ? main.classList.add("sidebar-collapsed") : main.classList.remove("sidebar-collapsed");
              }
            }}
          />
        </div>

        <div className="main-region" id="main-region">
          <div className={mounted ? "enter-navbar" : ""} style={{ position: "sticky", top: 0, zIndex: 100 }}>
            <Navbar toggle={toggleSidebar} />
          </div>
          <main className={`content-area ${mounted ? "enter-content" : ""}`}>
            <div className="page-wrapper" key={location.pathname}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
