import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./components/pages/Login";
import Dashboard from "./components/pages/Dashboard";
import Form16 from "./components/pages/Form16";
import Layout from "./components/layout/Layout";
import Protected from "./components/Protected";
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
//Payroll-Home
import PayrollHome from "./Moduels/Salary/PayrollHome";

// Salary
import SalaryComponents from "./Moduels/Salary/SalaryComponent";
import SalaryTemplates from "./Moduels/Salary/SalaryTemplate";
import SalaryTemplatess from "./Moduels/Salary/SalaryTemplates";
import SalaryPreview from "./Moduels/Salary/SalaryPreview";
import EmployeeSalaryStructure from "./Moduels/Salary/EmployeeSalaryStructure";
import EmployeeSelector from "./Moduels/Salary/EmployeeSelector";
// Setup
import Setup from "./Moduels/Setup/setup";
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
import ResetPassword from "./components/pages/ResetPassword";

//Payroll
import PayPeriods from "./Moduels/payroll/PayPeriods";
import PayrollRuns from "./Moduels/payroll/PayrollRuns";
import ProcessPayroll from "./Moduels/payroll/PayrollProcess";
import PayrollSummary from "./Moduels/payroll/PayrollSummary";
import PayrollRegister from "./Moduels/payroll/PayrollRegister";
import SalaryStatement from "./Moduels/payroll/SalaryStatement";
import TdsSummary from "./Moduels/payroll/TdsSummary";
import PayslipDownload from "./Moduels/payroll/paySlipDownload";

//User Registration
import RegisterModal from "./components/pages/RegisterModal";
import TemplateBuilder from "./Moduels/Salary/SalaryTemplate";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC ROUTE */}
          <Route path="/" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route pathh="/registermodal" element={<RegisterModal />} />

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
            <Route path="/Setup" element={<Setup />} />
            <Route path="/employeeCreate" element={<EmployeeCreate />} />
            <Route path="/employeeList" element={<EmployeeList />} />
            <Route path="/employeeForm" element={<EmployeeForm />} />
            <Route path="/employeebulkupload" element={<EmployeeBulkUpload />} />
            {/* Payroll */}
            <Route path="/payrollhome" element={<PayrollHome />} />

            {/* Salary Setup */}
           <Route path="/salary/components" element={<SalaryComponents />} />
            <Route path="/salary/templates" element={<SalaryTemplatess />} />
            <Route path="/salary/templates/:id" element={<TemplateBuilder />} />
            <Route path="/salary/preview" element={<EmployeeSelector />} />
            <Route path="/salary/preview/:id" element={<SalaryPreview />} />
            <Route path="/employeesalarystructure" element={<EmployeeSalaryStructure />} />
            {/* Attendance */}
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendanceSummary" element={<AttendanceSummary />} />
            <Route path="/attendanceTable" element={<AttendanceTable/>} />
            <Route path="/leaveApproval" element={<LeaveApproval />} />

            {/* Payroll */}
            <Route path="/pay-periods" element={<PayPeriods/>}/>
            <Route path="/payroll-runs" element={<PayrollRuns/>}/>
            <Route path="/process-payroll" element={<ProcessPayroll/>}/>
            <Route path="/summary" element={<PayrollSummary/>}/>
            <Route path="/register" element={<PayrollRegister/>}/>
            <Route path="/salary-statement" element={<SalaryStatement/>}/>
            <Route path="/tds-summary" element={<TdsSummary/>}/>
            <Route path="/payslip" element={<PayslipDownload/>}/>

            {/* Bank */}
            <Route path="/bank" element={<BankPayments />} />

            {/* Statutory */}
            <Route path="/statutorytax" element={<StatutoryTax />} />

            {/* Audit */}
            <Route path="/audit" element={<Audit />} />

            {/* Other */}
            <Route path="/reset-password" element={<ResetPassword />} />
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