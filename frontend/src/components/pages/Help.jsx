import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const helpSections = [
  {
    title: "Payroll Guide",
    content: [
      "Enter basic salary, allowances and deductions to process payroll.",
      "Net pay is calculated automatically.",
      "Processed records appear in history table."
    ]
  },
  {
    title: "Employee Module",
    content: [
      "Add employee profile with role and email.",
      "View salary receipt and print.",
      "Update deductions like PF, insurance."
    ]
  },
  {
    title: "Government Schemes",
    content: [
      "NPS – retirement pension savings.",
      "EPF – provident fund benefit.",
      "Mudra Loan – business support."
    ]
  },
  {
    title: "Need More Support?",
    content: ["Email: support@company.com", "Phone: +91 00000 00000"]
  }
];

export default function HelpAccordion() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-3xl font-bold text-indigo-600 mb-4">
        Help & Support
      </h2>

      <div className="space-y-3">
        {helpSections.map((section, i) => (
          <div key={i} className="bg-white rounded-2xl shadow border overflow-hidden">
            
            {/* CARD HEADER */}
            <button
              onClick={() => toggle(i)}
              className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-indigo-50 transition-colors"
            >
              <span className="text-xl font-semibold">{section.title}</span>
              <span className="text-indigo-600 font-bold text-lg">
                {openIndex === i ? "−" : "+"}
              </span>
            </button>

            {/* COLLAPSIBLE CONTENT */}
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-6 pb-4 text-gray-700"
                >
                  <ul className="list-disc list-inside space-y-1">
                    {section.content.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        ))}
      </div>
    </div>
  );
}
