const API = "http://127.0.0.1:9000/api/attendance/";

// 🔹 Fetch Attendance (Protected)
export async function fetchAttendance() {
  const token = localStorage.getItem("token");

  const res = await fetch(API, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch attendance");
  }

  return res.json();
}

// 🔹 Create Attendance (Protected - Admin Only)
export async function createAttendance(data) {
  const token = localStorage.getItem("token");

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,   // ✅ IMPORTANT
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create attendance");
  }

  return res.json();
}