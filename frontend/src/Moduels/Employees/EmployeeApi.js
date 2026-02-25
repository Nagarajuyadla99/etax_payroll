const BASE_URL = "http://127.0.0.1:8000";

export async function fetchEmployees(token) {

    const res = await fetch(`${BASE_URL}/employees/`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) {
        throw new Error("Failed to fetch employees");
    }

    return res.json();
}


export async function createEmployee(employeeData, token) {

    const res = await fetch(`${BASE_URL}/employees/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(employeeData)
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to create employee");
    }

    return res.json();
}