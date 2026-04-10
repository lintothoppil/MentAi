import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import MentorDashboard from "@/components/dashboards/MentorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import FacultyDashboard from "@/components/dashboards/FacultyDashboard";
import { NotebookLoader } from "@/components/ui/NotebookLoader";

const RoleBasedDashboard = ({ role }: { role: string }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [hasMentees, setHasMentees] = useState<boolean | null>(null);

  useEffect(() => {
    // If the user is a mentor, check if they are allocated any mentees.
    // If they have mentees, they get the full Mentor+Faculty Dashboard.
    // If they don't, they only get the Faculty Timetable dashboard.
    // For HODs and Subject Handlers, they always just get the Faculty Dashboard.
    if (role === 'mentor' && user.id) {
      fetch(`http://localhost:5000/api/analytics/mentor/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data && data.data.length > 0) {
            setHasMentees(true);
          } else {
            setHasMentees(false);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch mentees for dashboard routing:", err);
          setHasMentees(false);
        });
    } else {
      // Not a mentor, so clearly doesn't have mentees in this context
      setHasMentees(false);
    }
  }, [role, user.id]);

  if (role === 'mentor' && hasMentees === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <NotebookLoader size="lg" className="text-mentor" />
      </div>
    );
  }

  // If they have mentees (allocated mentors), show the combined Mentor Dashboard
  if (hasMentees) {
    return <MentorDashboard />;
  }

  // For unallocated mentors, hods, subject-handlers, show the Faculty Dashboard
  return <FacultyDashboard />;
};

const DashboardPage = () => {
  const { role } = useParams<{ role: string }>();

  // Normalize role to lowercase and trim spaces for consistency
  const normalizedRole = role?.toLowerCase().trim();

  switch (normalizedRole) {
    case "student":
      return <StudentDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "faculty":
      return <FacultyDashboard />;
    case "mentor":
    case "hod":
    case "subject-handler":
      return <RoleBasedDashboard role={normalizedRole} />;
    default:
      // Redirect to home or show 404 if role is invalid
      return <Navigate to="/" replace />;
  }
};

export default DashboardPage;
