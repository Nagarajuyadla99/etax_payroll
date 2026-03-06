import {
  Users,
  IndianRupee,
  TrendingDown,
  ShieldCheck,
  FileCheck,
  Zap,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getEmployees } from "../../Moduels/Employees/EmployeeApi"; 


export default function Dashboard() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees", error);
    }
  };

  fetchEmployees();
}, []);

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">
          Payroll – India
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          PF • ESI • TDS • Professional Tax • Indian Compliance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<Users size={28} />}
          title="Total Employees"
          value={employees.length}
          sub="12 new this month"
          bg="bg-gradient-to-r from-blue-700 to-blue-500"
        />
        <StatCard
          icon={<IndianRupee size={28} />}
          title="Net Pay – Feb"
          value="₹19,84,500"
          sub="Credited 01-Feb-2025"
          bg="bg-gradient-to-r from-emerald-700 to-emerald-500"
        />
        <StatCard
          icon={<TrendingDown size={28} />}
          title="Total Deductions"
          value="₹2,46,200"
          sub="PF • ESI • TDS • PT"
          bg="bg-gradient-to-r from-rose-700 to-rose-500"
        />
        <StatCard
          icon={<ShieldCheck size={28} />}
          title="Compliance Due"
          value="7"
          sub="Returns & Filings"
          bg="bg-gradient-to-r from-amber-600 to-amber-400"
        />
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Section title="Payroll Status" icon={<FileCheck className="text-indigo-700" />} headColor="bg-indigo-50">
          <StatusRow label="Salary Processed" val="142 / 156" type="success" />
          <StatusRow label="Bank File" val="Generated" type="success" />
          <StatusRow label="Payslips Email" val="Pending" type="warning" />
          <StatusRow label="PF Return" val="Due 14 Feb" type="danger" />
          <StatusRow label="ESI Return" val="Due 15 Feb" type="danger" />
          <StatusRow label="TDS Payment" val="Due 07 Feb" type="danger" />
        </Section>

        <Section title="Quick Actions" icon={<Zap className="text-emerald-700" />} headColor="bg-emerald-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ActionBtn title="Add Employee" color="indigo" />
            <ActionBtn title="Generate Payslip" color="green" />
            <ActionBtn title="Tax Declaration" color="blue" />
            <ActionBtn title="Leave Import" color="amber" />
            <ActionBtn title="PF Report" color="purple" />
            <ActionBtn title="ESI Report" color="rose" />
          </div>
        </Section>

        <Section title="Alerts" icon={<AlertTriangle className="text-rose-700" />} headColor="bg-rose-50">
          <AlertBox text="5 employees missing Bank Account" level="danger" />
          <AlertBox text="2 employees missing PAN" level="warning" />
          <AlertBox text="PF return pending" level="danger" />
          <AlertBox text="PT due 20 Feb" level="info" />
        </Section>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border shadow-sm mt-6 overflow-x-auto">
        <div className="p-4 border-b flex items-center gap-2 bg-slate-700 text-white">
          <Clock className="text-white" />
          <h3 className="font-semibold">Recent Transactions</h3>
        </div>

        <table className="w-full text-sm min-w-max">
          <thead className="bg-slate-100 text-slate-700">
            <tr className="text-left">
              <th className="p-3">Employee</th>
              <th className="p-3">Action</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>

          <tbody>
            {data.map((a, i) => (
              <tr key={i} className="border-t hover:bg-blue-50 transition">
                <td className="p-3 font-medium text-slate-800">{a.emp}</td>
                <td className="p-3">
                  <Chip text={a.action} />
                </td>
                <td className="p-3">
                  <Amount text={a.amount} />
                </td>
                <td className="p-3 text-slate-500">{a.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Reusable Components ================= */
function Section({ title, icon, children, headColor }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className={`p-4 border-b flex items-center gap-2 ${headColor}`}>
        {icon}
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-4 space-y-3 text-sm">{children}</div>
    </div>
  );
}

function StatCard({ icon, title, value, sub, bg }) {
  return (
    <div className={`${bg} text-white rounded-xl p-5 shadow-lg`}>
      <div className="bg-white/20 w-12 h-12 flex items-center justify-center rounded-lg mb-3">
        {icon}
      </div>
      <p className="text-sm opacity-90">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{sub}</p>
    </div>
  );
}

function StatusRow({ label, val, type }) {
  const colors = {
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
    info: "bg-blue-100 text-blue-800",
  };
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-700">{label}</span>
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[type]}`}>{val}</span>
    </div>
  );
}

function ActionBtn({ title, color }) {
  const map = {
    indigo: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
    green: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
    blue: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    amber: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    purple: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    rose: "bg-rose-50 hover:bg-rose-100 border-rose-200",
  };
  return (
    <button className={`border rounded p-2 text-sm transition font-medium ${map[color]}`}>
      {title}
    </button>
  );
}

function AlertBox({ text, level }) {
  const map = {
    danger: "bg-rose-50 text-rose-800 border-rose-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  };
  return (
    <div className={`p-2 rounded border font-medium ${map[level]}`}>• {text}</div>
  );
}

function Chip({ text }) {
  const color = text.includes("Salary")
    ? "bg-emerald-100 text-emerald-800"
    : text.includes("Full")
    ? "bg-purple-100 text-purple-800"
    : "bg-blue-100 text-blue-800";
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>{text}</span>;
}

function Amount({ text }) {
  return (
    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded">{text}</span>
  );
}

const data = [
  { emp: "Ramesh Patil", action: "Salary Credited", amount: "₹48,500", date: "02 Feb 2025" },
  { emp: "Priya Nair", action: "Reimbursement", amount: "₹4,200", date: "03 Feb 2025" },
  { emp: "Amit Verma", action: "Full & Final", amount: "₹72,900", date: "04 Feb 2025" },
];