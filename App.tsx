import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Layout and Pages
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserListPage from './pages/users/UserListPage';
import UserFormPage from './pages/users/UserFormPage';
import BulkUserCreationPage from './pages/users/BulkUserCreationPage';
import CourseListPage from './pages/courses/CourseListPage';
import CourseFormPage from './pages/courses/CourseFormPage';
import ClassroomListPage from './pages/classrooms/ClassroomListPage';
import ClassroomFormPage from './pages/classrooms/ClassroomFormPage';
import AssignStudentToClassroomPage from './pages/classrooms/AssignStudentToClassroomPage';
import SendNotificationPage from './pages/notifications/SendNotificationPage';
import EvaluationListPage from './pages/evaluations/EvaluationListPage';
import EvaluationFormPage from './pages/evaluations/EvaluationFormPage';
import BulkEvaluationCreationPage from './pages/evaluations/BulkEvaluationCreationPage';
import AssignGradesPage from './pages/evaluations/AssignGradesPage';
import ReportPage from './pages/reports/ReportsPage';
import ReportViewerPage from './pages/reports/ReportViewerPage';
import CreateRelationshipPage from './pages/relationships/CreateRelationshipPage';
import ViewRelationshipsPage from './pages/relationships/ViewRelationshipsPage';
import LapsoListPage from './pages/lapsos/LapsoListPage';
import LapsoFormPage from './pages/lapsos/LapsoFormPage';
import LoginHistoryPage from './pages/auth/LoginHistoryPage';
import UserBlockPage from './pages/users/UserBlockPage';
import ExtracurricularListPage from './pages/extracurriculars/ExtracurricularListPage';
import ExtracurricularFormPage from './pages/extracurriculars/ExtracurricularFormPage';
import CertificateListPage from './pages/certificates/CertificateListPage';
import CertificateFormPage from './pages/certificates/CertificateFormPage';
import ProductListPage from './pages/products/ProductListPage';
import ProductFormPage from './pages/products/ProductFormPage';
import EnrollmentStudentListPage from './pages/enrollments/EnrollmentStudentListPage';
import StudentEnrollmentListPage from './pages/enrollments/StudentEnrollmentListPage';
import AssignCoursePage from './pages/enrollments/AssignCoursePage';
import AssignClassroomPage from './pages/courses/AssignClassroomPage';
import AttendanceListPage from './pages/attendance/AttendanceListPage';
import GradeStatsPage from './pages/stats/GradeStatsPage';
import InvoicePrintPage from './pages/invoices/InvoicePrintPage';
import CuentasPorCobrarPage from './pages/administrative/CuentasPorCobrarPage';
import InvoicesListPage from './pages/administrative/InvoicesListPage';
import MonthlyGenerationPage from './pages/administrative/MonthlyGenerationPage';
import PurchaseListPage from './pages/administrative/PurchaseListPage';
import PurchaseFormPage from './pages/administrative/PurchaseFormPage';
import PayrollListPage from './pages/administrative/PayrollListPage';
import PayrollFormPage from './pages/administrative/PayrollFormPage';
import PayrollDetailPage from './pages/administrative/PayrollDetailPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import GLPostingPage from './pages/gl/GLPostingPage';
import GeneralLedgerPage from './pages/gl/GeneralLedgerPage';
import WithholdingListPage from './pages/withholdings/WithholdingListPage';
import WithholdingFormPage from './pages/withholdings/WithholdingFormPage';
import BoletaListPage from './pages/boletas/BoletaListPage';
import BoletaFormPage from './pages/boletas/BoletaFormPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import ThemeStyles from './components/ThemeStyles';

// Context
import { NotificationProvider } from './context/NotificationContext';
import ProfilePage from './pages/profile/ProfilePage';
import NotificationListPage from './pages/notifications/NotificationListPage';
import AssignDescriptiveGradesPage from './pages/evaluations/AssignDescriptiveGradesPage';
import AiEvaluationPage from './pages/evaluations/AiEvaluationPage';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <>
      <ThemeStyles />
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/*"
            element={
              user ? (
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            
            {/* Users */}
            <Route path="users" element={<UserListPage />} />
            <Route path="users/create" element={<UserFormPage />} />
            <Route path="users/create-bulk-ia" element={<BulkUserCreationPage />} />
            <Route path="users/edit/:id" element={<UserFormPage />} />
            <Route path="users/block/:id" element={<UserBlockPage />} />

            {/* Courses */}
            <Route path="courses" element={<CourseListPage />} />
            <Route path="courses/create" element={<CourseFormPage />} />
            <Route path="courses/assign-classroom" element={<AssignClassroomPage />} />

            {/* Classrooms */}
            <Route path="classrooms" element={<ClassroomListPage />} />
            <Route path="classrooms/create" element={<ClassroomFormPage />} />
            <Route path="classrooms/assign-student" element={<AssignStudentToClassroomPage />} />

            {/* Evaluations */}
            <Route path="evaluations" element={<EvaluationListPage />} />
            <Route path="evaluations/create" element={<EvaluationFormPage />} />
            <Route path="evaluations/create-bulk-ia" element={<BulkEvaluationCreationPage />} />
            <Route path="evaluations/edit/:id" element={<EvaluationFormPage />} />
            <Route path="evaluations/assign/:evaluationId" element={<AssignGradesPage />} />
            <Route path="evaluations/assign-descriptive/:evaluationId" element={<AssignDescriptiveGradesPage />} />
            <Route path="evaluations/evaluate-ai/:evaluationId" element={<AiEvaluationPage />} />
            
            {/* Notifications */}
            <Route path="notifications/send" element={<SendNotificationPage />} />
            <Route path="notifications/list" element={<NotificationListPage />} />
            
            {/* Reports */}
            <Route path="reports" element={<ReportPage />} />
            <Route path="report-viewer" element={<ReportViewerPage />} />

            {/* Relationships */}
            <Route path="relationships" element={<ViewRelationshipsPage />} />
            <Route path="relationships/create" element={<CreateRelationshipPage />} />

            {/* Lapsos */}
            <Route path="lapsos" element={<LapsoListPage />} />
            <Route path="lapsos/create" element={<LapsoFormPage />} />
            <Route path="lapsos/edit/:id" element={<LapsoFormPage />} />
            
            {/* Auth */}
            <Route path="login-history" element={<LoginHistoryPage />} />

            {/* Extracurriculars */}
            <Route path="extracurriculars" element={<ExtracurricularListPage />} />
            <Route path="extracurriculars/create" element={<ExtracurricularFormPage />} />
            <Route path="extracurriculars/edit/:id" element={<ExtracurricularFormPage />} />
            
            {/* Certificates */}
            <Route path="certificates" element={<CertificateListPage />} />
            <Route path="certificates/generate" element={<CertificateFormPage />} />
            
            {/* Boletas */}
            <Route path="boletas" element={<BoletaListPage />} />
            <Route path="boletas/create" element={<BoletaFormPage />} />
            <Route path="boletas/edit/:id" element={<BoletaFormPage />} />

            {/* Products */}
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/create" element={<ProductFormPage />} />
            <Route path="products/edit/:id" element={<ProductFormPage />} />

            {/* Enrollments */}
            <Route path="enrollments" element={<EnrollmentStudentListPage />} />
            <Route path="enrollments/student/:userId" element={<StudentEnrollmentListPage />} />
            <Route path="enrollments/assign/:userId" element={<AssignCoursePage />} />

            {/* Attendance */}
            <Route path="attendance" element={<AttendanceListPage />} />

            {/* Stats */}
            <Route path="stats/grades" element={<GradeStatsPage />} />

            {/* Invoices */}
            <Route path="invoices/print/:id" element={<InvoicePrintPage />} />

            {/* Administrative */}
            <Route path="cxc" element={<CuentasPorCobrarPage />} />
            <Route path="invoices" element={<InvoicesListPage />} />
            <Route path="administrative/monthly-generation" element={<MonthlyGenerationPage />} />
            <Route path="purchases" element={<PurchaseListPage />} />
            <Route path="purchases/create" element={<PurchaseFormPage />} />
            <Route path="payroll" element={<PayrollListPage />} />
            <Route path="payroll/create" element={<PayrollFormPage />} />
            <Route path="payroll/detail/:id" element={<PayrollDetailPage />} />
            <Route path="withholdings" element={<WithholdingListPage />} />
            <Route path="withholdings/create" element={<WithholdingFormPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            
            {/* GL */}
            <Route path="gl/postings" element={<GLPostingPage />} />
            <Route path="gl/reports" element={<GeneralLedgerPage />} />
            
            {/* Profile */}
            <Route path="profile" element={<ProfilePage />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </NotificationProvider>
    </>
  );
};

export default App;