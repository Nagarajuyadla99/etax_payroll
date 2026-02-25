import { useEffect, useState } from "react";
import AttendanceForm from "./AttendanceForm";
import AttendanceTable from "./AttendanceTable";
import { fetchAttendance } from "./attendanceApi";

export default function AttendancePage() {

  const [attendance, setAttendance] = useState([]);

  const loadAttendance = async () => {
    const data = await fetchAttendance();
    setAttendance(data);
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  return (
    <div className="p-6">

      <AttendanceForm reload={loadAttendance} />

      <AttendanceTable data={attendance} />

    </div>
  );
}
