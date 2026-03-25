import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { calculateEmployeeSalary } from "./SalaryApi";

export default function SalaryPreview() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadSalary();
    }
  }, [id]);

  async function loadSalary() {
  try {
    setLoading(true);
    setError(null);

    const res = await calculateEmployeeSalary(id);

    console.log("FINAL RESPONSE:", res);

    const salaryData = res?.salary_breakdown;

    if (!salaryData) {
      throw new Error("salary_breakdown missing");
    }

    setData(salaryData);
  } catch (err) {
    console.error("Salary calculation failed:", err);
    setError("Failed to load salary preview");
  } finally {
    setLoading(false);
  }
}

  // 🔄 Loading
  if (loading) {
    return <div className="p-6">Loading salary preview...</div>;
  }

  // ❌ Error
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  // ⚠️ No Data
  if (!data) {
    return <div className="p-6">No salary data available</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">
        Salary Preview
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4 bg-green-50">
          <p className="text-sm text-gray-600">Gross Salary</p>
          <p className="text-lg font-semibold">
            ₹ {data.gross_salary ?? 0}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-sm text-gray-600">Deductions</p>
          <p className="text-lg font-semibold">
            ₹ {data.total_deductions ?? 0}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-blue-50">
          <p className="text-sm text-gray-600">Net Salary</p>
          <p className="text-lg font-semibold">
            ₹ {data.net_salary ?? 0}
          </p>
        </div>
      </div>

      {/* Earnings */}
      <h2 className="text-lg font-semibold mb-3">Earnings</h2>

      <div className="overflow-x-auto mb-8">
        <table className="w-full border rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-left">Component</th>
              <th className="p-2 border text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {data.earnings && Object.keys(data.earnings).length > 0 ? (
              Object.entries(data.earnings).map(([name, amount]) => (
                <tr key={name}>
                  <td className="p-2 border">{name}</td>
                  <td className="p-2 border text-right">
                    ₹ {amount ?? 0}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="text-center p-4">
                  No earnings data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Deductions */}
      <h2 className="text-lg font-semibold mb-3">Deductions</h2>

      <div className="overflow-x-auto">
        <table className="w-full border rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-left">Component</th>
              <th className="p-2 border text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {data.deductions && Object.keys(data.deductions).length > 0 ? (
              Object.entries(data.deductions).map(([name, amount]) => (
                <tr key={name}>
                  <td className="p-2 border">{name}</td>
                  <td className="p-2 border text-right">
                    ₹ {amount ?? 0}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="text-center p-4">
                  No deductions data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}