import { useState, useMemo } from "react";

export default function PayrollEngine() {

  // 🔹 Dummy Salary Components (Later comes from DB)
  const components = [
    { name: "Basic", type: "Earning", calculation: "Fixed", value: 30000 },
    { name: "HRA", type: "Earning", calculation: "Percentage", value: 40 },
    { name: "Bonus", type: "Earning", calculation: "Fixed", value: 5000 },
    { name: "PF", type: "Deduction", calculation: "Percentage", value: 12 },
    { name: "Professional Tax", type: "Deduction", calculation: "Fixed", value: 200 }
  ];

  const [basicSalary, setBasicSalary] = useState(30000);

  // 🔹 Auto Calculation Logic
  const breakdown = useMemo(() => {

    let earnings = [];
    let deductions = [];

    components.forEach(comp => {

      let amount = 0;

      if (comp.calculation === "Fixed") {
        amount = comp.value;
      } else if (comp.calculation === "Percentage") {
        amount = (basicSalary * comp.value) / 100;
      }

      if (comp.type === "Earning") {
        earnings.push({ ...comp, amount });
      } else {
        deductions.push({ ...comp, amount });
      }

    });

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netSalary = totalEarnings - totalDeductions;

    return { earnings, deductions, totalEarnings, totalDeductions, netSalary };

  }, [basicSalary]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="w-full bg-white p-6 rounded-2xl shadow">

        <h2 className="text-xl font-semibold mb-6">
          Payroll Calculation Engine
        </h2>

        <div className="mb-6">
          <label className="text-sm text-gray-500">Basic Salary</label>
          <input
            type="number"
            value={basicSalary}
            onChange={(e) => setBasicSalary(Number(e.target.value))}
            className="border px-3 py-2 rounded-xl w-full"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Earnings */}
          <div>
            <h3 className="font-semibold mb-3 text-green-600">Earnings</h3>
            {breakdown.earnings.map(e => (
              <div key={e.name} className="flex justify-between border-b py-2 text-sm">
                <span>{e.name}</span>
                <span>₹{e.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold mt-3">
              <span>Total Earnings</span>
              <span>₹{breakdown.totalEarnings.toLocaleString()}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="font-semibold mb-3 text-red-600">Deductions</h3>
            {breakdown.deductions.map(d => (
              <div key={d.name} className="flex justify-between border-b py-2 text-sm">
                <span>{d.name}</span>
                <span>₹{d.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold mt-3">
              <span>Total Deductions</span>
              <span>₹{breakdown.totalDeductions.toLocaleString()}</span>
            </div>
          </div>

        </div>

        <div className="mt-8 p-4 bg-indigo-50 rounded-xl text-center">
          <p className="text-lg font-semibold">
            Net Salary: ₹{breakdown.netSalary.toLocaleString()}
          </p>
        </div>

      </div>
    </div>
  );
}
