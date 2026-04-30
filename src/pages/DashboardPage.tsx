import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import MentorDashboard from "@/components/dashboards/MentorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import FacultyDashboard from "@/components/dashboards/FacultyDashboard";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import { getAllowedRoles, hasRole, normalizeRole } from "@/lib/authSession";

const RoleBasedDashboard = ({ role }: { role: string }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [hasMentees, setHasMentees] = useState<boolean | null>(null);
  const allowedRoles = getAllowedRoles(user);

  useEffect(() => {
    const isFacultyType = (r: string) => ["faculty", "mentor", "hod", "subject-handler"].includes(r);

    if (role === "faculty") {
      setHasMentees(false);
      return;
    }

    if (role === "mentor" && (allowedRoles.includes("mentor") || user.id)) {
      fetch(`http://localhost:5000/api/analytics/mentor/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          const menteeCount = Array.isArray(data?.data) ? data.data.length : 0;
          if (data.success && menteeCount > 0) {
            localStorage.setItem("is_allocated_mentor", "true");
          } else {
            localStorage.setItem("is_allocated_mentor", "false");
          }

          setHasMentees(true);
        })
        .catch((err) => {
          console.error("Failed to fetch mentees for dashboard routing:", err);
          setHasMentees(true);
        });
    } else {
      setHasMentees(false);
    }
  }, [allowedRoles, role, user.id]);

  if (role === "mentor" && hasMentees === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <NotebookLoader size="lg" className="text-mentor" />
      </div>
    );
  }

  if (role === "mentor" && hasMentees) {
    return <MentorDashboard />;
  }

  return <FacultyDashboard />;
};

const DashboardPage = () => {
  const { role } = useParams<{ role: string }>();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Normalize role to lowercase and trim spaces for consistency
  const normalizedRole = role?.toLowerCase().trim();
  const storedRole = normalizeRole(user?.role);
  const allowedRoles = getAllowedRoles(user);

  if (!user || !Object.keys(user).length) {
    return <Navigate to="/login" replace />;
  }

  if (storedRole === "student" && !user.admission_number) {
    return <Navigate to="/login" replace />;
  }

  const isFacultyType = (r: string) => ["faculty", "mentor", "hod", "subject-handler"].includes(r);
  const canAccessRole = (targetRole: string) => {
    if (targetRole === "faculty") return isFacultyType(storedRole) || allowedRoles.length > 0;
    return hasRole(user, targetRole);
  };

  if (normalizedRole && storedRole && normalizedRole !== storedRole) {
    if (storedRole === "student") {
      return <Navigate to={user.profile_completed ? "/dashboard/student" : "/complete-profile"} replace />;
    }
    if (!canAccessRole(normalizedRole)) {
      return <Navigate to={`/dashboard/${storedRole}`} replace />;
    }
  }

  switch (normalizedRole) {
    case "student":
      return <StudentDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "faculty":
      return <RoleBasedDashboard role="faculty" />;
    case "mentor":
      return canAccessRole("mentor") ? <RoleBasedDashboard role="mentor" /> : <Navigate to="/dashboard/faculty" replace />;
    case "hod":
      return canAccessRole("hod") ? <RoleBasedDashboard role="hod" /> : <Navigate to="/dashboard/faculty" replace />;
    case "subject-handler":
      return canAccessRole("subject-handler") ? <RoleBasedDashboard role="subject-handler" /> : <Navigate to="/dashboard/faculty" replace />;
    default:
      // Redirect to home or show 404 if role is invalid
      return <Navigate to="/" replace />;
  }
};

export default DashboardPage;
