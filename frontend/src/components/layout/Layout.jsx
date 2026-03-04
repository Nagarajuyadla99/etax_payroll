import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import "../../styles/Layout.css"; // custom support css

export default function Layout() {
  return (
    <div className="layout-wrapper">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="main-content">
        <Navbar />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}