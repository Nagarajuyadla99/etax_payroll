import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Search,
  Users,
  Wallet,
  Briefcase,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";

export default function EmployeesTableAnimated() {

  //  Simulated Logged-in Role (Change to test: Admin / HR / Employee)
  const [currentUserRole] = useState("Admin");

  //  Role Permission Matrix (Backend-ready structure)
  const permissions = {
    Admin: {
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canViewSalary: true
    },
    HR: {
      canAdd: true,
      canEdit: true,
      canDelete: false,
      canViewSalary: true
    },
    Employee: {
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canViewSalary: false
    }
  };

  const roleAccess = permissions[currentUserRole];

  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    role: "",
    salary: ""
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [data, setData] = useState([
    { id: 1, name: "Ravi Kumar", email: "ravi@company.com", role: "Developer", salary: 45000 },
    { id: 2, name: "Anita Rao", email: "anita@company.com", role: "HR", salary: 38000 },
    { id: 3, name: "Mohan Das", email: "mohan@company.com", role: "Tester", salary: 32000 },
    { id: 4, name: "Sneha Reddy", email: "sneha@company.com", role: "Designer", salary: 40000 },
    { id: 5, name: "Kiran Patel", email: "kiran@company.com", role: "Accountant", salary: 42000 },
    { id: 6, name: "Arun Sharma", email: "arun@company.com", role: "Manager", salary: 60000 },
    { id: 7, name: "Priya Nair", email: "priya@company.com", role: "Support", salary: 30000 },
    { id: 8, name: "Vijay Singh", email: "vijay@company.com", role: "DevOps", salary: 52000 },
    { id: 9, name: "Deepa Joshi", email: "deepa@company.com", role: "QA Lead", salary: 48000 },
    { id: 10, name: "Rahul Mehta", email: "rahul@company.com", role: "Admin", salary: 35000 }
  ]);

  const handle = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const saveEmployee = () => {
    if (!form.name || !form.email) return;

    if (isEdit) {
      setData(data.map(emp =>
        emp.id === form.id
          ? { ...form, salary: Number(form.salary) }
          : emp
      ));
    } else {
      setData([
        ...data,
        { ...form, id: Date.now(), salary: Number(form.salary) }
      ]);
    }
    resetForm();
  };

  const editEmployee = (emp) => {
    setForm(emp);
    setIsEdit(true);
    setShowForm(true);
  };

  const deleteEmployee = (id) =>
    setData(data.filter(emp => emp.id !== id));

  const resetForm = () => {
    setForm({ id: null, name: "", email: "", role: "", salary: "" });
    setShowForm(false);
    setIsEdit(false);
  };

  const processedData = useMemo(() => {
    let filtered = data.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase())
    );
    filtered.sort((a, b) =>
      sortOrder === "asc"
        ? a.salary - b.salary
        : b.salary - a.salary
    );
    return filtered;
  }, [data, search, sortOrder]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPayroll = data.reduce(
    (sum, e) => sum + Number(e.salary),
    0
  );

  const avgSalary =
    data.length > 0
      ? Math.round(totalPayroll / data.length)
      : 0;

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            Employee Management
          </h2>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">
            Logged in as: {currentUserRole}
          </span>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex items-center bg-gray-100 px-3 py-2 rounded-xl">
            <Search size={16} className="mr-2 text-gray-500" />
            <input
              placeholder="Search..."
              className="bg-transparent outline-none text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {roleAccess.canAdd && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl"
            >
              <UserPlus size={16} /> Add
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatCard icon={<Users />} title="Total Employees" value={data.length} />
        <StatCard icon={<Wallet />} title="Total Payroll" value={`₹${totalPayroll.toLocaleString()}`} />
        <StatCard icon={<Briefcase />} title="Average Salary" value={`₹${avgSalary.toLocaleString()}`} />
      </div>

      {/* FORM */}
      {showForm && roleAccess.canAdd && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow border space-y-4"
        >
          <div className="grid md:grid-cols-4 gap-4">
            <input name="name" placeholder="Name" value={form.name} onChange={handle} className="border px-3 py-2 rounded-xl" />
            <input name="email" placeholder="Email" value={form.email} onChange={handle} className="border px-3 py-2 rounded-xl" />
            <input name="role" placeholder="Role" value={form.role} onChange={handle} className="border px-3 py-2 rounded-xl" />
            <input name="salary" placeholder="Salary" type="number" value={form.salary} onChange={handle} className="border px-3 py-2 rounded-xl" />
          </div>
          <div className="flex gap-3">
            <button onClick={saveEmployee} className="bg-indigo-600 text-white px-4 py-2 rounded-xl">
              {isEdit ? "Update" : "Save"}
            </button>
            <button onClick={resetForm} className="bg-gray-200 px-4 py-2 rounded-xl">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Role</th>
              <th
                className="p-4 text-left cursor-pointer flex items-center gap-2"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                Salary <ArrowUpDown size={14} />
              </th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            <AnimatePresence>
              {paginatedData.map(emp => (
                <motion.tr
                  key={emp.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-4">{emp.name}</td>
                  <td className="p-4">{emp.email}</td>
                  <td className="p-4">{emp.role}</td>
                  <td className="p-4 font-semibold">
                    {roleAccess.canViewSalary
                      ? `₹${emp.salary.toLocaleString()}`
                      : "Confidential"}
                  </td>
                  <td className="p-4 flex gap-3">
                    {roleAccess.canEdit && (
                      <Pencil size={16} className="cursor-pointer text-blue-600" onClick={() => editEmployee(emp)} />
                    )}
                    {roleAccess.canDelete && (
                      <Trash2 size={16} className="cursor-pointer text-red-600" onClick={() => deleteEmployee(emp.id)} />
                    )}
                    {!roleAccess.canEdit && !roleAccess.canDelete && (
                      <span className="text-gray-400 text-xs">No Actions</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-between items-center p-4 border-t">
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-3">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft size={18} />
            </button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow border flex items-center gap-4"
    >
      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-xl font-semibold">{value}</h3>
      </div>
    </motion.div>
  );
}
