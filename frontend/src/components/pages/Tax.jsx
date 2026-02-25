import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TaxSlabTable() {
  const [tab, setTab] = useState("emp");
  const [search, setSearch] = useState("");
  const [schemeType, setSchemeType] = useState("All");

  const employeeSlabs = [
    { range: "0 – 3,00,000", rate: "0%" },
    { range: "3,00,001 – 6,00,000", rate: "5%" },
    { range: "6,00,001 – 9,00,000", rate: "10%" },
    { range: "9,00,001 – 12,00,000", rate: "15%" },
    { range: "12,00,001 – 15,00,000", rate: "20%" },
    { range: "Above 15,00,000", rate: "30%" }
  ];

  const company = [
    { head: "Employer PF", value: "12% of Basic" },
    { head: "Gratuity", value: "4.81%" },
    { head: "ESI", value: "3.25%" },
    { head: "Professional Tax", value: "As per state" }
  ];

  const schemes = [
    { name: "National Pension System (NPS)", benefit: "Retirement corpus with tax deduction 80CCD", type: "Pension" },
    { name: "Atal Pension Yojana", benefit: "Guaranteed pension after 60 years", type: "Pension" },
    { name: "Employees Provident Fund", benefit: "Long term savings with interest", type: "Saving" },
    { name: "Pradhan Mantri Mudra Loan", benefit: "Low interest business loan", type: "Loan" },
    { name: "Stand‑Up India", benefit: "Loan for SC/ST/Women entrepreneurs", type: "Loan" },
    { name: "Public Provident Fund", benefit: "15 year tax free savings", type: "Saving" },
    { name: "Sukanya Samriddhi", benefit: "Girl child savings scheme", type: "Saving" }
  ];

  const recent = [
    "Standard deduction increased",
    "New tax regime default",
    "Higher NPS employer limit"
  ];

  // Filtered data
  const filteredSchemes = useMemo(() => {
    return schemes.filter(s => 
      (schemeType === "All" || s.type === schemeType) &&
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, schemeType]);

  const filteredEmp = useMemo(() => {
    return employeeSlabs.filter(e => e.range.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const filteredComp = useMemo(() => {
    return company.filter(c => c.head.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const tabClasses = (t) =>
    `px-4 py-2 rounded-lg font-medium transition ${
      tab === t
        ? "bg-blue-600 text-white"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Tax & Government Schemes
      </h2>

      {/* TABS */}
      <div className="flex flex-wrap justify-center gap-4 mb-4">
        <button className={tabClasses("emp")} onClick={() => setTab("emp")}>Employee Slabs</button>
        <button className={tabClasses("com")} onClick={() => setTab("com")}>Company</button>
        <button className={tabClasses("gov")} onClick={() => setTab("gov")}>Govt Schemes</button>
        <button className={tabClasses("rec")} onClick={() => setTab("rec")}>Recent</button>
      </div>

      {/* SEARCH */}
      {tab !== "rec" && (
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full md:w-1/3"
          />

          {tab === "gov" && (
            <select
              value={schemeType}
              onChange={e => setSchemeType(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="All">All Types</option>
              <option value="Pension">Pension</option>
              <option value="Saving">Saving</option>
              <option value="Loan">Loan</option>
            </select>
          )}
        </div>
      )}

      {/* CONTENT */}
      <div className="space-y-6">

        {/* Employee Slabs */}
        <AnimatePresence>
          {tab === "emp" && (
            <motion.div
              key="emp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {filteredEmp.map((e, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-md p-4 flex justify-between"
                >
                  <span className="font-medium">{e.range}</span>
                  <span className="text-blue-600 font-semibold">{e.rate}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Company */}
        <AnimatePresence>
          {tab === "com" && (
            <motion.div
              key="com"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {filteredComp.map((c, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-md p-4 flex justify-between border-l-4 border-green-400"
                >
                  <span className="font-medium">{c.head}</span>
                  <span className="text-green-600 font-semibold">{c.value}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Govt Schemes */}
        <AnimatePresence>
          {tab === "gov" && (
            <motion.div
              key="gov"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {filteredSchemes.map((s, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-white rounded-2xl shadow-md p-4 border-l-4 ${
                    s.type === "Pension"
                      ? "border-purple-500"
                      : s.type === "Saving"
                      ? "border-blue-500"
                      : "border-green-500"
                  }`}
                >
                  <h4 className="font-semibold text-gray-700">{s.name}</h4>
                  <p className="text-gray-600 text-sm mt-1">{s.benefit}</p>
                  <span
                    className={`mt-2 inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      s.type === "Pension"
                        ? "bg-purple-100 text-purple-700"
                        : s.type === "Saving"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {s.type}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent */}
        <AnimatePresence>
          {tab === "rec" && (
            <motion.ul
              key="rec"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2 max-w-xl mx-auto"
            >
              {recent.map((r, i) => (
                <motion.li
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl shadow p-3 flex items-center gap-2"
                >
                  <span className="text-blue-600 font-bold">•</span>
                  <span className="text-gray-700">{r}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
