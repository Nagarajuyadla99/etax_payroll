import { useNavigate } from "react-router-dom";

export default function PayrollHome() {

  const nav = useNavigate();

  return (
    <div className="p-6">

      <h1 className="text-2xl font-semibold mb-6">
        Payroll Management
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">

        {/* Salary Components */}
        <div
          onClick={() => nav("/salary/components")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Salary Components
          </h2>

          <p className="text-gray-600 text-sm">
            Create and manage earnings and deduction components.
          </p>
        </div>

        {/* Salary Templates */}
        <div
          onClick={() => nav("/salary/templates")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Salary Templates
          </h2>

          <p className="text-gray-600 text-sm">
            Build salary structures using components.
          </p>
        </div>

        {/* Employee Salary Structure */}
        <div
          onClick={() => nav("/employeesalarystructure")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Employee Salary Structure
          </h2>

          <p className="text-gray-600 text-sm">
            Assign salary templates to employees.
          </p>
        </div>

        {/* Salary Calculator */}
        <div
          onClick={() => nav("/salary/preview")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Salary Calculator
          </h2>

          <p className="text-gray-600 text-sm">
            Preview salary breakdown for employees.
          </p>
        </div>

        {/* Pay Periods */}
        <div
          onClick={() => nav("/pay-periods")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Pay Periods
          </h2>

          <p className="text-gray-600 text-sm">
            Create and manage payroll pay periods.
          </p>
        </div>

        {/* Payroll Runs */}
        <div
          onClick={() => nav("/payroll-runs")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Payroll Runs
          </h2>

          <p className="text-gray-600 text-sm">
            Create payroll runs for pay periods.
          </p>
        </div>

        {/* Process Payroll */}
        <div
          onClick={() => nav("/process-payroll")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Process Payroll
          </h2>

          <p className="text-gray-600 text-sm">
            Run payroll calculation for employees.
          </p>
        </div>

        {/* Payroll Summary */}
        <div
          onClick={() => nav("/summary")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Payroll Summary
          </h2>

          <p className="text-gray-600 text-sm">
            View payroll totals and statistics.
          </p>
        </div>

        {/* Payroll Register */}
        <div
          onClick={() => nav("/register")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Payroll View
          </h2>

          <p className="text-gray-600 text-sm">
            View employee payroll earnings and deductions.
          </p>
        </div>

        {/* Salary Statement */}
        <div
          onClick={() => nav("/salary-statement")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Salary Statement
          </h2>

          <p className="text-gray-600 text-sm">
            Component-wise salary breakdown.
          </p>
        </div>

        {/* TDS Summary */}
        <div
          onClick={() => nav("/tds-summary")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            TDS Summary
          </h2>

          <p className="text-gray-600 text-sm">
            View taxable salary and TDS deductions.
          </p>
        </div>

        {/* Payslips */}
        <div
          onClick={() => nav("/payslip")}
          className="border rounded-lg p-6 shadow hover:shadow-lg cursor-pointer bg-white"
        >
          <h2 className="text-lg font-semibold mb-2">
            Payslips
          </h2>

          <p className="text-gray-600 text-sm">
            Download employee payslips.
          </p>
        </div>

      </div>

    </div>
  );
}