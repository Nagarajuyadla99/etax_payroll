import { useState } from "react";

export default function DailyAttendance() {

  const daysInMonth = 30;

  const [attendance, setAttendance] = useState({});

  const toggleDay = (day) => {
    setAttendance({
      ...attendance,
      [day]: attendance[day] === "Present" ? "Absent" : "Present"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Calendar Attendance
        </h2>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {[...Array(daysInMonth)].map((_, index) => {
          const day = index + 1;
          const status = attendance[day];

          return (
            <div
              key={day}
              onClick={() => toggleDay(day)}
              className={`cursor-pointer p-4 text-center rounded-lg shadow-md
                ${status === "Present" ? "bg-green-200" :
                status === "Absent" ? "bg-red-200" :
                "bg-white"}`}
            >
              <div className="font-semibold">{day}</div>
              <div className="text-xs mt-1">
                {status || "Mark"}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
