import { useState } from "react";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function PayRuns() {
  const [status, setStatus] = useState("Draft");
  const [history, setHistory] = useState([
    {
      id: 1,
      month: "Feb 2025",
      employees: 100,
      totalPaid: 520000,
      status: "Completed"
    }
  ]);

  const employeesCount = 100;
  const avgSalary = 5200; // demo average
  const totalPayroll = employeesCount * avgSalary;

  /* ---------------- PROCESS PAY RUN ---------------- */

  const processPayRun = () => {
    if (status === "Completed") return;

    setStatus("Processing");

    setTimeout(() => {
      setStatus("Completed");

      const newRun = {
        id: Date.now(),
        month: "March 2025",
        employees: employeesCount,
        totalPaid: totalPayroll,
        status: "Completed"
      };

      setHistory([newRun, ...history]);
    }, 2000);
  };

  /* ---------------- STATUS BADGE ---------------- */

  const StatusBadge = ({ value }) => {
    const styles = {
      Draft: "bg-gray-100 text-gray-700",
      Processing: "bg-yellow-100 text-yellow-700",
      Completed: "bg-green-100 text-green-700"
    };

    return (
      <span className={`px-3 py-1 text-xs rounded-full font-medium ${styles[value]}`}>
        {value}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-2xl font-semibold text-blue-900">
         Pay Runs Management
      </h2>

      {/* CURRENT PAY RUN CARD */}
      <div className="bg-white p-6 rounded-2xl shadow border space-y-3">

        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">March 2025 Pay Run</h3>
          <StatusBadge value={status} />
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Employees</p>
            <p className="font-semibold">{employeesCount}</p>
          </div>

          <div>
            <p className="text-gray-500">Estimated Payroll</p>
            <p className="font-semibold">
              ₹{totalPayroll.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Average Salary</p>
            <p className="font-semibold">
              ₹{avgSalary.toLocaleString()}
            </p>
          </div>
        </div>

        <button
          onClick={processPayRun}
          disabled={status === "Processing" || status === "Completed"}
          className={`mt-4 px-4 py-2 rounded-xl text-white transition 
          ${
            status === "Completed"
              ? "bg-green-600"
              : status === "Processing"
              ? "bg-yellow-600"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {status === "Draft" && "Process Pay Run"}
          {status === "Processing" && "Processing..."}
          {status === "Completed" && "Completed"}
        </button>
      </div>

      {/* HISTORY TABLE */}
      <div className="bg-white rounded-2xl shadow border overflow-hidden">
        <div className="p-4 border-b font-semibold">
          Pay Run History
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-4 text-left">Month</th>
              <th className="p-4 text-left">Employees</th>
              <th className="p-4 text-left">Total Paid</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {history.map((run) => (
              <tr key={run.id} className="border-t hover:bg-gray-50">
                <td className="p-4">{run.month}</td>
                <td className="p-4">{run.employees}</td>
                <td className="p-4 font-semibold">
                  ₹{run.totalPaid.toLocaleString()}
                </td>
                <td className="p-4">
                  <StatusBadge value={run.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ALERTS / PENDING */}
      <div className="bg-white p-6 rounded-2xl shadow border">
        <h3 className="font-semibold mb-3">Pending Payroll Alerts</h3>

        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-yellow-700">
            <AlertCircle size={16} /> 2 Employees – Bank details missing
          </li>
          <li className="flex items-center gap-2 text-red-700">
            <AlertCircle size={16} /> 3 Employees – PAN not verified
          </li>
          <li className="flex items-center gap-2 text-blue-700">
            <Clock size={16} /> 1 Employee – New joiner
          </li>
        </ul>
      </div>

    </div>
  );
}
