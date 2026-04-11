import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    LayoutDashboard, BarChart3, Calendar, BookOpen, FileText, Bell, Upload, Clock, Brain, TrendingUp, Users, UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { Alert as AlertUI, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
    { label: "Academics", icon: <BarChart3 className="h-4 w-4" />, path: "/dashboard/student/academics" },
    { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
    { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/timetable" },
    { label: "Mentoring", icon: <Users className="h-4 w-4" />, path: "/dashboard/student/mentoring" },
    { label: "Requests", icon: <FileText className="h-4 w-4" />, path: "/dashboard/student/requests" },
    { label: "Certificates", icon: <Upload className="h-4 w-4" />, path: "/dashboard/student/certificates" },
    { label: "Notifications", icon: <Bell className="h-4 w-4" />, path: "/dashboard/student/notifications" },
];

const attendanceData = [
    { month: "Aug", value: 92 }, { month: "Sep", value: 88 }, { month: "Oct", value: 85 },
    { month: "Nov", value: 90 }, { month: "Dec", value: 87 }, { month: "Jan", value: 93 },
];

const marksData = [
    { subject: "DSA", sem1: 78, sem2: 85 },
    { subject: "DBMS", sem1: 82, sem2: 79 },
    { subject: "OS", sem1: 70, sem2: 88 },
    { subject: "ML", sem1: 65, sem2: 82 },
    { subject: "Networks", sem1: 75, sem2: 80 },
];

const defaultRecommendations = [
    { text: "Focus on DBMS — slight decline detected. Review normalization concepts.", priority: "high" },
    { text: "Your ML scores improved 26% — keep practicing neural network problems.", priority: "positive" },
    { text: "Daily goal: Complete 2 DSA problems and revise OS scheduling algorithms.", priority: "normal" },
    { text: "Consider attending the remedial session for Networks on Friday.", priority: "medium" },
];

const defaultSchedule = [
    { time: "09:00", label: "DSA Lecture", type: "class" },
    { time: "11:00", label: "Study Block", type: "study" },
    { time: "13:00", label: "Prayer Time", type: "personal" },
    { time: "14:30", label: "ML Lab", type: "class" },
    { time: "16:00", label: "Mentor Meeting", type: "meeting" },
    { time: "17:30", label: "Sports / ECA", type: "activity" },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const anim = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.08 },
});

const StudentDashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [alerts, setAlerts] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [mentor, setMentor] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null); // authoritative student profile

    useEffect(() => {
        // If not a student (no admission_number), redirect to role selection
        if (!user.admission_number) {
            navigate('/');
            return;
        }

        fetch(`http://localhost:5000/api/alerts/student/${user.admission_number}`)
            .then(res => res.json())
            .then(data => { if (data.success) setAlerts(data.data); })
            .catch(err => console.error("Error fetching alerts:", err));

        fetch(`http://localhost:5000/api/analytics/student/${user.admission_number}`)
            .then(res => res.json())
            .then(data => { if (data.success) setAnalytics(data.data); })
            .catch(err => console.error("Error fetching analytics:", err));

        fetch(`http://localhost:5000/api/student/my-mentor/${user.admission_number}`)
            .then(res => res.json())
            .then(data => { if (data.success && data.data) setMentor(data.data); })
            .catch(() => {});

        // Fetch authoritative student profile (name, batch, cgpa etc.)
        // and patch localStorage so the DashboardLayout header is also correct
        fetch(`http://localhost:5000/api/student/detail/${user.admission_number}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    setProfile(data.data);
                    // Fix stale localStorage: update name to the real student name
                    if (data.data.name && data.data.name !== user.name) {
                        const updated = { ...user, name: data.data.name, department: data.data.branch || user.department, batch: data.data.batch || user.batch };
                        localStorage.setItem('user', JSON.stringify(updated));
                    }
                }
            })
            .catch(() => {});
    }, [user.admission_number]);

    const [planner, setPlanner] = useState<any>(null);
    const [logHours, setLogHours] = useState<{ [key: number]: string }>({});
    const [recommendations, setRecommendations] = useState(defaultRecommendations);
    const [todaySchedule, setTodaySchedule] = useState(defaultSchedule);

    const fetchPlanner = () => {
        if (user.admission_number) {
            fetch(`http://localhost:5000/api/planner/${user.admission_number}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setPlanner(data.data);
                    }
                })
                .catch(err => console.error("Error fetching planner:", err));
        }
    };

    useEffect(() => {
        fetchPlanner();
    }, [user.admission_number]);

    useEffect(() => {
        if (!user.admission_number) return;
        fetch(`${API_BASE_URL}/api/planner/personalized/${user.admission_number}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    if (Array.isArray(data.data.recommendations) && data.data.recommendations.length > 0) {
                        setRecommendations(data.data.recommendations);
                    }
                    if (Array.isArray(data.data.schedule) && data.data.schedule.length > 0) {
                        setTodaySchedule(data.data.schedule);
                    }
                }
            })
            .catch(err => console.error("Error fetching personalized planner:", err));
    }, [user.admission_number]);

    const handleLogSession = (subjectId: number) => {
        const hours = parseFloat(logHours[subjectId] || "0");
        if (hours <= 0) return;

        fetch(`http://localhost:5000/api/planner/log-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_subject_id: subjectId, hours_completed: hours })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setLogHours(prev => ({ ...prev, [subjectId]: "" }));
                    fetchPlanner();
                } else {
                    alert("Failed to log session");
                }
            });
    };

    const getBatchDetails = () => {
        let startYear = 2024;
        let department = user.department || "Department";
        let admNo = user.admission_number || "";

        if (admNo) {
            const match = admNo.match(/^A?(\d{2})/i);
            if (match) {
                startYear = 2000 + parseInt(match[1], 10);
            }
        }

        let duration = 4;
        const d = department.toUpperCase();
        const a = admNo.toUpperCase();

        if (d.includes('IMCA') || d.includes('INTEGRATED') || a.includes('IMCA')) {
            duration = 5;
        } else if (d === 'MCA' || d === 'MBA' || d === 'DEPARTMENT OF COMPUTER APPLICATIONS' || a.includes('MCA') || a.includes('MBA')) {
            if (a.includes('IMCA')) {
                duration = 5;
            } else {
                duration = 2;
            }
        }

        let batchEnd = startYear + duration;

        // Semester logic based on: 2024->4, 2025->2, 2023->6, 2022->8
        // This is equivalent to: (2026 - startYear) * 2
        let currentSem = (2026 - startYear) * 2;
        if (currentSem < 1) currentSem = 1;

        return { startYear, batchEnd, currentSem, duration };
    };

    const batchDetails = getBatchDetails();

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
            {/* Profile Card */}
            <motion.div {...anim(0)}>
                <Card className="mb-6 overflow-hidden border-none shadow-md">
                    <div className="gradient-student p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-10 transform rotate-12">
                            <Brain size={180} />
                        </div>
                        <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl font-bold shadow-xl overflow-hidden">
                            {(profile?.photo_path || user.photo_path) ? (
                                <img
                                    src={`http://localhost:5000/static/${profile?.photo_path || user.photo_path}`}
                                    alt={profile?.full_name || user.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                // Use profile name for initials (not localStorage which may be stale)
                                (() => {
                                    const n = profile?.full_name || user.name || "ST";
                                    return n.substring(0, 2).toUpperCase();
                                })()
                            )}
                        </div>
                        <div className="z-10 flex-1">
                            {/* Student name from detail API — authoritative, not localStorage */}
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Student</p>
                            <h2 className="text-3xl font-bold tracking-tight">
                                {profile?.name || user.name || "Student Name"}
                            </h2>
                            <p className="opacity-90 text-sm mt-0.5">
                                {user.admission_number || "A24..."}
                                {(profile?.branch || user.department) && ` • ${profile?.branch || user.department}`}
                                {profile?.batch && ` • Batch ${profile.batch}`}
                            </p>
                            <div className="flex gap-3 mt-3 flex-wrap">
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1">
                                    Semester {batchDetails.currentSem}
                                </Badge>
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1">
                                    CGPA: {profile?.academics?.cgpa ?? "--"}
                                </Badge>
                                {mentor && (
                                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1 flex items-center gap-1.5">
                                        <UserCheck className="h-3.5 w-3.5" />
                                        Mentor: {mentor.name}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <motion.div {...anim(1)} className="mb-6">
                    <div className="space-y-3">
                        {alerts.map((alert, idx) => (
                            <AlertUI key={idx} variant={alert.type.includes('RISK') || alert.type.includes('LOW_') ? "destructive" : "default"} className="border-l-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="font-semibold">{alert.type.replace(/_/g, ' ')}</AlertTitle>
                                <AlertDescription>
                                    {alert.message}
                                    <span className="block text-xs opacity-70 mt-1">{alert.created_at}</span>
                                </AlertDescription>
                            </AlertUI>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Stats Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {[
                    {
                        label: "Attendance",
                        value: analytics ? `${analytics.attendance_percentage.toFixed(1)}%` : "...",
                        trend: analytics?.attendance_slope > 0.02 ? "up" : analytics?.attendance_slope < -0.05 ? "down" : "neutral",
                        color: "text-accent"
                    },
                    {
                        label: "Internal Avg",
                        value: analytics ? `${analytics.avg_internal_marks.toFixed(1)}/100` : "...",
                        trend: analytics?.marks_slope > 5 ? "up" : analytics?.marks_slope < -5 ? "down" : "neutral",
                        color: "text-student"
                    },
                    {
                        label: "Risk Score",
                        value: analytics ? analytics.risk_score.toFixed(1) : "...",
                        trend: "neutral",
                        color: analytics?.risk_score > 60 ? "text-destructive" : analytics?.risk_score < 30 ? "text-green-500" : "text-yellow-600"
                    },
                    {
                        label: "AI Status",
                        value: analytics ? analytics.status : "...",
                        trend: "neutral",
                        color: analytics?.status === 'Improving' ? "text-green-600" : analytics?.status === 'Declining' ? "text-destructive" : "text-primary"
                    },
                ].map((stat, i) => (
                    <motion.div key={stat.label} {...anim(i + 1)}>
                        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">{stat.label}</p>
                                <div className="flex items-center gap-2">
                                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                                    {stat.trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                                    {stat.trend === "down" && <TrendingUp className="h-5 w-5 text-red-500 transform rotate-180" />}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2 mb-6">
                {/* Attendance Chart */}
                <motion.div {...anim(5)}>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader><CardTitle className="text-lg">Attendance Trend</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={attendanceData}>
                                    <defs>
                                        <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(210, 80%, 50%)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(210, 80%, 50%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis domain={[70, 100]} tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="hsl(210, 80%, 50%)" fill="url(#attendGrad)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Marks Comparison */}
                <motion.div {...anim(6)}>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader><CardTitle className="text-lg">Marks Comparison (Sem-wise)</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={marksData} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" vertical={false} />
                                    <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="sem1" fill="hsl(220, 70%, 15%)" radius={[4, 4, 0, 0]} name="Sem 1" />
                                    <Bar dataKey="sem2" fill="hsl(175, 60%, 40%)" radius={[4, 4, 0, 0]} name="Sem 2" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Weekly Study Planner */}
            {planner && (
                <motion.div {...anim(6.5)} className="mb-6">
                    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-accent">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Target className="h-6 w-6 text-accent" /> Weekly Study Plan
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(planner.week_start).toLocaleDateString()} — {new Date(planner.week_end).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline" className="text-base py-1 px-3">
                                    Total: {planner.total_hours.toFixed(1)} hrs
                                </Badge>
                                {planner.booster_applied !== "None" && (
                                    <Badge className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1">
                                        <Zap className="h-3 w-3" /> {planner.booster_applied} Boost
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 mt-4">
                                {planner.subjects.map((sub: any) => {
                                    const progress = Math.min(100, Math.round((sub.completed_hours / sub.allocated_hours) * 100)) || 0;
                                    return (
                                        <div key={sub.id} className="p-4 rounded-xl border bg-card/50 hover:bg-muted/20 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-10 rounded-full ${sub.priority === 'Critical' ? 'bg-destructive' :
                                                        sub.priority === 'Moderate' ? 'bg-orange-500' : 'bg-blue-500'
                                                        }`} />
                                                    <div>
                                                        <h4 className="font-semibold text-base">{sub.subject_name}</h4>
                                                        <span className={`text-xs font-medium uppercase tracking-wider ${sub.priority === 'Critical' ? 'text-destructive' :
                                                            sub.priority === 'Moderate' ? 'text-orange-500' : 'text-blue-500'
                                                            }`}>
                                                            {sub.priority} PRIORITY
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
                                                    <Input
                                                        type="number"
                                                        placeholder="0.0"
                                                        className="w-20 h-8 text-center"
                                                        min="0.1"
                                                        step="0.1"
                                                        value={logHours[sub.id] !== undefined ? logHours[sub.id] : ""}
                                                        onChange={(e) => setLogHours({ ...logHours, [sub.id]: e.target.value })}
                                                    />
                                                    <Button size="sm" onClick={() => handleLogSession(sub.id)}>Log Hrs</Button>
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                                                <span>Completed: {sub.completed_hours.toFixed(1)} / {sub.allocated_hours.toFixed(1)} hrs</span>
                                                <span className="font-medium text-foreground">{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2 cursor-pointer" />
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* AI Recommendations & Schedule */}
            <div className="grid gap-6 lg:grid-cols-3">
                <motion.div className="lg:col-span-2" {...anim(7)}>
                    <Card className="h-full hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Brain className="h-5 w-5 text-accent" /> AI Recommendations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                ...recommendations
                            ].map((rec, i) => (
                                <div key={i} className="flex items-start gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:bg-muted/40">
                                    <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ${rec.priority === "high" ? "bg-destructive ring-2 ring-destructive/20" :
                                        rec.priority === "positive" ? "bg-accent ring-2 ring-accent/20" :
                                            "bg-muted-foreground"
                                        }`} />
                                    <p className="text-sm font-medium text-foreground leading-relaxed">{rec.text}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div {...anim(8)}>
                    <Card className="h-full hover:shadow-md transition-shadow">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" /> Today's Schedule</CardTitle></CardHeader>
                        <CardContent className="space-y-0 relative">
                            <div className="absolute left-[2.25rem] top-2 bottom-2 w-px bg-border z-0" />
                            {todaySchedule.map((slot, i) => (
                                <div key={i} className="flex items-center gap-3 py-3 relative z-10">
                                    <span className="w-14 text-xs font-semibold text-muted-foreground font-mono">{slot.time}</span>
                                    <div className={`h-4 w-4 rounded-full border-2 border-card shadow-sm ${slot.type === "class" ? "bg-student ring-2 ring-student/20" :
                                        slot.type === "meeting" ? "bg-mentor ring-2 ring-mentor/20" :
                                            slot.type === "activity" ? "bg-handler ring-2 ring-handler/20" :
                                                "bg-muted-foreground"
                                        }`} />
                                    <span className="text-sm font-medium text-foreground">{slot.label}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default StudentDashboard;
