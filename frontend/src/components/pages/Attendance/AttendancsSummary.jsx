import { useState } from "react";

export default function AttendanceSummary() {

  const basicSalary = 30000;
  const totalWorkingDays = 30;
  const presentDays = 24;

  const perDaySalary = basicSalary / totalWorkingDays;
  const deduction = (totalWorkingDays - presentDays) * perDaySalary;
  const finalSalary = basicSalary - deduction;

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6">
          Payroll Auto Deduction (Based on Attendance)
        </h2>

        <div className="space-y-3 text-gray-700">
          <p>Basic Salary: ₹{basicSalary}</p>
          <p>Total Working Days: {totalWorkingDays}</p>
          <p>Present Days: {presentDays}</p>
          <p className="text-red-600">
            Deduction: ₹{deduction.toFixed(2)}
          </p>
          <p className="text-green-600 font-semibold text-lg">
            Final Salary: ₹{finalSalary.toFixed(2)}
          </p>
        </div>
      </div>

    </div>
  );
}
