import { useState } from "react";

export default function AttendanceBulkUpload() {

  const [data, setData] = useState([]);

  const handleFile = (e) => {
    const file = e.target.files[0];

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split("\n").slice(1);

      const parsed = rows.map(row => {
        const [empId, month, presentDays] = row.split(",");
        return {
          empId,
          month,
          presentDays
        };
      });

      setData(parsed);
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold">
          Attendance Bulk Upload
        </h2>
        <p className="text-sm text-gray-500">
          Upload CSV file for bulk attendance
        </p>
      </div>

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="mb-6"
      />

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-semibold mb-4">Parsed Records</h3>

        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Employee ID</th>
              <th className="border p-2">Month</th>
              <th className="border p-2">Present Days</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, index) => (
              <tr key={index}>
                <td className="border p-2">{d.empId}</td>
                <td className="border p-2">{d.month}</td>
                <td className="border p-2">{d.presentDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
