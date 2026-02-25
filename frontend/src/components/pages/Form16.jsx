import React, { useState } from "react";
import { motion } from "framer-motion";
import form16 from "../assets/images/Form16.png";

export default function Form16() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    age: "",
    pan: "",
    aadhar: "",
    dob: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form16 Data:", form);
    alert("Form16 details submitted successfully!");
  };

  // Framer Motion variants
  const cardVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.4 }
    })
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex justify-center items-start p-8">
      
      <motion.div
        className="bg-white rounded-3xl shadow-xl w-full max-w-3xl p-8"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >

        <motion.h2
          className="text-2xl font-bold text-gray-800 mb-6 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Form-16 Filing Application
        </motion.h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ROW 1 */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { label: "Name", name: "name", type: "text", placeholder: "Enter Name", required: true },
              { label: "Email", name: "email", type: "email", placeholder: "Enter Email", required: true }
            ].map((field, i) => (
              <motion.div
                key={field.name}
                className="flex flex-col"
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
              >
                <label className="mb-2 font-medium text-gray-700">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </motion.div>
            ))}
          </div>

          {/* ROW 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { label: "Age", name: "age", type: "number", placeholder: "Enter Age" },
              { label: "Date of Birth", name: "dob", type: "date", placeholder: "" }
            ].map((field, i) => (
              <motion.div
                key={field.name}
                className="flex flex-col"
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
              >
                <label className="mb-2 font-medium text-gray-700">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </motion.div>
            ))}
          </div>

          {/* ROW 3 */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { label: "PAN Number", name: "pan", type: "text", placeholder: "ABCDE1234F", maxLength: 10 },
              { label: "Aadhaar Number", name: "aadhar", type: "text", placeholder: "XXXX-XXXX-XXXX", maxLength: 12 }
            ].map((field, i) => (
              <motion.div
                key={field.name}
                className="flex flex-col"
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
              >
                <label className="mb-2 font-medium text-gray-700">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </motion.div>
            ))}
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col md:flex-row gap-4 mt-4 justify-center">

            <motion.button
              type="submit"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <img src={form16} alt="form16" className="w-6 h-6" />
              Submit Form16
            </motion.button>

            <motion.button
              type="button"
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl shadow-md transition"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <img src={form16} alt="form16" className="w-6 h-6" />
              Form16
            </motion.button>

          </div>

        </form>

      </motion.div>
    </div>
  );
}
