import { normalizeAttendanceStatus } from "./attendanceApi";

export default function AttendanceTable({ data, employeeNameById = {} }) {

  if (!data || data.length === 0) {
    return <div className="mt-4">No attendance records found.</div>;
  }

  return (
    <table className="w-full mt-0">
      <thead className="sticky top-0 z-10">
        <tr className="bg-gray-200">
          <th className="border p-2">Employee Name</th>
          <th className="border p-2">Employee ID</th>
          <th className="border p-2">Date</th>
          <th className="border p-2">Check In</th>
          <th className="border p-2">Check Out</th>
          <th className="border p-2">Hours</th>
          <th className="border p-2">Status</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item) => (
          <tr key={item.attendance_id}>
            <td className="border p-2 font-medium text-slate-900">
              {employeeNameById[String(item.employee_id)] || "—"}
            </td>
            <td className="border p-2 text-slate-600">{item.employee_id}</td>
            <td className="border p-2">{item.work_date}</td>
            <td className="border p-2">{item.time_in}</td>
            <td className="border p-2">{item.time_out}</td>
            <td className="border p-2">{item.work_hours}</td>
            <td className="border p-2">{normalizeAttendanceStatus(item.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}