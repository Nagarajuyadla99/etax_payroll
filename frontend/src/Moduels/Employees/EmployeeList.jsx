import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees, deleteEmployee } from "./EmployeeApi";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const nav = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // SEARCH
  useEffect(() => {
    const term = searchTerm.toLowerCase();

    const filtered = employees.filter((emp) =>
      `${emp.first_name} ${emp.middle_name || ""} ${emp.last_name}`
        .toLowerCase()
        .includes(term)
    );

    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchTerm, employees]);

  // PAGINATION
  const lastIndex = currentPage * rowsPerPage;
  const firstIndex = lastIndex - rowsPerPage;

  const currentEmployees = filteredEmployees.slice(firstIndex, lastIndex);

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee?")) return;

    try {
      await deleteEmployee(id);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Employee List</h2>

        <div className="flex gap-3">

          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-2 rounded text-sm"
          />

          <button
            onClick={() => nav("/employees/create")}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm"
          >
            Add Employee
          </button>

        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Joining Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="5" className="p-4 text-center">
                  Loading employees...
                </td>
              </tr>
            )}

            {!loading &&
              currentEmployees.map((emp) => (
                <tr key={emp.employee_id} className="border-t">

                  <td className="p-3">
                    {emp.first_name} {emp.middle_name || ""} {emp.last_name}
                  </td>

                  <td className="p-3">{emp.work_email || "-"}</td>

                  <td className="p-3">
                    {emp.phone || emp.mobile_phone || "-"}
                  </td>

                  <td className="p-3">
                    {emp.date_of_joining
                      ? new Date(emp.date_of_joining).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="p-3 flex gap-2">

                    <button
                      onClick={() => nav(`/employees/edit/${emp.employee_id}`)}
                      className="text-red-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(emp.employee_id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>

                  </td>

                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center mt-4">

        {/* Showing records */}
        <div className="text-sm text-gray-600">
          Showing {firstIndex + 1}–
          {Math.min(lastIndex, filteredEmployees.length)} of{" "}
          {filteredEmployees.length} employees
        </div>

        {/* Rows per page */}
        <div className="flex items-center gap-2 text-sm">
          Rows:
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2">

          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="border px-2 py-1 rounded"
          >
            {"<"}
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded border ${
                currentPage === i + 1
                  ? "bg-red-600 text-white"
                  : ""
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="border px-2 py-1 rounded"
          >
            {">"}
          </button>

        </div>
      </div>

    </div>
  );
}