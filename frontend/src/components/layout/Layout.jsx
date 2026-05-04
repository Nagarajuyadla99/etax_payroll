import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import "../../styles/Layout.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState({ isMobile: false, isTablet: false, isDesktop: true });
  const location = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth || 0;
      const isMobile = w <= 768;
      const isTablet = w > 768 && w <= 1024;
      setViewport({ isMobile, isTablet, isDesktop: w > 1024 });
      if (!isMobile) setSidebarOpen(false);
      if (isMobile) setSidebarCollapsed(false);
    };
    compute();
    window.addEventListener("resize", compute, { passive: true });
    return () => window.removeEventListener("resize", compute);
  }, []);

  const toggleSidebar = () => {
    if (viewport.isMobile) {
      setSidebarOpen((v) => !v);
      return;
    }
    setSidebarCollapsed((v) => {
      const next = !v;
      const main = document.getElementById("main-region");
      if (main) {
        next ? main.classList.add("sidebar-collapsed") : main.classList.remove("sidebar-collapsed");
      }
      return next;
    });
  };

  return (
    <>
      {/* KEEP YOUR STYLE BLOCK AS IS */}
      
      <div className="layout-shell">

        <div
          className={`mobile-overlay ${viewport.isMobile && sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <div
          className={`sidebar-region ${viewport.isMobile && sidebarOpen ? "mobile-open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}
        >
          <Sidebar
            mobileOpen={sidebarOpen}
            isMobile={viewport.isMobile}
            onRequestClose={() => setSidebarOpen(false)}
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
          <div
            className={`layout-navbar-wrap ${mounted ? "enter-navbar" : ""}`}
            style={{ position: "sticky", top: 0, zIndex: 100 }}
          >
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