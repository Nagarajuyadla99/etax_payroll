import { useState, useMemo } from "react";

export default function ProcessPayroll() {

  const [cycle] = useState("March 2025");
  const [status, setStatus] = useState("Draft");

  const [form, setForm] = useState({
    emp: "",
    basic: "",
    hra: "",
    bonus: "",
    pf: "",
    tax: ""
  });

  const [records, setRecords] = useState([]);

  const num = (v) => Number(v || 0);

  const calculateNet = () => {
    const gross = num(form.basic) + num(form.hra) + num(form.bonus);
    const deductions = num(form.pf) + num(form.tax);
    return gross - deductions;
  };

  const processPayroll = () => {
    if (status !== "Draft") return;

    if (!form.emp || !form.basic) {
      alert("Employee ID and Basic Salary required");
      return;
    }

    const gross = num(form.basic) + num(form.hra) + num(form.bonus);
    const deductions = num(form.pf) + num(form.tax);

    const record = {
      id: Date.now(),
      emp: form.emp,
      gross,
      deductions,
      net: gross - deductions
    };

    setRecords([...records, record]);

    setForm({
      emp: "",
      basic: "",
      hra: "",
      bonus: "",
      pf: "",
      tax: ""
    });
  };

  const summary = useMemo(() => {
    const totalGross = records.reduce((s, r) => s + r.gross, 0);
    const totalDeduction = records.reduce((s, r) => s + r.deductions, 0);
    const totalNet = records.reduce((s, r) => s + r.net, 0);

    return {
      totalEmployees: records.length,
      totalGross,
      totalDeduction,
      totalNet
    };
  }, [records]);

  const approvePayroll = () => {
    if (!records.length) return alert("No payroll to approve");
    setStatus("Approved");
  };

  const lockPayroll = () => {
    if (status !== "Approved") return;
    setStatus("Locked");
  };

  const statusStyles = {
    Draft: "bg-yellow-100 text-yellow-700",
    Approved: "bg-green-100 text-green-700",
    Locked: "bg-red-100 text-red-700"
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl shadow-md p-6 flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            Enterprise Payroll Processing
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Cycle: {cycle}
          </p>
        </div>

        <span className={`px-4 py-1 rounded-full text-sm font-semibold ${statusStyles[status]}`}>
          {status}
        </span>
      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">
          Add Employee Payroll
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <input
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Employee ID"
            value={form.emp}
            onChange={(e) => setForm({ ...form, emp: e.target.value })}
          />

          <input
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Basic Salary"
            value={form.basic}
            onChange={(e) => setForm({ ...form, basic: e.target.value })}
          />

          <input
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="HRA"
            value={form.hra}
            onChange={(e) => setForm({ ...form, hra: e.target.value })}
          />

          <input
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Bonus"
            value={form.bonus}
            onChange={(e) => setForm({ ...form, bonus: e.target.value })}
          />

          <input
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="PF Deduction"
            value={form.pf}
            onChange={(e) => setForm({ ...form, pf: e.target.value })}
          />

          <input
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Tax"
            value={form.tax}
            onChange={(e) => setForm({ ...form, tax: e.target.value })}
          />
        </div>

        <div className="mt-4 font-semibold text-gray-700">
          Net Pay Preview: ₹ {calculateNet().toLocaleString()}
        </div>

        <button
          disabled={status !== "Draft"}
          onClick={processPayroll}
          className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg font-medium transition"
        >
          Add To Payroll
        </button>
      </div>

      {/* SUMMARY CARD */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">

        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-gray-500 text-sm">Total Employees</p>
          <h4 className="text-xl font-bold mt-1">{summary.totalEmployees}</h4>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-gray-500 text-sm">Total Gross</p>
          <h4 className="text-xl font-bold mt-1">
            ₹ {summary.totalGross.toLocaleString()}
          </h4>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-gray-500 text-sm">Total Deductions</p>
          <h4 className="text-xl font-bold mt-1">
            ₹ {summary.totalDeduction.toLocaleString()}
          </h4>
        </div>

        <div className="bg-blue-50 rounded-2xl shadow-md p-5">
          <p className="text-blue-600 text-sm">Total Net Pay</p>
          <h4 className="text-xl font-bold text-blue-700 mt-1">
            ₹ {summary.totalNet.toLocaleString()}
          </h4>
        </div>
      </div>

      {/* ACTION CARD */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">

        {status === "Draft" && (
          <button
            onClick={approvePayroll}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Approve Payroll
          </button>
        )}

        {status === "Approved" && (
          <button
            onClick={lockPayroll}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Lock Payroll
          </button>
        )}
      </div>

      {/* RECORD CARDS */}
      <div className="grid md:grid-cols-3 gap-6">

        {records.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition"
          >
            <h4 className="text-lg font-semibold text-gray-700">
              {r.emp}
            </h4>

            <div className="flex justify-between mt-3 text-sm text-gray-600">
              <span>Gross</span>
              <span>₹ {r.gross.toLocaleString()}</span>
            </div>

            <div className="flex justify-between mt-1 text-sm text-gray-600">
              <span>Deductions</span>
              <span>₹ {r.deductions.toLocaleString()}</span>
            </div>

            <div className="mt-4 border-t pt-3 flex justify-between font-semibold text-blue-700">
              <span>Net Pay</span>
              <span>₹ {r.net.toLocaleString()}</span>
            </div>
          </div>
        ))}

      </div>

    </div>
  );
}
