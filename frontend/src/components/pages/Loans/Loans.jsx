import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Loans() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const loans = [
    { name: "Ravi Kumar", type: "Personal Loan", amount: 120000, emi: 5200, pending: 8, status: "Running" },
    { name: "Sita Devi", type: "Education Loan", amount: 200000, emi: 6400, pending: 12, status: "Running" },
    { name: "Arun Sharma", type: "Advance Salary", amount: 30000, emi: 5000, pending: 2, status: "Closing" }
  ];

  // Filtered loans based on search and status
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchesSearch =
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.type.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  // Summary calculations
  const totalLoan = filteredLoans.reduce((acc, l) => acc + l.amount, 0);
  const totalEMI = filteredLoans.reduce((acc, l) => acc + l.emi, 0);
  const activeLoans = filteredLoans.filter(l => l.status === "Running").length;

  const statusClasses = (status) =>
    status === "Running"
      ? "bg-green-100 text-green-700"
      : status === "Closing"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Employee Loans</h2>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by Name or Type"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2 w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2 w-full md:w-1/4 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="All">All Status</option>
          <option value="Running">Running</option>
          <option value="Closing">Closing</option>
        </select>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div whileHover={{ scale: 1.03 }} className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
          <h4 className="text-gray-600 font-medium mb-2">Total Loan</h4>
          <p className="text-2xl font-bold text-blue-600">₹{totalLoan.toLocaleString()}</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
          <h4 className="text-gray-600 font-medium mb-2">Monthly EMI</h4>
          <p className="text-2xl font-bold text-purple-600">₹{totalEMI.toLocaleString()}</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
          <h4 className="text-gray-600 font-medium mb-2">Active Loans</h4>
          <p className="text-2xl font-bold text-green-600">{activeLoans}</p>
        </motion.div>
      </div>

      {/* LOAN TABLE */}
      <div className="overflow-x-auto">
        <AnimatePresence>
          <motion.table
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-w-full bg-white rounded-2xl shadow-md divide-y divide-gray-200"
          >
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Name</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Type</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Amount</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">EMI</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Pending</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLoans.map((l, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="px-4 py-3">{l.type}</td>
                  <td className="px-4 py-3">₹{l.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">₹{l.emi.toLocaleString()}</td>
                  <td className="px-4 py-3">{l.pending}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses(l.status)}`}>
                      {l.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        </AnimatePresence>
      </div>
    </div>
  );
}
