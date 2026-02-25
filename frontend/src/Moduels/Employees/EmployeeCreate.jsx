import React, { useState } from "react";
import EmployeeForm from "./EmployeeForm";
import { createEmployee } from "./EmployeeApi";

export default function EmployeeCreate({ onSuccess }) {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate(data) {
    setLoading(true);
    setError(null);

    try {
      const result = await createEmployee(data, token);

      alert("✅ Employee created successfully");

      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message || "Failed to create employee");
    } finally {
      setLoading(false);
    }
  }

 return (
  <div className="w-full min-h-screen bg-gray-100">

    <div className="w-full bg-white shadow-md p-8">

      <div className="mb-6 border-b pb-4">
        <h2 className="text-3xl font-bold text-gray-800">
          Create Employee
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Enter employee details to add new employee
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <EmployeeForm
        onSubmit={handleCreate}
        loading={loading}
      />

      {loading && (
        <div className="mt-4 text-blue-600 text-sm">
          Creating employee...
        </div>
      )}

    </div>
  </div>
);
}