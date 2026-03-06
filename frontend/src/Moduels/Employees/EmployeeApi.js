import API from "../../services/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getEmployees = async () => {
  const { data } = await API.get("/employees/", getAuthHeaders());
  return data;
};

export const createEmployee = async (payload) => {
  const { data } = await API.post("/employees/", payload, getAuthHeaders());
  return data;
};

export const bulkUploadEmployees = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await API.post(
    "/employees/bulk-upload",
    formData,
    {
      headers: {
        ...getAuthHeaders().headers,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
};

export const fetchFKData = async () => {
  const [orgRes, deptRes, desigRes, locRes, mgrRes, payRes] = await Promise.all([
    API.get("/organisations/"), // list of organisations
    API.get("/departments/"),   // list of departments
    API.get("/designations/"),  // list of designations
    API.get("/locations/"),     // list of locations
    API.get("/employees/"),     // list of employees (for manager dropdown)
    API.get("/pay_structures/") // list of pay structures
  ]);

  return {
    organisations: orgRes.data,
    departments: deptRes.data,
    designations: desigRes.data,
    locations: locRes.data,
    managers: mgrRes.data,
    pay_structures: payRes.data,
  };
};