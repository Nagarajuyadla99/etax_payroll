import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function EmployeeSelector() {

  const [employees, setEmployees] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {

    const token = localStorage.getItem("token");

    try {

      const res = await axios.get(
        "http://127.0.0.1:9000/api/employees/",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setEmployees(res.data);

    } catch (error) {

      console.error("Failed to load employees", error);

    }

  }

  return (

    <div className="p-6">

      <h1 className="text-xl font-semibold mb-6">
        Select Employee
      </h1>

      <table className="w-full border">

        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>

        <tbody>

          {employees.map(emp => (

            <tr key={emp.employee_id}>

              <td className="p-2 border">
                {emp.first_name} {emp.last_name}
              </td>

              <td className="p-2 border">

                <button
                  onClick={() => nav(`/salary/preview/${emp.employee_id}`)}
                  className="bg-blue-600 text-white px-4 py-1 rounded"
                >
                  Preview Salary
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );
}