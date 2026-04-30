import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminTeachersPage from "./pages/AdminTeachersPage";
import AdminStudentsPage from "./pages/AdminStudentsPage";
import AdminTimetablesPage from "./pages/AdminTimetablesPage";
import AdminAlumniPage from "./pages/AdminAlumniPage";
import AdminAttendancePage from "./pages/AdminAttendancePage";
import AdminMentorshipPage from "./pages/AdminMentorshipPage";
import AdminCoursesPage from "./pages/AdminCoursesPage";
import AdminBatchesPage from "./pages/AdminBatchesPage";
import StudentProfile from "./pages/StudentProfile";
import StudentAcademicsPage from "./pages/StudentAcademicsPage";
import StudentTimetablePage from "./pages/StudentTimetablePage";
import FacultyTimetablePage from "./pages/FacultyTimetablePage";
import MentorMenteesPage from "./pages/MentorMenteesPage";
import MentorSessionsPage from "./pages/MentorSessionsPage";
import MentorReportsPage from "./pages/MentorReportsPage";
import MentorAcademicsPage from "./pages/MentorAcademicsPage";
import MentorCertificatesPage from "./pages/MentorCertificatesPage";
import StudentMentoringPage from "./pages/StudentMentoringPage";
import StudentInsightsPage from "./pages/StudentInsightsPage";
import StudentRequestsPage from "./pages/StudentRequestsPage";
import StudentCertificatesPage from "./pages/StudentCertificatesPage";
import StudentNotificationsPage from "./pages/StudentNotificationsPage";
import StudentSchedulePage from "./pages/StudentSchedulePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import NotFound from "./pages/NotFound";
import SubjectHandlerManagePage from "./pages/SubjectHandlerManagePage";
import SubjectHandlerAIAnalysisPage from "./pages/SubjectHandlerAIAnalysisPage";
import MentorAIReportsPage from "./pages/MentorAIReportsPage";
import FacultyNotesPage from "./pages/FacultyNotesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/dashboard/admin/teachers" element={<AdminTeachersPage />} />
          <Route path="/dashboard/admin/students" element={<AdminStudentsPage />} />
          <Route path="/dashboard/admin/timetables" element={<AdminTimetablesPage />} />
          <Route path="/dashboard/admin/attendance" element={<AdminAttendancePage />} />
          <Route path="/dashboard/admin/mentorship" element={<AdminMentorshipPage />} />
          <Route path="/dashboard/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/dashboard/admin/batches" element={<AdminBatchesPage />} />
          <Route path="/dashboard/admin/alumni" element={<AdminAlumniPage />} />
          <Route path="/dashboard/student/profile" element={<StudentProfile />} />
          <Route path="/dashboard/student/academics" element={<StudentAcademicsPage />} />
          <Route path="/dashboard/student/timetable" element={<StudentTimetablePage />} />
          <Route path="/dashboard/faculty/timetable" element={<FacultyTimetablePage />} />
          <Route path="/dashboard/faculty/notes" element={<FacultyNotesPage />} />
          <Route path="/dashboard/mentor/mentees" element={<MentorMenteesPage />} />
          <Route path="/dashboard/mentor/sessions" element={<MentorSessionsPage />} />
          <Route path="/dashboard/mentor/academics" element={<MentorAcademicsPage />} />
          <Route path="/dashboard/mentor/reports" element={<MentorReportsPage />} />
          <Route path="/dashboard/mentor/certificates" element={<MentorCertificatesPage />} />
          <Route path="/dashboard/student/mentoring" element={<StudentMentoringPage />} />
          <Route path="/dashboard/student/insights" element={<StudentInsightsPage />} />
          <Route path="/dashboard/student/requests" element={<StudentRequestsPage />} />
          <Route path="/dashboard/student/certificates" element={<StudentCertificatesPage />} />
          <Route path="/dashboard/student/notifications" element={<StudentNotificationsPage />} />
          <Route path="/dashboard/student/schedule" element={<StudentSchedulePage />} />
          <Route path="/dashboard/subject-handler/manage" element={<SubjectHandlerManagePage />} />
          <Route path="/dashboard/subject-handler/ai-analysis" element={<SubjectHandlerAIAnalysisPage />} />
          <Route path="/dashboard/mentor/ai-reports" element={<MentorAIReportsPage />} />
          <Route path="/dashboard/:role" element={<DashboardPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
