import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "./EmployeeApi";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const nav = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const data = await getEmployees();
        setEmployees(data);
      } catch (err) {
        console.error("Employee fetch error:", err);

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          nav("/");
        } else {
          setError("Failed to load employees");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [nav]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Employees</h2>

      {loading && (
        <div className="text-gray-500 text-sm">Loading employees...</div>
      )}

      {error && (
        <div className="text-red-500 text-sm mb-4">{error}</div>
      )}

      {!loading && employees.length === 0 && (
        <div className="text-gray-500 text-sm">
          No employees found.
        </div>
      )}

      {!loading && employees.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 font-semibold">Full Name</th>
                <th className="p-3 font-semibold">Email</th>
                <th className="p-3 font-semibold">Phone</th>
                <th className="p-3 font-semibold">Joining Date</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.employee_id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">
                    {emp.first_name} {emp.middle_name || ""} {emp.last_name}
                  </td>

                  <td className="p-3">
                    {emp.email || "-"}
                  </td>

                  <td className="p-3">
                    {emp.phone || emp.mobile_phone || "-"}
                  </td>

                  <td className="p-3">
                    {emp.date_of_joining
                      ? new Date(emp.date_of_joining).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}