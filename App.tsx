import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ThemeStyles from './components/ThemeStyles';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserListPage from './pages/users/UserListPage';
import UserFormPage from './pages/users/UserFormPage';
import CourseListPage from './pages/courses/CourseListPage';
import CourseFormPage from './pages/courses/CourseFormPage';
import ClassroomListPage from './pages/classrooms/ClassroomListPage';
import ClassroomFormPage from './pages/classrooms/ClassroomFormPage';
import SendNotificationPage from './pages/notifications/SendNotificationPage';
import ReportPage from './pages/reports/ReportsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import EvaluationListPage from './pages/evaluations/EvaluationListPage';
import EvaluationFormPage from './pages/evaluations/EvaluationFormPage';
import AssignGradesPage from './pages/evaluations/AssignGradesPage';
import ViewRelationshipsPage from './pages/relationships/ViewRelationshipsPage';
import CreateRelationshipPage from './pages/relationships/CreateRelationshipPage';
import LapsoListPage from './pages/lapsos/LapsoListPage';
import LapsoFormPage from './pages/lapsos/LapsoFormPage';
import LoginHistoryPage from './pages/auth/LoginHistoryPage';
import UserBlockPage from './pages/users/UserBlockPage';
import ReportViewerPage from './pages/reports/ReportViewerPage';
import ExtracurricularListPage from './pages/extracurriculars/ExtracurricularListPage';
import ExtracurricularFormPage from './pages/extracurriculars/ExtracurricularFormPage';
import CertificateListPage from './pages/certificates/CertificateListPage';
import CertificateFormPage from './pages/certificates/CertificateFormPage';
import ProductListPage from './pages/products/ProductListPage';
import ProductFormPage from './pages/products/ProductFormPage';
import EnrollmentStudentListPage from './pages/enrollments/EnrollmentStudentListPage';
import StudentEnrollmentListPage from './pages/enrollments/StudentEnrollmentListPage';
import AssignCoursePage from './pages/enrollments/AssignCoursePage';

const App: React.FC = () => {
  return (
    <>
      <ThemeStyles />
      <div className="bg-background min-h-screen">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            
            {/* User Routes */}
            <Route path="users" element={<UserListPage />} />
            <Route path="users/create" element={<UserFormPage />} />
            <Route path="users/edit/:id" element={<UserFormPage />} />
            <Route path="users/block/:id" element={<UserBlockPage />} />
            
            {/* Course Routes */}
            <Route path="courses" element={<CourseListPage />} />
            <Route path="courses/create" element={<CourseFormPage />} />

            {/* Classroom Routes */}
            <Route path="classrooms" element={<ClassroomListPage />} />
            <Route path="classrooms/create" element={<ClassroomFormPage />} />
            <Route path="classrooms/edit/:id" element={<ClassroomFormPage />} />

            {/* Evaluation Routes */}
            <Route path="evaluations" element={<EvaluationListPage />} />
            <Route path="evaluations/create" element={<EvaluationFormPage />} />
            <Route path="evaluations/edit/:id" element={<EvaluationFormPage />} />
            <Route path="evaluations/assign/:evaluationId" element={<AssignGradesPage />} />
            
            {/* Notification Routes */}
            <Route path="notifications/send" element={<SendNotificationPage />} />
            
            {/* Report Routes */}
            <Route path="reports" element={<ReportPage />} />
            
            {/* Relationship Routes */}
            <Route path="relationships" element={<ViewRelationshipsPage />} />
            <Route path="relationships/create" element={<CreateRelationshipPage />} />

            {/* Lapso Routes */}
            <Route path="lapsos" element={<LapsoListPage />} />
            <Route path="lapsos/create" element={<LapsoFormPage />} />
            <Route path="lapsos/edit/:id" element={<LapsoFormPage />} />

            {/* Extracurricular Routes */}
            <Route path="extracurriculars" element={<ExtracurricularListPage />} />
            <Route path="extracurriculars/create" element={<ExtracurricularFormPage />} />
            <Route path="extracurriculars/edit/:id" element={<ExtracurricularFormPage />} />

            {/* Certificate Routes */}
            <Route path="certificates" element={<CertificateListPage />} />
            <Route path="certificates/generate" element={<CertificateFormPage />} />

            {/* Product Routes */}
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/create" element={<ProductFormPage />} />
            <Route path="products/edit/:id" element={<ProductFormPage />} />

            {/* Enrollment Routes */}
            <Route path="enrollments" element={<EnrollmentStudentListPage />} />
            <Route path="enrollments/student/:userId" element={<StudentEnrollmentListPage />} />
            <Route path="enrollments/assign/:userId" element={<AssignCoursePage />} />

            {/* Auth Routes */}
            <Route path="login-history" element={<LoginHistoryPage />} />

            {/* Add other routes here as needed */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Route>
          
          {/* Report Viewer Route (no layout) */}
          <Route
            path="/report-viewer"
            element={
              <ProtectedRoute>
                <ReportViewerPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
};

export default App;