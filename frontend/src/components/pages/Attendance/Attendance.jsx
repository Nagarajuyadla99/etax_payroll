import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Attendance() {

  const [emp, setEmp] = useState("");
  const [present, setPresent] = useState("");
  const [month, setMonth] = useState("");

  const [records, setRecords] = useState([
    { id: 1, emp: "E101", month: "January", present: 20 },
    { id: 2, emp: "E102", month: "January", present: 22 },
    { id: 3, emp: "E103", month: "February", present: 18 }
  ]);

  const save = () => {
    if (!emp || !present || !month) {
      alert("Fill all fields");
      return;
    }

    const newRec = {
      id: Date.now(),
      emp,
      month,
      present
    };

    setRecords([newRec, ...records]);

    setEmp("");
    setPresent("");
    setMonth("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-lg p-6 mb-8"
      >
        <h2 className="text-2xl font-bold text-gray-800">
           Attendance Management
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Track and manage employee monthly attendance
        </p>
      </motion.div>


      {/* FORM CARD */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-lg p-6 mb-8"
      >

        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Add Attendance
        </h3>

        <div className="grid md:grid-cols-4 gap-4">

          <input
            className="border rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Employee ID"
            value={emp}
            onChange={e => setEmp(e.target.value)}
          />

          <input
            className="border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
            placeholder="Month"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />

          <input
            type="number"
            className="border rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-400 outline-none"
            placeholder="Present Days"
            value={present}
            onChange={e => setPresent(e.target.value)}
          />

          <button
            onClick={save}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition shadow-md"
          >
            Save
          </button>

        </div>
      </motion.div>


      {/* RECORDS GRID */}
      <div className="grid md:grid-cols-3 gap-6">

        <AnimatePresence>
          {records.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              whileHover={{ scale: 1.03 }}
              className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500"
            >
              <h4 className="text-lg font-semibold text-gray-700">
                {r.emp}
              </h4>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-indigo-600">
                    Month:
                  </span>{" "}
                  {r.month}
                </p>

                <p>
                  <span className="font-medium text-purple-600">
                    Present Days:
                  </span>{" "}
                  {r.present}
                </p>
              </div>

              <div className="mt-4 bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg">
                Attendance Recorded
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

      </div>

    </div>
  );
}
