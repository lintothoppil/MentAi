import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
    Calendar, Clock, AlertCircle, LayoutDashboard, Users, FileText,
    BookOpen, GraduationCap, Megaphone, MessageSquare, ChevronRight, User, Brain,
} from "lucide-react";
import { toast } from "sonner";
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

const anim = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.07 } });

const FacultyDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const role = normalizeRole(user.role || user.designation || "faculty");
    const isMentor = hasRole(user, "mentor");
    const overviewPath = role === "subject-handler" ? "/dashboard/subject-handler/manage" : `/dashboard/${role || "faculty"}`;
    const isHandler = hasRole(user, "subject-handler");

    const navItems = [
        { label: "Overview",        icon: <LayoutDashboard className="h-4 w-4" />, path: overviewPath },
        { label: "My Timetable",    icon: <Calendar className="h-4 w-4" />,        path: "/dashboard/faculty/timetable" },
        { label: "PDF Notes",       icon: <FileText className="h-4 w-4" />,        path: "/dashboard/faculty/notes" },
        ...(isMentor ? [{ label: "Mentor Dashboard", icon: <User className="h-4 w-4" />, path: "/dashboard/mentor" }] : []),
        ...(isHandler ? [{ label: "Subject Handler", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/subject-handler/manage" }] : []),
    ];

    useEffect(() => {
        if (user.id) {
            fetchTimetable();
        } else {
            setLoading(false);
        }
    }, [user.id]);

    const fetchTimetable = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/timetable/view?faculty_id=${user.id}`);
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) setTimetable(data.data);
            else setTimetable([]);
        } catch {
            toast.error("Could not load timetable");
        } finally {
            setLoading(false);
        }
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [1, 2, 3, 4, 5, 6, 7];

    const PERIOD_TIMES: Record<number, string> = {
        1: '08:45', 2: '09:40', 3: '10:45', 4: '11:40',
        5: '13:30', 6: '14:25', 7: '15:20',
    };

    const getEntries = (day: string, period: number) =>
        timetable
            .filter(t => t.day?.toLowerCase() === day.toLowerCase() && t.period === period)
            .sort((a, b) => String(a.batch || "").localeCompare(String(b.batch || "")) || String(a.subject || "").localeCompare(String(b.subject || "")));

    const todayEntries = (() => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = dayNames[new Date().getDay()];
        return (Array.isArray(timetable) ? timetable : [])
            .filter(t => t.day?.toLowerCase() === todayName.toLowerCase())
            .sort((a, b) => a.period - b.period || String(a.batch || "").localeCompare(String(b.batch || "")) || String(a.subject || "").localeCompare(String(b.subject || "")));
    })();

    // Unique subjects taught
    const subjectsSummary = [...new Map((Array.isArray(timetable) ? timetable : []).map(t => [t.subject, t])).values()];

    return (
        <DashboardLayout
            role={role || 'faculty'}
            roleLabel={`${(role || 'faculty').charAt(0).toUpperCase() + (role || 'faculty').slice(1)} Dashboard`}
            navItems={navItems}
            gradientClass="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-900"
        >
            <div className="space-y-8">
                {/* Header Banner */}
                <motion.div {...anim(0)}>
                    <Card className="overflow-hidden border-none shadow-xl rounded-[2rem] bg-gradient-to-br from-indigo-100/60 via-purple-50/50 to-blue-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900">
                        <div className="p-8 flex flex-col md:flex-row items-center gap-6">
                            <div className="h-24 w-24 rounded-3xl bg-white/60 dark:bg-white/10 border-4 border-white/60 dark:border-white/20 flex items-center justify-center text-4xl font-black shadow-lg text-indigo-600 dark:text-white shrink-0">
                                {(user.name || "F").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 font-black px-4 py-1.5 mb-3 border-none rounded-full tracking-widest text-[10px]">
                                    {(role || 'FACULTY').toUpperCase()}
                                </Badge>
                                <h2 className="text-4xl font-black tracking-tighter text-indigo-950 dark:text-white leading-tight">
                                    {user.name || "Faculty Member"}
                                </h2>
                                <p className="text-indigo-800/70 dark:text-indigo-200/70 font-bold mt-1">
                                    {user.department || "Department"} • {user.designation || "Designation"}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                                    <Badge className="bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-black px-4 py-1.5 rounded-xl shadow-sm border-none">
                                        <GraduationCap className="h-3.5 w-3.5 mr-1.5" /> {subjectsSummary.length} Subjects
                                    </Badge>
                                    <Badge className="bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-black px-4 py-1.5 rounded-xl shadow-sm border-none">
                                        <Calendar className="h-3.5 w-3.5 mr-1.5" /> {timetable.length} Classes/Week
                                    </Badge>
                                    {todayEntries.length > 0 && (
                                        <Badge className="bg-amber-500 text-white font-black px-4 py-1.5 rounded-xl shadow-sm border-none">
                                            <Clock className="h-3.5 w-3.5 mr-1.5" /> {todayEntries.length} Today
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Quick Action Cards */}
                <motion.div {...anim(1)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { label: "My Timetable",     desc: "View full weekly schedule",       icon: <Calendar className="h-6 w-6" />,      color: "from-indigo-100 to-indigo-50 dark:from-indigo-950/30 dark:to-slate-900", iconColor: "text-indigo-600", path: "/dashboard/faculty/timetable" },
                        ...(isMentor ? [
                            { label: "Mentor Dashboard", desc: "View mentees and sessions", icon: <Users className="h-6 w-6" />, color: "from-emerald-100 to-emerald-50 dark:from-emerald-950/30 dark:to-slate-900", iconColor: "text-emerald-600", path: "/dashboard/mentor" },
                        ] : []),
                        ...(isHandler ? [
                            { label: "Subject Handler", desc: "Manage students and notes", icon: <BookOpen className="h-6 w-6" />, color: "from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-slate-900", iconColor: "text-purple-600", path: "/dashboard/subject-handler/manage" },
                            { label: "AI Performance Analysis", desc: "AI-powered student insights", icon: <Brain className="h-6 w-6" />, color: "from-violet-100 to-violet-50 dark:from-violet-950/30 dark:to-slate-900", iconColor: "text-violet-600", path: "/dashboard/subject-handler/ai-analysis" },
                        ] : []),
                    ].map((item, i) => (
                        <motion.div key={i} onClick={() => navigate(item.path)}
                            className={`group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br ${item.color} border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5`}>
                            <div className={`h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm ${item.iconColor}`}>
                                {item.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-indigo-950 dark:text-white">{item.label}</p>
                                <p className="text-xs font-semibold text-muted-foreground">{item.desc}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Today's Classes */}
                <motion.div {...anim(2)} className="grid lg:grid-cols-3 gap-8">
                    <Card className="rounded-[2rem] border border-amber-100 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 border-t-8 border-t-amber-400">
                        <CardHeader className="p-6 pb-4">
                            <CardTitle className="text-xl font-black flex items-center gap-2 text-indigo-950 dark:text-white">
                                <Clock className="h-6 w-6 text-amber-500" /> Today's Classes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2 space-y-4">
                            {loading ? (
                                <div className="py-6 text-center text-muted-foreground font-bold animate-pulse">Loading…</div>
                            ) : todayEntries.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="font-bold">No classes today</p>
                                    <p className="text-xs">Enjoy your free day! 🎉</p>
                                </div>
                            ) : todayEntries.map((e, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/50 dark:bg-slate-800 border border-amber-100 dark:border-slate-700">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-white text-sm shrink-0">
                                        P{e.period}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-indigo-950 dark:text-white text-sm leading-tight">{e.subject}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{e.department} • {e.batch}</p>
                                    </div>
                                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">{e.time_slot || PERIOD_TIMES[e.period]}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Subjects Taught */}
                    <div className="lg:col-span-2">
                        <Card className="rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 h-full">
                            <CardHeader className="p-6 pb-4">
                                <CardTitle className="text-xl font-black flex items-center gap-2 text-indigo-950 dark:text-white">
                                    <BookOpen className="h-6 w-6 text-indigo-500" /> Subjects I Teach
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-2">
                                {loading ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                                    </div>
                                ) : subjectsSummary.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p className="font-bold">No subjects assigned via timetable yet.</p>
                                        <p className="text-xs mt-1">Contact admin to update your timetable.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {subjectsSummary.map((s, i) => (
                                            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm shrink-0">
                                                    {s.subject?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-indigo-950 dark:text-white text-sm leading-tight">{s.subject}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{s.department} • {s.batch}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>

                {/* Full Weekly Schedule */}
                {!loading && timetable.length > 0 && (
                    <motion.div {...anim(3)}>
                        <Card className="rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <CardHeader className="bg-slate-50/80 dark:bg-slate-900/50 p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-xl font-black flex items-center gap-2 text-indigo-950 dark:text-white">
                                    <Calendar className="h-6 w-6 text-indigo-500" /> Full Weekly Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-indigo-50 dark:bg-slate-800 text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">Day</th>
                                            {periods.map(p => (
                                                <th key={p} className="px-3 py-3 border-b border-slate-100 dark:border-slate-700 text-center min-w-[100px]">
                                                    P{p}<br /><span className="text-[9px] font-bold normal-case opacity-70">{PERIOD_TIMES[p]}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {days.map((day, di) => (
                                            <tr key={day} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50/30 transition-colors ${di % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/50'}`}>
                                                <td className="px-4 py-3 font-black text-indigo-950 dark:text-white border-r border-slate-100 dark:border-slate-800 min-w-[100px]">{day}</td>
                                                {periods.map(period => {
                                                    const entries = getEntries(day, period);
                                                    return (
                                                        <td key={period} className="px-3 py-3 border-r border-slate-100 dark:border-slate-800 text-center align-top">
                                                            {entries.length > 0 ? (
                                                                <div className="flex flex-col gap-1.5">
                                                                    {entries.map((entry, idx) => (
                                                                        <div key={`${entry.subject}-${entry.batch}-${idx}`} className="rounded-xl bg-indigo-50/70 dark:bg-slate-800 px-2 py-1.5">
                                                                            <span className="block font-black text-indigo-700 dark:text-indigo-400 text-xs leading-tight">{entry.subject}</span>
                                                                            <span className="block text-[9px] text-muted-foreground font-bold">{entry.batch}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-200 dark:text-slate-700 text-lg">—</span>
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
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default FacultyDashboard;
