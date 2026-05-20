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
import AttendanceLayout from "./components/pages/Attendance/AttendanceLayout";
import AttendanceHub from "./components/pages/Attendance/AttendanceHub";
import MarkAttendancePage from "./Moduels/attendance/MarkAttendancePage";
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
import HolidayManagement from "./components/pages/Attendance/HolidayManagement";
import WfAttendanceSetup from "./components/pages/Attendance/WfAttendanceSetup";
import WfExceptions from "./components/pages/Attendance/WfExceptions";
import WfApprovals from "./components/pages/Attendance/WfApprovals";
import WfPolicies from "./components/pages/Attendance/WfPolicies";
import WfLabels from "./components/pages/Attendance/WfLabels";
import WfLivePunches from "./components/pages/Attendance/WfLivePunches";
import WfDashboard from "./components/pages/Attendance/WfDashboard";
import WfRosterBoard from "./components/pages/Attendance/WfRosterBoard";
import WfDevices from "./components/pages/Attendance/WfDevices";
import WfOpsConsole from "./components/pages/Attendance/WfOpsConsole";
import WfPolicyTrace from "./components/pages/Attendance/WfPolicyTrace";
import WfFreeze from "./components/pages/Attendance/WfFreeze";
import AttendanceTablePage from "./Moduels/attendance/AttendanceTablePage";
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

              <Route
                path="/attendance"
                element={
                  <ProtectedRoute allowedRoles={["admin", "hr"]}>
                    <AttendanceLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AttendanceHub />} />
                <Route path="mark" element={<MarkAttendancePage />} />
                <Route path="records" element={<AttendanceTablePage />} />
                <Route path="calendar" element={<DailyAttendance />} />
                <Route path="summary" element={<AttendanceSummary />} />
                <Route path="bulk" element={<AttendanceBulkUpload />} />
                <Route path="apply-calendar" element={<ApplyCalendar />} />
                <Route path="leave" element={<LeaveApproval />} />
                <Route path="holidays" element={<HolidayManagement />} />
                <Route path="dashboard" element={<WfDashboard />} />
                <Route path="punches" element={<WfLivePunches />} />
                <Route path="roster" element={<WfRosterBoard />} />
                <Route path="exceptions" element={<WfExceptions />} />
                <Route path="approvals" element={<WfApprovals />} />
                <Route path="setup" element={<ProtectedRoute allowedRoles={["admin"]}><WfAttendanceSetup /></ProtectedRoute>} />
                <Route path="policies" element={<ProtectedRoute allowedRoles={["admin"]}><WfPolicies /></ProtectedRoute>} />
                <Route path="freeze" element={<ProtectedRoute allowedRoles={["admin"]}><WfFreeze /></ProtectedRoute>} />
                <Route path="devices" element={<WfDevices />} />
                <Route path="policy-trace" element={<WfPolicyTrace />} />
                <Route path="ops" element={<ProtectedRoute allowedRoles={["admin"]}><WfOpsConsole /></ProtectedRoute>} />
                <Route path="labels" element={<ProtectedRoute allowedRoles={["admin"]}><WfLabels /></ProtectedRoute>} />
              </Route>
              {/* Legacy URLs → new paths (bookmarks still work) */}
              <Route path="/attendanceTable" element={<Navigate to="/attendance/records" replace />} />
              <Route path="/attendanceCalendar" element={<Navigate to="/attendance/calendar" replace />} />
              <Route path="/attendanceSummary" element={<Navigate to="/attendance/summary" replace />} />
              <Route path="/attendanceBulkUpload" element={<Navigate to="/attendance/bulk" replace />} />
              <Route path="/attendanceApplyCalendar" element={<Navigate to="/attendance/apply-calendar" replace />} />
              <Route path="/leaveApproval" element={<Navigate to="/attendance/leave" replace />} />
              <Route path="/attendanceHolidays" element={<Navigate to="/attendance/holidays" replace />} />
              <Route path="/attendanceSetup" element={<Navigate to="/attendance/setup" replace />} />
              <Route path="/attendanceExceptions" element={<Navigate to="/attendance/exceptions" replace />} />
              <Route path="/attendanceApprovals" element={<Navigate to="/attendance/approvals" replace />} />
              <Route path="/attendancePolicies" element={<Navigate to="/attendance/policies" replace />} />
              <Route path="/attendanceLabels" element={<Navigate to="/attendance/labels" replace />} />
              <Route path="/attendancePunches" element={<Navigate to="/attendance/punches" replace />} />
              <Route path="/attendanceWfDashboard" element={<Navigate to="/attendance/dashboard" replace />} />
              <Route path="/attendanceRoster" element={<Navigate to="/attendance/roster" replace />} />
              <Route path="/attendanceDevices" element={<Navigate to="/attendance/devices" replace />} />
              <Route path="/attendanceOps" element={<Navigate to="/attendance/ops" replace />} />
              <Route path="/attendancePolicyTrace" element={<Navigate to="/attendance/policy-trace" replace />} />
              <Route path="/attendanceFreeze" element={<Navigate to="/attendance/freeze" replace />} />

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
