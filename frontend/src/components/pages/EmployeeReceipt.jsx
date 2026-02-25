import React from "react";
import "../../styles/EmployeeRecords.css";

const defaultData = {
  name: "Ravi Kumar",
  email: "ravi.kumar@example.com",
  role: "Software Engineer",
  company: "vidyaYug Technologies Pvt Ltd",
  salary: 50000,
  pf: 1800,
  houseAllowance: 8000,
  insurance: 1200
};

export default function EmployeeReceipt({ data }) {
  const info = data ? data : defaultData;

  const handlePrint = () => {
    window.print();
  };

  const remaining =
    Number(info.salary || 0) -
    (Number(info.pf || 0) +
      Number(info.insurance || 0) +
      Number(info.houseAllowance || 0));

  return (
    <div className="receipt-container">
      <h2 className="receipt-title">Employee Salary Receipt</h2>

      <div className="receipt-grid">
        <div>
          <p className="receipt-label">Employee Name</p>
          <p>{info.name}</p>
        </div>

        <div>
          <p className="receipt-label">Email</p>
          <p>{info.email}</p>
        </div>

        <div>
          <p className="receipt-label">Role</p>
          <p>{info.role}</p>
        </div>

        <div>
          <p className="receipt-label">Company Name</p>
          <p>{info.company}</p>
        </div>
      </div>

      <div className="salary-section">
        <div className="salary-row">
          <span>Salary</span>
          <span>₹{info.salary}</span>
        </div>

        <div className="salary-row">
          <span>PF Deduction</span>
          <span>- ₹{info.pf}</span>
        </div>

        <div className="salary-row">
          <span>House Allowance</span>
          <span>- ₹{info.houseAllowance}</span>
        </div>

        <div className="salary-row">
          <span>Insurance Deduction</span>
          <span>- ₹{info.insurance}</span>
        </div>

        <div className="salary-row salary-total">
          <span>Remaining Credit Amount</span>
          <span>₹{remaining}</span>
        </div>
      </div>

      <div className="text-center">
        <button onClick={handlePrint} className="print-btn">
          Print Receipt
        </button>
      </div>
    </div>
  );
}
