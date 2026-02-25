import React, { useEffect, useState } from "react";
import { fetchEmployees } from "./EmployeeApi";

export default function EmployeeList() {

  const token = localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const data = await fetchEmployees(token);
      setEmployees(data);
    } catch (err) {
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-100 p-6">

      <div className="w-full bg-white shadow-sm p-6">

        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Employee List
        </h2>

        {loading && <p>Loading employees...</p>}

        {error && (
          <div className="text-red-600 mb-4">
            {error}
          </div>
        )}

        {!loading && employees.length === 0 && (
          <p>No employees found.</p>
        )}

        {!loading && employees.length > 0 && (
          <div className="overflow-x-auto">

            <table className="w-full border-collapse">

              <thead>
                <tr className="bg-gray-200 text-left">
                  <th className="p-3 border">First Name</th>
                  <th className="p-3 border">Last Name</th>
                  <th className="p-3 border">Email</th>
                  <th className="p-3 border">Mobile</th>
                  <th className="p-3 border">Date of Joining</th>
                  <th className="p-3 border">Annual CTC</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{emp.first_name}</td>
                    <td className="p-3 border">{emp.last_name}</td>
                    <td className="p-3 border">{emp.email}</td>
                    <td className="p-3 border">{emp.mobile}</td>
                    <td className="p-3 border">{emp.date_of_joining}</td>
                    <td className="p-3 border">{emp.annual_ctc}</td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </div>
    </div>
  );
}