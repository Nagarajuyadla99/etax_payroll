import API from "../../services/api";

export const getEmployees = async () => {
  const { data } = await API.get("/employees/");
  return data;
};

export const createEmployee = async (payload) => {
  const { data } = await API.post("/employees/", payload);
  return data;
};

export const deleteEmployee = async (id) => {
  const { data } = await API.delete(`/employees/${id}`);
  return data;
};

export const updateEmployee = async (id, data) => {
  const { data: updatedEmployee } = await API.put(`/employees/${id}`, data);
  return updatedEmployee;
};

export const bulkUploadEmployees = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await API.post("/employees/bulk-upload", formData);

  return data;
};

export const fetchFKData = async () => {
  const [orgRes, deptRes, desigRes, locRes, mgrRes, payRes] = await Promise.all([
    API.get("/organisations/"),
    API.get("/departments/"),
    API.get("/designations/"),
    API.get("/locations/"),
    API.get("/employees/"),
    API.get("/pay_structures/"),
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
