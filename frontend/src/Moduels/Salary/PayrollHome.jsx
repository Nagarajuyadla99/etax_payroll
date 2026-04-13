import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Layers,
  FileText,
  Users,
  Calculator,
  CalendarRange,
  Play,
  Zap,
  PieChart,
  Table2,
  FileSpreadsheet,
  Percent,
  Download,
  Search,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import FeatureCard from "./components/FeatureCard";

/** @typedef {'new' | 'frequent' | 'important'} ModuleBadge */
/** @typedef {'salary' | 'processing' | 'reports'} SectionId */

/**
 * Config-driven module list — routes unchanged from original PayrollHome.
 * @type {Array<{ id: string, title: string, description: string, route: string, icon: import('lucide-react').LucideIcon, section: SectionId, badge?: ModuleBadge }>}
 */
const MODULES = [
  {
    id: "salary-components",
    title: "Salary Components",
    description: "Create and manage earnings and deduction components.",
    route: "/salary/components",
    icon: Layers,
    section: "salary",
    badge: "frequent",
  },
  {
    id: "salary-templates",
    title: "Salary Templates",
    description: "Build salary structures using components.",
    route: "/salary/templates",
    icon: FileText,
    section: "salary",
  },
  {
    id: "employee-salary-structure",
    title: "Employee Salary Structure",
    description: "Assign salary templates to employees.",
    route: "/employeesalarystructure",
    icon: Users,
    section: "salary",
    badge: "important",
  },
  {
    id: "salary-calculator",
    title: "Salary Calculator",
    description: "Preview salary breakdown for employees.",
    route: "/salary/preview",
    icon: Calculator,
    section: "salary",
  },
  {
    id: "pay-periods",
    title: "Pay Periods",
    description: "Create and manage payroll pay periods.",
    route: "/pay-periods",
    icon: CalendarRange,
    section: "processing",
  },
  {
    id: "payroll-runs",
    title: "Payroll Runs",
    description: "Create payroll runs for pay periods.",
    route: "/payroll-runs",
    icon: Play,
    section: "processing",
    badge: "frequent",
  },
  {
    id: "process-payroll",
    title: "Process Payroll",
    description: "Run payroll calculation for employees.",
    route: "/process-payroll",
    icon: Zap,
    section: "processing",
    badge: "important",
  },
  {
    id: "payroll-summary",
    title: "Payroll Summary",
    description: "View payroll totals and statistics.",
    route: "/summary",
    icon: PieChart,
    section: "processing",
  },
  {
    id: "payroll-register",
    title: "Payroll View",
    description: "View employee payroll earnings and deductions.",
    route: "/register",
    icon: Table2,
    section: "processing",
  },
  {
    id: "payslips",
    title: "Payslips",
    description: "Download employee payslips.",
    route: "/payslip",
    icon: Download,
    section: "processing",
  },
  {
    id: "salary-statement",
    title: "Salary Statement",
    description: "Component-wise salary breakdown.",
    route: "/salary-statement",
    icon: FileSpreadsheet,
    section: "reports",
  },
  {
    id: "tds-summary",
    title: "TDS Summary",
    description: "View taxable salary and TDS deductions.",
    route: "/tds-summary",
    icon: Percent,
    section: "reports",
  },
];

const SECTIONS = [
  {
    id: "salary",
    title: "Salary Setup",
    subtitle: "Components, templates, and employee compensation structures.",
  },
  {
    id: "processing",
    title: "Payroll Processing",
    subtitle: "Periods, runs, processing, and operational payroll outputs.",
  },
  {
    id: "reports",
    title: "Reports & Insights",
    subtitle: "Statements, compliance views, and payroll analytics.",
  },
];

/** Placeholder stats — wire to API when available */
const QUICK_STATS = [
  { label: "Total Employees", value: "—", hint: "Organisation" },
  { label: "Active Payroll Runs", value: "—", hint: "Open periods" },
  { label: "This Month Processed", value: "—", hint: "Completed runs" },
  { label: "Pending Tasks", value: "—", hint: "Action items" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function PayrollHome() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULES;
    return MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [query]);

  const sectionsWithItems = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      items: filteredModules.filter((m) => m.section === section.id),
    })).filter((s) => s.items.length > 0);
  }, [filteredModules]);

  return (
    <div className="min-w-0 w-full bg-slate-50/80 pb-6 pt-4 sm:pb-8 sm:pt-5 md:pb-10">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 border-b border-slate-200/90 pb-6 sm:mb-8 sm:pb-7"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1
                className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
                style={{ fontFamily: "var(--font-display, ui-serif, Georgia, serif)" }}
              >
                Payroll Management
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
                Configure salary structures, run payroll, and review reports from one place.
              </p>
            </div>
            <div className="relative w-full max-w-md shrink-0 lg:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search modules…"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Filter payroll modules"
              />
            </div>
          </div>
        </motion.header>

        {/* Quick stats */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:mb-10 lg:grid-cols-4"
        >
          {QUICK_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p
                className="mt-2 text-2xl font-semibold tabular-nums text-slate-900"
                style={{ fontFamily: "var(--font-display, ui-serif, Georgia, serif)" }}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{stat.hint}</p>
            </div>
          ))}
        </motion.section>

        {/* Sectioned modules */}
        {sectionsWithItems.length === 0 ? (
          <div
            className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-600"
            role="status"
          >
            No modules match &quot;{query}&quot;. Try another search term.
          </div>
        ) : (
          <div className="flex flex-col gap-10 sm:gap-12 lg:gap-14">
            {sectionsWithItems.map((section) => (
              <section key={section.id} aria-labelledby={`section-${section.id}`}>
                <div className="mb-4 sm:mb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={`section-${section.id}`}
                      className="text-lg font-semibold text-slate-900 sm:text-xl"
                    >
                      {section.title}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                      {section.items.length}
                    </span>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm text-slate-600">{section.subtitle}</p>
                </div>

                <motion.div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  key={`${section.id}-${query}`}
                >
                  {section.items.map((mod) => (
                    <motion.div key={mod.id} variants={itemVariants}>
                      <FeatureCard
                        title={mod.title}
                        description={mod.description}
                        icon={mod.icon}
                        badge={mod.badge}
                        onClick={() => nav(mod.route)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            ))}
          </div>
        )}

        {/* Footer hint for reports */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.25 }}
          className="mt-10 flex items-center gap-2 text-xs text-slate-500 sm:mt-12"
        >
          <BarChart3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span>
            Tip: Use the search to jump to a module. All navigation paths are unchanged.
          </span>
        </motion.p>
      </div>
    </div>
  );
}
