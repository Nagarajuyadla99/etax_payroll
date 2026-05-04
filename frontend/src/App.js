import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./components/pages/Login";
import LoginPage from "./components/pages/Login";
import Dashboard from "./components/pages/Dashboard";
import Form16 from "./components/pages/Form16";
import Layout from "./components/layout/Layout";
import Protected from "./components/Protected";
import ProtectedRoute from "./components/ProtecteRoute";
import Approvals from "./components/pages/Approvals/Approvals";
import Loans from "./components/pages/Loans/Loans";
import EmployeeCreate from "./Moduels/Employees/EmployeeCreate";
import EmployeeList from "./Moduels/Employees/EmployeeList";
import EmployeeForm from "./Moduels/Employees/EmployeeForm";
import EmployeeBulkUpload from "./Moduels/Employees/EmployeeBulkUpload";
import EmployeeInput from "./Moduels/Employees/EmployeeInput";
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
import AttendanceTablePage from "./Moduels/attendance/AttendanceTablePage";
import LeaveApproval from "./components/pages/Attendance/LeaveApproval";
import CreateLeave from "./components/pages/Attendance/CreateLeave";
import AttendanceBulkUpload from "./components/pages/Attendance/AttendanceBulkUpload";
import DailyAttendance from "./components/pages/Attendance/DailyAttendance";
import ApplyCalendar from "./components/pages/Attendance/ApplyCalendar";

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
import ProfilePage from "./components/pages/ProfilePage";
import SettingsPage from "./components/pages/SettingsPage";
import SecurityPage from "./components/pages/SecurityPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC ROUTE */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="/Setup" element={<ProtectedRoute allowedRoles={["admin"]}><Setup /></ProtectedRoute>} />
            <Route path="/employeeInput" element={<ProtectedRoute allowedRoles={["admin","hr"]}><EmployeeInput /></ProtectedRoute>} />
            <Route path="/employeeCreate" element={<ProtectedRoute allowedRoles={["admin","hr"]}><EmployeeCreate /></ProtectedRoute>} />
            <Route path="/employeeList" element={<ProtectedRoute allowedRoles={["admin","hr"]}><EmployeeList /></ProtectedRoute>} />
            <Route path="/employeeForm" element={<ProtectedRoute allowedRoles={["admin","hr"]}><EmployeeForm /></ProtectedRoute>} />
            <Route path="/employeebulkupload" element={<ProtectedRoute allowedRoles={["admin","hr"]}><EmployeeBulkUpload /></ProtectedRoute>} />
            {/* Payroll */}
            <Route path="/payrollhome" element={<PayrollHome />} />

            {/* Salary Setup */}
           <Route path="/salary/components" element={<SalaryComponents />} />
            <Route path="/salary/templates" element={<SalaryTemplatess />} />
            <Route path="/salary/templates/:id" element={<TemplateBuilder />} />
            <Route path="/salary/preview" element={<EmployeeSelector />} />
            <Route path="/salary/preview/:id" element={<SalaryPreview />} />
            <Route path="/employeesalarystructure" element={<EmployeeSalaryStructure />} />

            {/* User & settings */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            {/* Attendance */}
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendanceCalendar" element={<DailyAttendance />} />
            <Route path="/attendanceSummary" element={<AttendanceSummary />} />
            <Route path="/attendanceTable" element={<AttendanceTablePage />} />
            <Route path="/attendanceBulkUpload" element={<AttendanceBulkUpload />} />
            <Route path="/attendanceApplyCalendar" element={<ApplyCalendar />} />
            <Route path="/create-leave" element={<CreateLeave />} />
            <Route path="/leaveApproval" element={<LeaveApproval />} />

            {/* Payroll */}
            <Route path="/pay-periods" element={<ProtectedRoute allowedRoles={["admin","hr"]}><PayPeriods/></ProtectedRoute>}/>
            <Route path="/payroll-runs" element={<ProtectedRoute allowedRoles={["admin","hr"]}><PayrollRuns/></ProtectedRoute>}/>
            <Route path="/process-payroll" element={<ProtectedRoute allowedRoles={["admin","hr"]}><ProcessPayroll/></ProtectedRoute>}/>
            <Route path="/summary" element={<ProtectedRoute allowedRoles={["admin","hr"]}><PayrollSummary/></ProtectedRoute>}/>
            <Route path="/register" element={<ProtectedRoute allowedRoles={["admin","hr"]}><PayrollRegister/></ProtectedRoute>}/>
            <Route path="/salary-statement" element={<ProtectedRoute allowedRoles={["admin","hr"]}><SalaryStatement/></ProtectedRoute>}/>
            <Route path="/tds-summary" element={<ProtectedRoute allowedRoles={["admin","hr"]}><TdsSummary/></ProtectedRoute>}/>
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