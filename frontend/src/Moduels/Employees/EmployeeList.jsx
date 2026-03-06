import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "./EmployeeApi";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const nav = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const data = await getEmployees();
        setEmployees(data);
        setFilteredEmployees(data);
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

  // Filter employees based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEmployees(employees);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = employees.filter((emp) =>
        `${emp.first_name} ${emp.middle_name || ""} ${emp.last_name}`
          .toLowerCase()
          .includes(term)
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Employees</h2>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search employees by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full md:w-1/4 mb-4 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading && (
        <div className="text-gray-500 text-sm">Loading employees...</div>
      )}

      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

      {!loading && filteredEmployees.length === 0 && (
        <div className="text-gray-500 text-sm">No employees found.</div>
      )}

      {!loading && filteredEmployees.length > 0 && (
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
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.employee_id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">
                    {emp.first_name} {emp.middle_name || ""} {emp.last_name}
                  </td>
                  <td className="p-3">{emp.email || "-"}</td>
                  <td className="p-3">{emp.phone || emp.mobile_phone || "-"}</td>
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