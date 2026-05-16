import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/pages/Login";
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
import PayrollHome from "./Moduels/Salary/PayrollHome";
import SalaryComponents from "./Moduels/Salary/SalaryComponent";
import SalaryTemplatess from "./Moduels/Salary/SalaryTemplates";
import SalaryPreview from "./Moduels/Salary/SalaryPreview";
import EmployeeSalaryStructure from "./Moduels/Salary/EmployeeSalaryStructure";
import EmployeeSelector from "./Moduels/Salary/EmployeeSelector";
import Setup from "./Moduels/Setup/setup";
import AttendanceSummary from "./components/pages/Attendance/AttendancsSummary";
import AttendanceTable from "./Moduels/attendance/AttendanceTable";
import LeaveApproval from "./components/pages/Attendance/LeaveApproval";
import AttendanceBulkUpload from "./components/pages/Attendance/AttendanceBulkUpload";
import DailyAttendance from "./components/pages/Attendance/DailyAttendance";
import ApplyCalendar from "./components/pages/Attendance/ApplyCalendar";
import BankPayments from "./Moduels/Bank/BankPayment";
import StatutoryTax from "./Moduels/Statutary/StatutoryTax";
import Audit from "./Moduels/Audit/AuditLogViewer";
import ReconciliationConsole from "./Moduels/Reconciliation/ReconciliationConsole";
import FraudConsole from "./Moduels/Fraud/FraudConsole";
import EventsConsole from "./Moduels/Events/EventsConsole";
import AuthProvider from "./Moduels/Context/AuthContext";
import { ToastProvider } from "./Moduels/Context/ToastContext";
import ResetPassword from "./components/pages/ResetPassword";
import PayPeriods from "./Moduels/payroll/PayPeriods";
import PayrollRuns from "./Moduels/payroll/PayrollRuns";
import ProcessPayroll from "./Moduels/payroll/PayrollProcess";
import PayrollTraceViewer from "./Moduels/payroll/PayrollTraceViewer";
import PayrollBatchProcess from "./Moduels/payroll/PayrollBatchProcess";
import PayrollSummary from "./Moduels/payroll/PayrollSummary";
import PayrollRegister from "./Moduels/payroll/PayrollRegister";
import SalaryStatement from "./Moduels/payroll/SalaryStatement";
import TdsSummary from "./Moduels/payroll/TdsSummary";
import PayslipViewer from "./Moduels/Payslip/PayslipViewer";
import PayrollLifecycle from "./Moduels/payroll/PayrollLifecycle";
import SalaryV2Home from "./Moduels/Salary/v2/SalaryV2Home";
import SalaryV2Components from "./Moduels/Salary/v2/SalaryV2Components";
import SalaryV2Groups from "./Moduels/Salary/v2/SalaryV2Groups";
import SalaryV2DerivedVariables from "./Moduels/Salary/v2/SalaryV2DerivedVariables";
import SalaryV2Statutory from "./Moduels/Salary/v2/SalaryV2Statutory";
import SalaryV2Preview from "./Moduels/Salary/v2/SalaryV2Preview";
import RegisterModal from "./components/pages/RegisterModal";
import TemplateBuilder from "./Moduels/Salary/SalaryTemplate";
import ProfilePage from "./components/pages/ProfilePage";
import SettingsPage from "./components/pages/SettingsPage";
import SecurityPage from "./components/pages/SecurityPage";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/registermodal" element={<RegisterModal />} />

            <Route
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/Setup" element={<ProtectedRoute allowedRoles={["admin"]}><Setup /></ProtectedRoute>} />
              <Route path="/employeeInput" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><EmployeeInput /></ProtectedRoute>} />
              <Route path="/employeeCreate" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><EmployeeCreate /></ProtectedRoute>} />
              <Route path="/employeeList" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><EmployeeList /></ProtectedRoute>} />
              <Route path="/employeeForm" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><EmployeeForm /></ProtectedRoute>} />
              <Route path="/employeebulkupload" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><EmployeeBulkUpload /></ProtectedRoute>} />

              <Route path="/payrollhome" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayrollHome /></ProtectedRoute>} />

              <Route path="/salary/components" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><SalaryComponents /></ProtectedRoute>} />
              <Route path="/salary/templates" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><SalaryTemplatess /></ProtectedRoute>} />
              <Route path="/salary/templates/:id" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><TemplateBuilder /></ProtectedRoute>} />
              <Route path="/salary/preview" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><EmployeeSelector /></ProtectedRoute>} />
              <Route path="/salary/preview/:id" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><SalaryPreview /></ProtectedRoute>} />
              <Route path="/employeesalarystructure" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><EmployeeSalaryStructure /></ProtectedRoute>} />

              <Route
                path="/salary-v2"
                element={
                  <ProtectedRoute allowedRoles={["admin", "hr"]}>
                    <SalaryV2Home />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/salary-v2/components" replace />} />
                <Route path="components" element={<SalaryV2Components />} />
                <Route path="groups" element={<SalaryV2Groups />} />
                <Route path="derived-variables" element={<SalaryV2DerivedVariables />} />
                <Route path="statutory" element={<SalaryV2Statutory />} />
                <Route path="preview" element={<SalaryV2Preview />} />
                <Route path="*" element={<Navigate to="/salary-v2/components" replace />} />
              </Route>

              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/security" element={<SecurityPage />} />

              <Route path="/attendance" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><AttendancePage /></ProtectedRoute>} />
              <Route path="/attendanceCalendar" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><DailyAttendance /></ProtectedRoute>} />
              <Route path="/attendanceSummary" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><AttendanceSummary /></ProtectedRoute>} />
              <Route path="/attendanceTable" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><AttendanceTable /></ProtectedRoute>} />
              <Route path="/attendanceBulkUpload" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><AttendanceBulkUpload /></ProtectedRoute>} />
              <Route path="/attendanceApplyCalendar" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><ApplyCalendar /></ProtectedRoute>} />
              <Route path="/leaveApproval" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><LeaveApproval /></ProtectedRoute>} />

              <Route path="/pay-periods" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayPeriods /></ProtectedRoute>} />
              <Route path="/payroll-runs" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayrollRuns /></ProtectedRoute>} />
              <Route path="/process-payroll" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><ProcessPayroll /></ProtectedRoute>} />
              <Route path="/payroll/:id/trace" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayrollTraceViewer /></ProtectedRoute>} />
              <Route path="/payroll-batch" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayrollBatchProcess /></ProtectedRoute>} />
              <Route path="/summary" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayrollSummary /></ProtectedRoute>} />
              <Route path="/register" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayrollRegister /></ProtectedRoute>} />
              <Route path="/salary-statement" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><SalaryStatement /></ProtectedRoute>} />
              <Route path="/tds-summary" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><TdsSummary /></ProtectedRoute>} />
              <Route path="/payslip" element={<ProtectedRoute allowedRoles={["admin", "hr", "employee"]}><PayslipViewer /></ProtectedRoute>} />
              <Route path="/payroll-finalize" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><PayrollLifecycle /></ProtectedRoute>} />

              <Route path="/bank" element={<ProtectedRoute allowedRoles={["admin", "hr", "finance"]}><BankPayments /></ProtectedRoute>} />
              <Route path="/statutorytax" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><StatutoryTax /></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute allowedRoles={["admin"]}><Audit /></ProtectedRoute>} />

              <Route
                path="/reconciliation"
                element={
                  <ProtectedRoute allowedRoles={["admin", "finance"]}>
                    <ReconciliationConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fraud"
                element={
                  <ProtectedRoute allowedRoles={["admin", "finance"]}>
                    <FraudConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute allowedRoles={["admin", "finance"]}>
                    <EventsConsole />
                  </ProtectedRoute>
                }
              />

              <Route path="/approvals" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><Approvals /></ProtectedRoute>} />
              <Route path="/loans" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><Loans /></ProtectedRoute>} />
              <Route path="/form16" element={<Form16 />} />
              <Route path="/tax" element={<Tax />} />
              <Route path="/noticeboard" element={<NoticeBoard />} />
              <Route path="/help" element={<Help />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
