import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/salary-v2/components", label: "Components" },
  { to: "/salary-v2/groups", label: "Groups" },
  { to: "/salary-v2/derived-variables", label: "Derived Variables" },
  { to: "/salary-v2/statutory", label: "Statutory Config" },
  { to: "/salary-v2/preview", label: "Preview" },
];

export default function SalaryV2Home() {
  return (
    <div className="bw-page">
      <header className="bw-page-header">
        <h1 className="bw-page-title">Salary Engine (v2)</h1>
        <p className="bw-page-subtitle">
          Configure reusable pay lines, group them for templates, define derived variables, statutory rules, and preview calculations.
        </p>
      </header>

      <nav className="bw-subnav" aria-label="Salary engine sections">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `bw-subnav-link${isActive ? " active" : ""}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="bw-panel">
        <Outlet />
      </div>
    </div>
  );
}
