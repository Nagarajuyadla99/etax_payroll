const API = "http://127.0.0.1:8000/attendance/";

export async function fetchAttendance() {
  const res = await fetch(API);   
  if (!res.ok) throw new Error("Failed to fetch attendance");
  return res.json();
}

export async function createAttendance(data) {
  const res = await fetch(API, {   
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create attendance");
  }

  return res.json();
}