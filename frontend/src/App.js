import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./components/pages/Login";
import Dashboard from "./components/pages/Dashboard";
import Payroll from "./components/pages/Payroll";
import Form16 from "./components/pages/Form16";
import Layout from "./components/layout/Layout";
import Protected from "./components/Protected";
import Payruns from "./components/pages/Payruns";
import Approvals from "./components/pages/Approvals/Approvals";
import Loans from "./components/pages/Loans/Loans";
import EmployeeCreate from "./Moduels/Employees/EmployeeCreate";
import EmployeeList from "./Moduels/Employees/EmployeeList";
import EmployeeForm from "./Moduels/Employees/EmployeeForm";
import EmployeeBulkUpload from "./Moduels/Employees/EmployeeBulkUpload";
import Tax from "./components/pages/Tax";
import NoticeBoard from "./components/layout/NoticeBoard";
import Help from "./components/pages/Help";
import AttendancePage from "./Moduels/attendance/AttendancePage";

// Salary
import Component from "./Moduels/Salary/SalaryComponent";
import PayStructure from "./Moduels/Salary/PayStracture";
import SalaryTemplate from "./Moduels/Salary/SalaryTemplate";
import SalaryEngine from "./Moduels/Salary/PayrollEngine";

// Attendance
import AttendanceSummary from "./components/pages/Attendance/AttendancsSummary";
import AttendanceTable from "../src/Moduels/attendance/AttendanceTable";
import LeaveApproval from "./components/pages/Attendance/LeaveApproval";

// Bank
import BankPayments from "./Moduels/Bank/BankPayment";

// StatutoryTax
import StatutoryTax from "./Moduels/Statutary/StatutoryTax";

// Audit
import Audit from "./Moduels/Audit/AuditLogViewer";

// Auth
import AuthProvider from "./Moduels/Context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC ROUTE */}
          <Route path="/" element={<Login />} />

          {/* PROTECTED ROUTES */}
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Employees */}
            <Route path="/employeeCreate" element={<EmployeeCreate />} />
            <Route path="/employeeList" element={<EmployeeList />} />
            <Route path="/employeeForm" element={<EmployeeForm />} />
            <Route path="/employeebulkupload" element={<EmployeeBulkUpload />} />

            {/* Salary Setup */}
            <Route path="/salarycomponents" element={<Component />} />
            <Route path="/salarytemplate" element={<SalaryTemplate />} />
            <Route path="/paystructure" element={<PayStructure />} />
            <Route path="/salaryengine" element={<SalaryEngine />} />

            {/* Attendance */}
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendanceSummary" element={<AttendanceSummary />} />
            <Route path="/attendanceTable" element={<AttendanceTable/>} />
            <Route path="/leaveApproval" element={<LeaveApproval />} />

            {/* Payroll */}
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payruns" element={<Payruns />} />

            {/* Bank */}
            <Route path="/bank" element={<BankPayments />} />

            {/* Statutory */}
            <Route path="/statutorytax" element={<StatutoryTax />} />

            {/* Audit */}
            <Route path="/audit" element={<Audit />} />

            {/* Other */}
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/form16" element={<Form16 />} />
            <Route path="/tax" element={<Tax />} />
            <Route path="/noticeboard" element={<NoticeBoard />} />
            <Route path="/help" element={<Help />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}