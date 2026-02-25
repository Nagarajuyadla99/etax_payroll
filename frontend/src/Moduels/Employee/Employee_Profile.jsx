import { useState } from "react";

export default function EmployeeProfile() {

  const [employee] = useState({
    id: "EMP001",
    name: "Ravi Kumar",
    email: "ravi@example.com",
    phone: "9876543210",
    department: "Engineering",
    designation: "Software Developer",
    joiningDate: "2024-04-15",
    status: "Active"
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-6">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">
            Employee Profile
          </h2>
          <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700">
            {employee.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {[
            ["Employee ID", employee.id],
            ["Full Name", employee.name],
            ["Email", employee.email],
            ["Phone", employee.phone],
            ["Department", employee.department],
            ["Designation", employee.designation],
            ["Joining Date", employee.joiningDate]
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="font-medium text-slate-800">{value}</p>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
