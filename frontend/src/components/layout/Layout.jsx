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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sidebar-width: 260px;
          --sidebar-collapsed: 80px;
          --nav-height: 64px;

          /* ── Warm Lemon / Orange / White Palette ── */
          --bg-base: #fff5f8;
          --bg-surface: #FFFFFF;
          --bg-hover: #FFF8E6;
          --bg-active: #FFF3CC;

          --brand: #f50b0b;
          --brand-dark: #d93006;
          --brand-deeper: #b40909;
          --brand-light: #fec7c7;
          --brand-glow: rgba(245, 19, 11, 0.18);
          --brand-border: rgba(245,158,11,0.25);

          --accent-pink: #f91616;
          --accent-pink-bg: #FFF7ED;
          --accent-pink-border: rgba(249, 22, 22, 0.2);

          --accent-lemon: #ea0808;
          --accent-lemon-bg: #fef5e8;

          --accent-green: #16A34A;
          --accent-green-bg: #F0FDF4;
          --accent-red: #DC2626;
          --accent-red-bg: #FEF2F2;
          --accent-blue: #0EA5E9;
          --accent-blue-bg: #F0F9FF;
          --accent-purple: #9333EA;
          --accent-purple-bg: #FAF5FF;

          --text-primary: #1C1507;
          --text-secondary: #5C4A1E;
          --text-muted: #A38A4A;
          --text-disabled: #D4C4A0;

          --border: #F0E4C0;
          --border-light: #FAF4E2;

          --shadow-xs: 0 1px 2px rgba(180,83,9,0.04);
          --shadow-sm: 0 1px 4px rgba(180,83,9,0.06), 0 1px 2px rgba(180,83,9,0.04);
          --shadow-md: 0 4px 12px rgba(180,83,9,0.08), 0 2px 4px rgba(180,83,9,0.04);
          --shadow-lg: 0 12px 28px rgba(180,83,9,0.10), 0 4px 10px rgba(180,83,9,0.05);
          --shadow-xl: 0 20px 44px rgba(180,83,9,0.12);
          --shadow-brand: 0 4px 14px rgba(245,158,11,0.28);

          --r-xs: 6px;
          --r-sm: 8px;
          --r-md: 10px;
          --r-lg: 14px;
          --r-xl: 18px;
          --r-2xl: 24px;
          --r-full: 999px;

          --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;

          --ease-spring: cubic-bezier(0.34,1.4,0.64,1);
          --ease-out: cubic-bezier(0.16,1,0.3,1);
          --dur-fast: 120ms;
          --dur-base: 200ms;
          --dur-slow: 340ms;
          --dur-enter: 480ms;
        }

        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-body);
          background: var(--bg-base);
          color: var(--text-primary);
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          line-height: 1.55;
        }

        .layout-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg-base);
          overflow-x: hidden;
        }

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

        .main-region {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-width: 0;
          margin-left: var(--sidebar-width);
          transition: margin-left var(--dur-slow) var(--ease-out);
        }
        .main-region.sidebar-collapsed { margin-left: var(--sidebar-collapsed); }

        .content-area {
          flex: 1;
          padding: 28px 32px;
          overflow-y: auto;
        }

        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

      
        .enter-navbar  { animation: fadeDown var(--dur-enter) var(--ease-out) 80ms both; }
        .enter-content { animation: fadeUp var(--dur-enter) var(--ease-out) 160ms both; }
        .page-wrapper  { animation: fadeUp 280ms var(--ease-out) both; }
        .main-region {
  width: 100%;
}

.content-area {
  width: 100%;
}
  .sidebar-region {
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 1024px) {
  .sidebar-region {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: var(--sidebar-width);
    
    transform: translateX(-100%);
    transition: transform 0.3s ease;

    z-index: 1001; /* ABOVE overlay */
  }

  .sidebar-region.mobile-open {
    transform: translateX(0);
  }
}
       .mobile-overlay {
  display: none;
}

.mobile-overlay.visible {
  display: block;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000; /* BELOW sidebar */
}
  @media (max-width: 1024px) {
  .sidebar-region {
    transform: translateX(-100%);
    width: var(--sidebar-width);
  }

  .sidebar-region.mobile-open {
    transform: translateX(0);
  }

  .main-region {
    margin-left: 0 !important;
  }
}
        @media (max-width: 768px) {
          .content-area { padding: 20px 16px; }
        }
        @media (min-width: 1025px) {
  .sidebar-region {
    transform: none !important;
  }
}
  @media (min-width: 1025px) {
  .main-region {
    margin-left: var(--sidebar-width);
  }

  .main-region.sidebar-collapsed {
    margin-left: var(--sidebar-collapsed);
  }
}

@media (max-width: 1024px) {
  .main-region {
    margin-left: 0 !important;
  }
}

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

        .sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
      `}</style>

      <div className="layout-shell">
        <div
          className={`mobile-overlay ${sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

       <div
  className={`sidebar-region 
    ${sidebarOpen ? "mobile-open" : ""} 
    ${sidebarCollapsed ? "collapsed" : ""} id="sidebar-region"`}
>
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
