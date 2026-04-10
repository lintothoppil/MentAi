import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {  Calendar, BookOpen, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { LayoutDashboard, BarChart3, Brain, Users, FileText, Upload, Bell } from "lucide-react";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import { useNavigate } from "react-router-dom";

interface TimetableEntry {
    day: string;
    period: number;
    time_slot?: string;
    subject: string;
    handler?: string;
}

const StudentTimetablePage = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [dept, setDept] = useState(user.department || '');
    const [batch, setBatch] = useState(user.batch || '');

    const navItems = [
        { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
        { label: "Academics", icon: <BarChart3 className="h-4 w-4" />, path: "/dashboard/student/academics" },
        { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
        { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/timetable", isActive: true },
        { label: "Mentoring", icon: <Users className="h-4 w-4" />, path: "/dashboard/student/mentoring" },
        { label: "Requests", icon: <FileText className="h-4 w-4" />, path: "/dashboard/student/requests" },
        { label: "Certificates", icon: <Upload className="h-4 w-4" />, path: "/dashboard/student/certificates" },
        { label: "Notifications", icon: <Bell className="h-4 w-4" />, path: "/dashboard/student/notifications" },
    ];

    useEffect(() => {
        if (!user.admission_number) {
            navigate('/');
            return;
        }
        // First, fetch the authoritative student details (batch, branch) from API
        // because localStorage may have stale/faculty data
        fetch(`http://localhost:5000/api/student/detail/${user.admission_number}`)
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data) {
                    const studentDept = d.data.branch || user.department || '';
                    const studentBatch = d.data.batch || user.batch || '';
                    setDept(studentDept);
                    setBatch(studentBatch);
                    if (studentDept && studentBatch) {
                        fetchTimetable(studentDept, studentBatch);
                    } else {
                        setLoading(false);
                        toast.error('Department or Batch information missing.');
                    }
                } else {
                    setLoading(false);
                }
            })
            .catch(() => setLoading(false));
    }, []);

    const fetchTimetable = async (studentDept: string, studentBatch: string) => {
        try {
            const deptEncoded = encodeURIComponent(studentDept);
            const batchEncoded = encodeURIComponent(studentBatch);
            const response = await fetch(`http://localhost:5000/api/timetable/view?department=${deptEncoded}&batch=${batchEncoded}`);
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

    const getEntry = (day: string, period: number) => {
        return timetable.find(t => t.day.toLowerCase() === day.toLowerCase() && t.period === period);
    };

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Class Schedule</h2>
                    <p className="text-muted-foreground">{dept} • Batch {batch}</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <NotebookLoader size="lg" className="text-primary" />
                    </div>
                ) : timetable.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent className="flex flex-col items-center gap-4">
                            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No timetable available for your batch yet.</p>
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
                                                const entry = getEntry(day, period);
                                                return (
                                                    <td key={period} className="p-2 border text-center min-w-[120px]">
                                                        {entry ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-semibold text-primary">{entry.subject}</span>
                                                                {entry.handler && <span className="text-xs text-muted-foreground">{entry.handler}</span>}
                                                                {entry.time_slot && <span className="text-[10px] text-muted-foreground/50">{entry.time_slot}</span>}
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

export default StudentTimetablePage;
