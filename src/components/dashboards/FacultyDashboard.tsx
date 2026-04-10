import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle, LayoutDashboard, Users, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { NotebookLoader } from "@/components/ui/NotebookLoader";

interface TimetableEntry {
    day: string;
    period: number;
    time_slot?: string;
    subject: string;
    handler?: string;
    department: string;
    batch: string;
}

const FacultyDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const navItems = [
        { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: `/dashboard/${user.role}`, isActive: true },
        { label: "My Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty/timetable" },
    ];

    useEffect(() => {
        if (user.id) {
            fetchTimetable();
        } else {
            setLoading(false);
            toast.error("User ID missing.");
        }
    }, [user.id]);

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

    const getEntry = (day: string, period: number) => {
        return timetable.find(t => t.day.toLowerCase() === day.toLowerCase() && t.period === period);
    };

    return (
        <DashboardLayout role={user.role || 'mentor'} roleLabel={`${user.role} Dashboard`} navItems={navItems} gradientClass={`gradient-${user.role || 'mentor'}`}>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome, {user.name}</h2>
                    <p className="text-muted-foreground">{user.department} • {user.role?.toUpperCase()}</p>
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
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" /> My Teaching Schedule
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
                                                                <span className="text-xs text-muted-foreground">{entry.department} ({entry.batch})</span>
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

export default FacultyDashboard;
