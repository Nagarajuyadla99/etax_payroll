import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { calculateEmployeeSalary } from "./SalaryApi";

export default function SalaryPreview() {

  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    loadSalary();
  }, [id]);

  async function loadSalary() {

    try {

      const res = await calculateEmployeeSalary(id);

      setData(res.salary_breakdown);

    } catch (err) {

      console.error("Salary calculation failed", err);

    }

  }

  if (!data) {
    return <div className="p-6">Loading salary preview...</div>;
  }

  return (

    <div className="p-6 max-w-3xl">

      <h1 className="text-2xl font-semibold mb-6">
        Salary Preview
      </h1>

      {/* Summary Card */}

      <div className="grid grid-cols-3 gap-4 mb-8">

        <div className="border rounded-lg p-4 bg-green-50">
          <p className="text-sm text-gray-600">Gross Salary</p>
          <p className="text-lg font-semibold">
            {data.gross_salary}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-sm text-gray-600">Deductions</p>
          <p className="text-lg font-semibold">
            {data.total_deductions}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-sm text-gray-600">Net Salary</p>
          <p className="text-lg font-semibold">
            {data.net_salary}
          </p>
        </div>

      </div>

      {/* Earnings Table */}

      <h2 className="text-lg font-semibold mb-3">
        Earnings
      </h2>

      <table className="w-full border mb-8">

        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border text-left">Component</th>
            <th className="p-2 border text-right">Amount</th>
          </tr>
        </thead>

        <tbody>

          {Object.entries(data.earnings).map(([name, amount]) => (

            <tr key={name}>

              <td className="p-2 border">
                {name}
              </td>

              <td className="p-2 border text-right">
                {amount}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

      {/* Deductions Table */}

      <h2 className="text-lg font-semibold mb-3">
        Deductions
      </h2>

      <table className="w-full border">

        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border text-left">Component</th>
            <th className="p-2 border text-right">Amount</th>
          </tr>
        </thead>

        <tbody>

          {Object.entries(data.deductions).map(([name, amount]) => (

            <tr key={name}>

              <td className="p-2 border">
                {name}
              </td>

              <td className="p-2 border text-right">
                {amount}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );
}