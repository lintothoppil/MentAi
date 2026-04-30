import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {  Calendar, Clock, AlertCircle, LayoutDashboard, Users, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import { hasRole, normalizeRole } from "@/lib/authSession";

interface TimetableEntry {
    day: string;
    period: number;
    time_slot?: string;
    subject: string;
    handler?: string;
    department: string;
    batch: string;
}

const FacultyTimetablePage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const activeRole = normalizeRole(user.role || user.designation || 'faculty');
    const isMentor = hasRole(user, "mentor");
    const isHandler = hasRole(user, "subject-handler");
    const baseRole = activeRole || 'faculty';
    
    // Mentor nav items
    const mentorNavItems = [
        { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor" },
        { label: "My Mentees", icon: <Users className="h-4 w-4" />, path: "/dashboard/mentor/mentees" },
        { label: "Sessions", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/mentor/sessions" },
        { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty/timetable", isActive: true },
        { label: "Academics", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/mentor/academics" },
        { label: "Reports", icon: <FileText className="h-4 w-4" />, path: "/dashboard/mentor/reports" },
    ];

    // Regular faculty nav items
    const facultyNavItems = [
        { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: `/dashboard/${baseRole}` },
        { label: "My Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty/timetable", isActive: true },
        ...(isHandler ? [{ label: "Subject Handler", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/subject-handler/manage" }] : [])
    ];

    const navItems = isMentor ? mentorNavItems : facultyNavItems;

    useEffect(() => {
        if (user.id) {
            fetchTimetable();
        } else {
            setLoading(false);
            toast.error("User ID missing.");
        }
    }, []);

    const fetchTimetable = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/timetable/view?faculty_id=${user.id}`);
            const data = await response.json();

            if (data.success) {
                setTimetable(data.data);
            } else {
                setTimetable([]);
            }
        } catch (error) {
            console.error("Error fetching timetable:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [1, 2, 3, 4, 5, 6, 7];

    const getEntries = (day: string, period: number) => {
        return (Array.isArray(timetable) ? timetable : [])
            .filter(t => t.day?.toLowerCase() === day.toLowerCase() && t.period === period)
            .sort((a, b) => String(a.batch || "").localeCompare(String(b.batch || "")) || String(a.subject || "").localeCompare(String(b.subject || "")));
    };

    return (
        <DashboardLayout role={baseRole} roleLabel={`${baseRole} Dashboard`} navItems={navItems} gradientClass={`gradient-${baseRole}`}>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Teaching Schedule</h2>
                    <p className="text-muted-foreground">Allocated periods across departments.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <NotebookLoader size="lg" className="text-primary" />
                    </div>
                ) : timetable.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent className="flex flex-col items-center gap-4">
                            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No classes assigned to you yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" /> Weekly Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-4 border">Day / Period</th>
                                        {periods.map(p => <th key={p} className="p-4 border text-center">Period {p}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {days.map(day => (
                                        <tr key={day} className="border-b hover:bg-muted/10">
                                            <td className="p-4 font-bold border-r bg-muted/20">{day}</td>
                                            {periods.map(period => {
                                                const entries = getEntries(day, period);
                                                return (
                                                    <td key={period} className="p-2 border text-center min-w-[180px] align-top">
                                                        {entries.length > 0 ? (
                                                            <div className="flex flex-col gap-2">
                                                                {entries.map((entry, idx) => (
                                                                    <div key={`${entry.subject}-${entry.batch}-${idx}`} className="rounded-lg bg-muted/30 p-2">
                                                                        <span className="block font-semibold text-primary">{entry.subject}</span>
                                                                        <span className="block text-xs text-muted-foreground">{entry.department} ({entry.batch})</span>
                                                                        {entry.time_slot && <span className="block text-[10px] text-muted-foreground/70">{entry.time_slot}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/20">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default FacultyTimetablePage;
