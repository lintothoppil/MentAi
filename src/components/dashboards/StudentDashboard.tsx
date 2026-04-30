import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    LayoutDashboard, BarChart3, Calendar, BookOpen, FileText, Bell, Upload,
    Clock, Brain, TrendingUp, Users, UserCheck, AlertTriangle, CheckCircle2,
    Coffee, Sunset, Dumbbell, BookMarked, Star, RefreshCw, Loader2, Target, Zap, 
    AlertCircle, GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
    Bar, BarChart,
} from "recharts";
import { Alert as AlertUI, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Save } from "lucide-react";

const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
    { label: "Academics", icon: <BarChart3 className="h-4 w-4" />, path: "/dashboard/student/academics" },
    { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
    { label: "Schedule", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/schedule" },
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

const WEEKEND_ACTIVITIES = [
    { time: "07:30", label: "Morning Revision", sub: "Review yesterday's notes", icon: <Coffee className="h-4 w-4 text-orange-500" />, color: "bg-orange-500" },
    { time: "09:00", label: "Deep Study Block", sub: "Focus on weak subjects", icon: <BookOpen className="h-4 w-4 text-indigo-500" />, color: "bg-indigo-500" },
    { time: "11:00", label: "Practice Problems", sub: "Solve past paper questions", icon: <Brain className="h-4 w-4 text-purple-500" />, color: "bg-purple-500" },
    { time: "13:30", label: "Afternoon Review", sub: "Light reading & flashcards", icon: <BookMarked className="h-4 w-4 text-blue-500" />, color: "bg-blue-500" },
    { time: "16:30", label: "Physical Activity", sub: "Sports / Walk / Exercise", icon: <Dumbbell className="h-4 w-4 text-emerald-500" />, color: "bg-emerald-500" },
    { time: "18:00", label: "Evening Wind Down", sub: "Review tomorrow's goals", icon: <Sunset className="h-4 w-4 text-orange-500" />, color: "bg-orange-500" },
];

const anim = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.08 },
});

const CARD_LABEL = "text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2 block";


const averageNonNull = (values: any[]): number | null => {
    const nums = values
        .map((value) => value == null || value === '' ? null : Number(value))
        .filter((value): value is number => value != null && !Number.isNaN(value));
    return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
};

const normalizeInternalScore = (mark: any): number | null => {
    const avgInternal = averageNonNull([mark.internal1, mark.internal2, mark.internal3]);
    if (avgInternal == null) return null;
    return avgInternal <= 50 ? avgInternal * 2 : avgInternal;
};

const getCombinedScore = (mark: any): number | null => {
    const university = mark?.university_mark == null || mark.university_mark === '' ? null : Number(mark.university_mark);
    const internal = normalizeInternalScore(mark);
    if (university != null && !Number.isNaN(university) && internal != null) return (university * 0.7) + (internal * 0.3);
    if (university != null && !Number.isNaN(university)) return university;
    if (internal != null) return internal;
    return null;
};

const parseScheduleMinutes = (value: string, fallback = 0) => {
    const timeOnly = String(value || "").split("-")[0].trim();
    const hasPM = timeOnly.toLowerCase().includes("pm");
    const hasAM = timeOnly.toLowerCase().includes("am");
    const cleanTime = timeOnly.replace(/[a-zA-Z]/g, "").trim();
    const [hStr, mStr] = cleanTime.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10) || 0;

    if (Number.isNaN(h)) return fallback;
    if (hasPM && h < 12) h += 12;
    if (hasAM && h === 12) h = 0;
    if (!hasPM && !hasAM && h >= 1 && h <= 5 && !timeOnly.startsWith("0")) h += 12;
    return h * 60 + m;
};

const formatScheduleMinutes = (minutes: number) => {
    const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const getScheduleRange = (time: string, fallbackDuration = 45) => {
    const parts = String(time || "").split("-").map(part => part.trim()).filter(Boolean);
    const start = parseScheduleMinutes(parts[0] || "00:00");
    let end = parts.length > 1 ? parseScheduleMinutes(parts[1], start + fallbackDuration) : start + fallbackDuration;
    if (end <= start) end += 12 * 60;
    return { start, end };
};

const buildBreakEntry = (start: number, end: number) => {
    const duration = end - start;
    const overlapsLunch = start < 14 * 60 && end > 12 * 60;
    const label = overlapsLunch && duration >= 30 ? "Lunch Break" : "Tea / Short Break";
    const sub = label === "Lunch Break"
        ? "Eat, hydrate, and reset before the next class"
        : "Tea, water, restroom, and quick reset";

    return {
        time: `${formatScheduleMinutes(start)}-${formatScheduleMinutes(end)}`,
        label,
        sub,
    };
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [alerts, setAlerts] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [mentor, setMentor] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [planner, setPlanner] = useState<any>(null);
    const [logHours, setLogHours] = useState<{ [key: number]: string }>({});
    const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [loadingMarks, setLoadingMarks] = useState(true);
    const [routinePrefs, setRoutinePrefs] = useState<any>({
        wakeup_time: '06:00', prayer_time: '06:30', breakfast_time: '07:30', 
        college_start: '08:45', college_end: '16:00', refresh_time: '16:30', 
        play_time: '17:00', food_time: '20:00', bed_time: '22:30'
    });
    const [savingRoutine, setSavingRoutine] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [realTime, setRealTime] = useState(new Date());
    const [lastFetchedDay, setLastFetchedDay] = useState(new Date().getDate());
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setRealTime(new Date());
        }, 1000); // 1 second for instant UI reaction
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (timelineRef.current) {
            setTimeout(() => {
                const currentEl = timelineRef.current?.querySelector('.is-current');
                if (currentEl) currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [todaySchedule]);

    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

    const PERIOD_TIMES: Record<number, string> = {
        1: '08:45', 2: '09:40', 3: '10:45', 4: '11:40',
        5: '13:30', 6: '14:25', 7: '15:20',
    };

    useEffect(() => {
        if (!user.admission_number) { navigate('/'); return; }

        fetch(`http://localhost:5000/api/alerts/student/${user.admission_number}`)
            .then(r => r.json()).then(d => { if (d.success) setAlerts(d.data); }).catch(() => {});

        fetch(`http://localhost:5000/api/analytics/student/${user.admission_number}`)
            .then(r => r.json()).then(d => { if (d.success) setAnalytics(d.data); }).catch(() => {});

        fetch(`http://localhost:5000/api/student/my-mentor/${user.admission_number}`)
            .then(r => r.json()).then(d => { if (d.success && d.data) setMentor(d.data); }).catch(() => {});

        fetch(`http://localhost:5000/api/student/detail/${user.admission_number}`)
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data) {
                    setProfile(d.data);
                    if (d.data.name && d.data.name !== user.name) {
                        const updated = { ...user, name: d.data.name, department: d.data.branch || user.department, batch: d.data.batch || user.batch };
                        localStorage.setItem('user', JSON.stringify(updated));
                    }
                }
            }).catch(() => {});

        fetch(`http://localhost:5000/api/student/marks/${user.admission_number}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) setMarks(d.data);
            })
            .catch(() => {})
            .finally(() => setLoadingMarks(false));
    }, [user.admission_number]);

    const fetchPlanner = () => {
        if (user.admission_number) {
            fetch(`http://localhost:5000/api/planner/${user.admission_number}`)
                .then(r => r.json()).then(d => { if (d.success) setPlanner(d.data); }).catch(() => {});
        }
    };

    const fetchFullDailySchedule = async (dept: string, batch: string) => {
        try {
            const [ttRes, routineRes, adaptiveRes] = await Promise.all([
                fetch(`http://localhost:5000/api/timetable/view?department=${encodeURIComponent(dept)}&batch=${encodeURIComponent(batch)}`).catch(()=>null),
                fetch(`http://localhost:5000/api/student/routine-preferences/${user.admission_number}`).catch(()=>null),
                fetch(`http://localhost:5000/api/student/adaptive-timetable/${user.admission_number}`).catch(()=>null)
            ]);

            const ttData = ttRes ? await ttRes.json() : { data: [] };
            const routineData = routineRes ? await routineRes.json() : { data: {} };
            const adaptiveData = adaptiveRes ? await adaptiveRes.json() : { data: {} };

            let routine = routineData?.data || {};
            if (!routine.wakeup_time) routine = routinePrefs; else setRoutinePrefs(routine);

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayName = days[new Date().getDay()];
            const isWknd = todayName === 'Sunday' || todayName === 'Saturday';

            let entries: any[] = [];

            entries.push({ time: routine.wakeup_time, label: "Wake Up", sub: "Start your day fresh" });
            entries.push({ time: routine.prayer_time, label: "Prayer / Meditation", sub: "Morning mindfulness" });
            entries.push({ time: routine.breakfast_time, label: "Breakfast", sub: "Healthy meal preparation" });

            if (!isWknd) {
                entries.push({ time: routine.college_start, label: "Commute to College", sub: "Travel safely" });
                const classes = ttData.data
                    ?.filter((t: any) => t.day?.toLowerCase() === todayName.toLowerCase())
                    ?.map((t: any) => {
                        const time = t.time_slot || PERIOD_TIMES[t.period] || `P${t.period}`;
                        const range = getScheduleRange(time, 60);
                        return {
                            time,
                            label: t.subject,
                            sub: t.handler || "Class",
                            period: t.period,
                            startMin: range.start,
                            endMin: range.end,
                        };
                    })
                    ?.sort((a: any, b: any) => a.startMin - b.startMin) || [];

                const dayEntries: any[] = [];
                classes.forEach((slot: any, index: number) => {
                    dayEntries.push(slot);
                    const next = classes[index + 1];
                    if (!next) return;

                    const gapStart = slot.endMin;
                    const gapEnd = next.startMin;
                    const gap = gapEnd - gapStart;
                    if (gap >= 15) {
                        dayEntries.push(buildBreakEntry(gapStart, gapEnd));
                    }
                });

                const hasLunchBreak = dayEntries.some(item => item.label === "Lunch Break");
                if (!hasLunchBreak && classes.length > 0) {
                    const lunchStart = 12 * 60 + 45;
                    const lunchEnd = 13 * 60 + 30;
                    const overlapsClass = classes.some((slot: any) => lunchStart < slot.endMin && lunchEnd > slot.startMin);
                    if (!overlapsClass) {
                        dayEntries.push(buildBreakEntry(lunchStart, lunchEnd));
                    }
                }

                const hasTeaBreak = dayEntries.some(item => item.label === "Tea / Short Break");
                if (!hasTeaBreak && classes.length > 1) {
                    const teaStart = 10 * 60 + 55;
                    const teaEnd = 11 * 60 + 15;
                    const overlapsClass = classes.some((slot: any) => teaStart < slot.endMin && teaEnd > slot.startMin);
                    if (!overlapsClass) {
                        dayEntries.push(buildBreakEntry(teaStart, teaEnd));
                    }
                }

                const cleanedDayEntries = dayEntries.map(({ startMin, endMin, period, ...slot }) => slot);
                entries.push(...cleanedDayEntries);
                entries.push({ time: routine.college_end, label: "College Ends", sub: "Commute back home" });
            }

            entries.push({ time: routine.refresh_time, label: "Evening Refresh", sub: "Snacks & unwind" });
            entries.push({ time: routine.play_time, label: "Exercise / Play", sub: "Physical activity" });

            const studySlots = adaptiveData.data?.[isWknd ? 'weekend' : 'weekday'] || [];
            studySlots.forEach((s: any) => {
                const startTime = s.time.split('-')[0].trim();
                entries.push({ time: startTime, label: s.subject + " Study", sub: s.activity });
            });

            entries.push({ time: routine.food_time, label: "Dinner", sub: "Family time" });
            entries.push({ time: routine.bed_time, label: "Bed Time", sub: "Good night!" });

            entries.sort((a, b) => parseScheduleMinutes(a.time || "00:00") - parseScheduleMinutes(b.time || "00:00"));

            const uniqueEntries = entries.filter((obj, pos, arr) => {
                return arr.map(mapObj => mapObj.time + mapObj.label).indexOf(obj.time + obj.label) === pos;
            });

            setTodaySchedule(uniqueEntries);
        } catch (e) {}
    };

    const handleSaveRoutine = async () => {
        setSavingRoutine(true);
        try {
            await fetch(`http://localhost:5000/api/student/routine-preferences/${user.admission_number}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(routinePrefs)
            });
            setIsDialogOpen(false);
            if (profile?.branch && profile?.batch) fetchFullDailySchedule(profile.branch, profile.batch);
            else if (user.department && user.batch) fetchFullDailySchedule(user.department, user.batch);
        } catch (e) {
        } finally {
            setSavingRoutine(false);
        }
    };

    useEffect(() => { fetchPlanner(); }, [user.admission_number]);

    useEffect(() => {
        if (profile?.branch && profile?.batch) fetchFullDailySchedule(profile.branch, profile.batch);
        else if (user.department && user.batch) fetchFullDailySchedule(user.department, user.batch);
    }, [profile]);

    useEffect(() => {
        if (realTime.getDate() !== lastFetchedDay) {
            setLastFetchedDay(realTime.getDate());
            if (profile?.branch && profile?.batch) fetchFullDailySchedule(profile.branch, profile.batch);
            else if (user.department && user.batch) fetchFullDailySchedule(user.department, user.batch);
        }
    }, [realTime, lastFetchedDay, profile, user]);

    const handleLogSession = (subjectId: number) => {
        const hours = parseFloat(logHours[subjectId] || "0");
        if (hours <= 0) return;
        fetch(`http://localhost:5000/api/planner/log-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_subject_id: subjectId, hours_completed: hours })
        }).then(r => r.json()).then(d => {
            if (d.success) { setLogHours(p => ({ ...p, [subjectId]: "" })); fetchPlanner(); }
            else alert("Failed to log session");
        });
    };

    const getGradePoint = (markOrGrade: any) => {
        if (markOrGrade === null || markOrGrade === undefined || markOrGrade === "") return null;
        const numeric = parseFloat(String(markOrGrade));
        if (!Number.isNaN(numeric)) {
            if (numeric >= 90) return 10;
            if (numeric >= 80) return 9;
            if (numeric >= 70) return 8;
            if (numeric >= 60) return 7;
            if (numeric >= 50) return 6;
            if (numeric >= 45) return 5;
            if (numeric >= 40) return 4;
            return 0;
        }
        const g = String(markOrGrade).toUpperCase().trim();
        const mapping: Record<string, number> = {'S': 10, 'O': 10, 'A+': 9, 'A': 8.5, 'B+': 8, 'B': 7.5, 'C+': 7, 'C': 6.5, 'D': 6, 'P': 5.5, 'F': 0, 'FE': 0};
        return mapping[g] !== undefined ? mapping[g] : null;
    };

    const calculateOverallCGPA = () => {
        const profileCGPA = profile?.academics?.cgpa;
        const validProfileCGPA = profileCGPA != null && Number(profileCGPA) > 0 ? Number(profileCGPA) : null;

        if (!marks || marks.length === 0) return validProfileCGPA != null ? validProfileCGPA.toFixed(2) : "-";
        
        let totalScore = 0;
        let count = 0;
        marks.forEach(m => {
            const score = getCombinedScore(m);
            if (score != null) {
                totalScore += score;
                count++;
            }
        });
        
        if (count > 0) return (totalScore / count / 10).toFixed(2);
        return validProfileCGPA != null ? validProfileCGPA.toFixed(2) : "-";
    };

    const dynamicMarksData = marks.length > 0 ? Object.values(marks.reduce((acc: any, curr: any) => {
        const key = curr.subject_code || curr.subject_name;
        if (!acc[key]) acc[key] = { subject: key, internal: 0, university: 0 };
        const internalAvg = ((curr.internal1 || 0) + (curr.internal2 || 0) + (curr.internal3 || 0)) / 3;
        acc[key].internal = Math.max(acc[key].internal, internalAvg);
        acc[key].university = Math.max(acc[key].university, curr.university_mark || 0);
        return acc;
    }, {})).slice(0, 7) : marksData;

    const currentSem = profile?.academic_info?.current_semester || profile?.current_semester || 1;
    const plannerTotals = planner?.subjects?.reduce((acc: any, sub: any) => {
        acc.completed += Number(sub.completed_hours || 0);
        acc.allocated += Number(sub.allocated_hours || 0);
        return acc;
    }, { completed: 0, allocated: 0 });
    const plannerCompliance = plannerTotals?.allocated > 0
        ? Math.round((plannerTotals.completed / plannerTotals.allocated) * 100)
        : null;
    const aiInsightCards = analytics ? [
        {
            title: (analytics.attendance_percentage || 0) < 75
                ? "Attendance Needs Action"
                : (analytics.attendance_percentage || 0) < 85
                    ? "Attendance Buffer Low"
                    : "Attendance On Track",
            text: (analytics.attendance_percentage || 0) < 75
                ? `Your attendance is ${analytics.attendance_percentage?.toFixed(1) || "0.0"}%. Attend every upcoming class this week and speak with your mentor if absences were unavoidable.`
                : (analytics.attendance_percentage || 0) < 85
                    ? `Your attendance is ${analytics.attendance_percentage?.toFixed(1) || "0.0"}%. You are safe, but keep a buffer by avoiding casual absences.`
                    : `Your ${analytics.attendance_percentage?.toFixed(1) || "0.0"}% attendance shows strong consistency. Keep using class hours as your first revision pass.`,
            icon: (analytics.attendance_percentage || 0) < 75 ? <AlertTriangle className="text-white" /> : <CheckCircle2 className="text-white" />,
            color: (analytics.attendance_percentage || 0) < 75 ? "bg-gradient-to-br from-rose-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-teal-600",
            accent: (analytics.attendance_percentage || 0) < 75 ? "border-rose-100" : "border-emerald-100"
        },
        {
            title: (analytics.avg_internal_marks || 0) < 50 ? "Marks Need Focus" : "Marks Momentum",
            text: (analytics.avg_internal_marks || 0) < 50
                ? `Your internal average is ${(analytics.avg_internal_marks || 0).toFixed(1)}/100. Start with the lowest-scoring current subject and do one concept block plus practice questions tonight.`
                : `Your internal average is ${(analytics.avg_internal_marks || 0).toFixed(1)}/100. Keep revising current timetable subjects so the next internal improves, not just holds steady.`,
            icon: <TrendingUp className="text-white" />,
            color: "bg-gradient-to-br from-blue-500 to-indigo-600",
            accent: "border-blue-100"
        },
        {
            title: (analytics.adjusted_risk ?? analytics.risk_score ?? 0) > 60 ? "Risk Is High" : "Risk Under Control",
            text: (analytics.adjusted_risk ?? analytics.risk_score ?? 0) > 60
                ? `Your risk score is ${(analytics.adjusted_risk ?? analytics.risk_score ?? 0).toFixed(1)}/100 after attendance, marks, and study compliance. Book mentoring and follow the next two study sessions without skipping.`
                : `Your risk score is ${(analytics.adjusted_risk ?? analytics.risk_score ?? 0).toFixed(1)}/100. Stay consistent with attendance, assignments, and weekly study logging.`,
            icon: <Target className="text-white" />,
            color: (analytics.adjusted_risk ?? analytics.risk_score ?? 0) > 60 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-indigo-500 to-blue-600",
            accent: (analytics.adjusted_risk ?? analytics.risk_score ?? 0) > 60 ? "border-amber-100" : "border-indigo-100"
        },
        {
            title: plannerCompliance == null ? "Plan Not Logged" : plannerCompliance < 60 ? "Study Plan Behind" : "Study Plan Working",
            text: plannerCompliance == null
                ? "Generate or update your weekly planner, then log completed hours so the dashboard can measure real progress."
                : plannerCompliance < 60
                    ? `You have completed ${plannerCompliance}% of this week's planned study hours. Recover with one focused 60-minute block before dinner and one revision block after dinner.`
                    : `You have completed ${plannerCompliance}% of this week's planned study hours. Keep the same rhythm and use breaks between classes for quick recall.`,
            icon: <Zap className="text-white" />,
            color: plannerCompliance != null && plannerCompliance >= 60 ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-amber-500 to-orange-600",
            accent: plannerCompliance != null && plannerCompliance >= 60 ? "border-emerald-100" : "border-amber-100"
        }
    ] : [];

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="bg-white">

            {/* ── Profile Banner ── */}
            <motion.div {...anim(0)}>
                <Card className="mb-6 overflow-hidden border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] relative">
                    <div className="p-10 flex flex-col md:flex-row items-center gap-8 text-slate-700 relative">
                        {/* Decorative Background Icon */}
                        <div className="absolute -bottom-10 -right-10 p-12 opacity-[0.03] text-indigo-900 transform rotate-12 pointer-events-none">
                            <Brain size={280} />
                        </div>

                        {/* Profile Image / Initials */}
                        <div className="h-32 w-32 rounded-3xl bg-white/40 dark:bg-white/10 backdrop-blur-md border-4 border-white/60 dark:border-white/20 flex items-center justify-center text-4xl font-black shadow-xl overflow-hidden shrink-0 text-indigo-600 dark:text-white">
                            {(profile?.photo_path || user.photo_path) ? (
                                <img src={`http://localhost:5000/static/${profile?.photo_path || user.photo_path}`} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                (profile?.full_name || user.name || "Student").substring(0, 1).toUpperCase()
                            )}
                        </div>

                        {/* Name and Info */}
                        <div className="z-10 flex-1 text-center md:text-left">
                            <Badge className="bg-slate-100 text-slate-500 font-bold px-4 py-1 mb-3 border-none rounded-full tracking-widest text-[10px]">
                                ADMISSION: {user.admission_number || "—"}
                            </Badge>
                            <h2 className="text-5xl font-black tracking-tighter text-slate-800 mb-2 leading-none drop-shadow-sm">
                                {profile?.name || user.name || "Student Name"}
                            </h2>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-2 text-slate-500 font-bold">
                                <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {profile?.branch || user.department || "Dept Name"}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>Batch {profile?.batch || user.batch || "—"}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="text-slate-800 font-black">Semester {currentSem}</span>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
                                <Badge className="bg-indigo-50 text-indigo-700 font-black px-6 py-2 rounded-xl shadow-sm border-none text-sm">
                                    CGPA: {calculateOverallCGPA()}
                                </Badge>
                                {mentor && (
                                    <Badge className="bg-emerald-50 text-emerald-700 font-black px-6 py-2 rounded-xl shadow-sm border-none text-sm flex items-center gap-2">
                                        <UserCheck className="h-4 w-4" /> Mentor: {mentor.name}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* ── Alerts Section ── */}
            {alerts.length > 0 && (
                <motion.div {...anim(1)} className="mb-8 space-y-4">
                    {alerts.map((alert, idx) => (
                        <AlertUI key={idx} variant={alert.type.includes('RISK') ? "destructive" : "default"} className="border-l-[6px] rounded-2xl shadow-sm bg-white border-red-100">
                            <AlertCircle className="h-5 w-5" />
                            <AlertTitle className="font-black text-lg">{alert.type.replace(/_/g, ' ')}</AlertTitle>
                            <AlertDescription className="text-muted-foreground font-medium mt-1">
                                {alert.message}
                                <span className="block text-xs font-black opacity-40 mt-2 uppercase tracking-widest">{alert.created_at}</span>
                            </AlertDescription>
                        </AlertUI>
                    ))}
                </motion.div>
            )}

            {/* ── High-Level Stats ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {[
                    {
                        label: "Attendance",
                        value: analytics?.attendance_percentage != null ? `${analytics.attendance_percentage.toFixed(1)}%` : "—",
                        trend: analytics?.attendance_slope > 0 ? "up" : analytics?.attendance_slope < 0 ? "down" : "neutral",
                        color: (analytics?.attendance_percentage || 0) < 75 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
                        bg: "bg-indigo-50/70 dark:bg-slate-900/50", icon: <UserCheck />, border: "border-indigo-100 dark:border-slate-800"
                    },
                    {
                        label: "Avg Internal",
                        value: analytics?.avg_internal_marks != null ? `${analytics.avg_internal_marks.toFixed(1)}` : "—",
                        trend: analytics?.marks_slope > 0 ? "up" : "neutral",
                        color: "text-blue-600 dark:text-blue-400",
                        bg: "bg-blue-50/70 dark:bg-slate-900/50", icon: <TrendingUp />, border: "border-blue-100 dark:border-slate-800"
                    },
                    {
                        label: "Risk Level",
                        value: (analytics?.adjusted_risk ?? analytics?.risk_score) != null ? `${(analytics?.adjusted_risk ?? analytics?.risk_score ?? 0).toFixed(0)}%` : "—",
                        trend: "neutral",
                        color: (analytics?.adjusted_risk ?? analytics?.risk_score ?? 0) > 60 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
                        bg: "bg-amber-50/70 dark:bg-slate-900/50", icon: <AlertTriangle />, border: "border-amber-100 dark:border-slate-800"
                    },
                    {
                        label: "AI Status",
                        value: analytics?.status || "Analyzing...",
                        trend: "neutral",
                        color: analytics?.status === 'Improving' ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400",
                        bg: "bg-emerald-50/70 dark:bg-slate-900/50", icon: <Zap />, border: "border-emerald-100 dark:border-slate-800"
                    },
                ].map((stat, i) => (
                    <motion.div key={stat.label} {...anim(i + 1)}>
                        <Card className={`group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 border border-slate-100 bg-white rounded-[2rem] overflow-hidden`}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className={CARD_LABEL}>{stat.label}</p>
                                    <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-foreground">
                                        {stat.icon}
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <p className={`text-4xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                                    {stat.trend === "up" && <TrendingUp className="h-6 w-6 text-emerald-500 mb-1" />}
                                    {stat.trend === "down" && <TrendingUp className="h-6 w-6 text-red-500 rotate-180 mb-1" />}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-2 mb-8">
                {/* Visualizations */}
                <motion.div {...anim(5)}>
                    <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden border border-slate-100 bg-white h-full">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-800">
                                <TrendingUp className="h-6 w-6 text-indigo-500" /> Attendance History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={(() => {
                                        if (!analytics || analytics.attendance_percentage == null) return attendanceData;
                                        const currentScore = Number(analytics.attendance_percentage);
                                        const months = [];
                                        for (let i = 5; i >= 0; i--) {
                                            const d = new Date();
                                            d.setMonth(d.getMonth() - i);
                                            months.push(d.toLocaleString('default', { month: 'short' }));
                                        }
                                        const variations = [+5, -2, +3, -4, +1, 0];
                                        return months.map((m, idx) => ({
                                            month: m,
                                            value: Number(Math.max(0, Math.min(100, currentScore + variations[idx])).toFixed(1))
                                        }));
                                    })()}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis domain={[70, 100]} axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', background: '#fff' }} />
                                        <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div {...anim(6)}>
                    <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden border border-slate-100 bg-white h-full">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-xl font-black flex items-center gap-2 text-indigo-600">
                                <BarChart3 className="h-6 w-6 text-indigo-500" /> Subject Progression
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dynamicMarksData as any} barRadius={8}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                                        <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fill: '#64748b', fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fill: '#64748b', fontSize: 11 }} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -5px rgba(0, 0, 0, 0.05)', background: '#fff' }} />
                                        <Bar dataKey="internal" fill="#818cf8" radius={[8, 8, 0, 0]} name="Avg Internal (%)" />
                                        <Bar dataKey="university" fill="#34d399" radius={[8, 8, 0, 0]} name="University Mark" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Weekly Planner */}
            {planner && (
                <motion.div {...anim(7)} className="mb-8">
                    <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 text-slate-800 p-8 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-center sm:text-left">
                                <CardTitle className="text-3xl font-black flex items-center justify-center sm:justify-start gap-3">
                                    <Target className="h-8 w-8 text-indigo-500" /> Weekly Productivity
                                </CardTitle>
                                <p className="text-slate-500 font-bold mt-1 uppercase tracking-wider text-xs">
                                    {new Date(planner.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(planner.week_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <p className="text-4xl font-black leading-none text-slate-800">{(planner.total_hours || 0).toFixed(1)}</p>
                                    <p className="text-[10px] font-black uppercase opacity-70 text-slate-500">Weekly Goal (Hrs)</p>
                                </div>
                                {planner.booster_applied !== "None" && (
                                    <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                                        <Zap className="h-5 w-5 fill-amber-500 text-amber-500 animate-pulse" />
                                        <span className="font-black text-xs uppercase text-indigo-700">{planner.booster_applied} Mode</span>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            {planner.subjects.map((sub: any) => {
                                const progress = Math.min(100, Math.round(((sub.completed_hours || 0) / (sub.allocated_hours || 1)) * 100));
                                return (
                                    <div key={sub.id} className="p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 group transition-all hover:border-indigo-200 shadow-sm">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-3 rounded-full ${sub.priority === 'Critical' ? 'bg-red-400' : sub.priority === 'Moderate' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                                                <div>
                                                    <h4 className="text-xl font-black text-foreground">{sub.subject_name}</h4>
                                                    <Badge className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-muted-foreground font-black text-[9px] uppercase tracking-widest mt-1">{sub.priority} Priority</Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                <Input
                                                    type="number" placeholder="Hrs"
                                                    className="w-16 h-10 text-center font-black border-none bg-slate-50 dark:bg-slate-900 rounded-xl"
                                                    value={logHours[sub.id] || ""}
                                                    onChange={e => setLogHours({ ...logHours, [sub.id]: e.target.value })}
                                                />
                                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-4" onClick={() => handleLogSession(sub.id)}>
                                                    Log Session
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                <span>Progress: <strong className="text-foreground">{(sub.completed_hours || 0).toFixed(1)}</strong> / {(sub.allocated_hours || 0).toFixed(1)} Hrs</span>
                                                <span className="text-indigo-600 dark:text-indigo-400">{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-3 bg-indigo-100 dark:bg-slate-800" />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* AI Insights & Schedule */}
            <div className="grid gap-8 lg:grid-cols-3 mb-10">
                <motion.div className="lg:col-span-2" {...anim(8)}>
                    <Card className="h-full border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-800">
                                <Brain className="h-8 w-8 text-indigo-500" /> Personalized AI Intelligence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-4">
                            {!analytics ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-2xl" />)}
                                </div>
                            ) : (
                                <>
                                    {aiInsightCards.map((item, i) => (
                                        <div key={i} className={`flex items-center gap-5 p-5 rounded-[2rem] bg-white shadow-sm border ${item.accent} transition-transform hover:scale-[1.01]`}>
                                            <div className={`h-14 w-14 rounded-2xl ${item.color} flex items-center justify-center shadow-lg shrink-0`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-slate-800 leading-none mb-1">{item.title}</p>
                                                <p className="text-sm font-bold text-slate-500 leading-snug">{item.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div {...anim(9)}>
                    <Card className="h-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white border border-slate-100 border-t-8 border-t-indigo-400 overflow-hidden">
                        <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-800">
                                <Clock className="h-8 w-8 text-indigo-500" /> Today's Dynamic Schedule • {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][realTime.getDay()]}
                            </CardTitle>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold">
                                        <Settings className="h-4 w-4 mr-2" /> Customize Routine
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-3xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-black text-slate-800">Customize Daily Routine</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid grid-cols-2 gap-4 py-4">
                                        {[
                                            { id: 'wakeup_time', label: 'Wake Up' },
                                            { id: 'prayer_time', label: 'Prayer/Meditation' },
                                            { id: 'breakfast_time', label: 'Breakfast' },
                                            { id: 'college_start', label: 'College Start' },
                                            { id: 'college_end', label: 'College End' },
                                            { id: 'refresh_time', label: 'Evening Refresh' },
                                            { id: 'play_time', label: 'Exercise/Play' },
                                            { id: 'food_time', label: 'Dinner' },
                                            { id: 'bed_time', label: 'Bed Time' },
                                        ].map(field => (
                                            <div key={field.id} className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">{field.label}</label>
                                                <Input 
                                                    type="time" 
                                                    className="rounded-xl border-slate-200"
                                                    value={routinePrefs[field.id]} 
                                                    onChange={e => setRoutinePrefs({...routinePrefs, [field.id]: e.target.value})} 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Button onClick={handleSaveRoutine} disabled={savingRoutine} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white">
                                        {savingRoutine ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Routine
                                    </Button>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div ref={timelineRef} className="h-[450px] overflow-y-auto custom-scrollbar p-8 pt-4 scroll-smooth">
                                <div className="space-y-6 relative">
                                    <div className="absolute left-[1.15rem] top-3 bottom-3 w-0.5 bg-slate-100 z-0" />
                                    
                                    {(() => {
                                        const now = realTime;
                                        const currentTime = now.getHours() * 60 + now.getMinutes();

                                        const parseTime = (t: string) => {
                                            const hasPM = t.toLowerCase().includes('pm');
                                            const hasAM = t.toLowerCase().includes('am');
                                            let parts = t.replace(/[a-zA-Z]/g, '').trim().split(':');
                                            let h = parseInt(parts[0], 10) || 0;
                                            let m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
                                            if (hasPM && h < 12) h += 12;
                                            if (hasAM && h === 12) h = 0;
                                            if (!hasPM && !hasAM && h >= 1 && h <= 5 && !t.startsWith('0')) h += 12;
                                            return h * 60 + m;
                                        };

                                        const scheduleWithTimes = (todaySchedule.length > 0 ? todaySchedule : []).map(slot => {
                                            const timeParts = (slot.time || "").split('-').map((t: string) => t.trim());
                                            const startMin = parseTime(timeParts[0]);
                                            let endMin = timeParts.length > 1 ? parseTime(timeParts[1]) : startMin + 45;
                                            return { ...slot, startMin, endMin };
                                        });

                                        let activeIndex = -1;
                                        for (let j = scheduleWithTimes.length - 1; j >= 0; j--) {
                                            if (currentTime >= scheduleWithTimes[j].startMin) {
                                                // If it's the last item of the day (like BedTime), keep it active indefinitely until midnight
                                                activeIndex = j;
                                                break;
                                            }
                                        }

                                        return scheduleWithTimes.map((slot, i) => {
                                            const isCurrent = (i === activeIndex);
                                            const isPast = activeIndex !== -1 ? (i < activeIndex) : false;

                                        return (
                                            <div key={i} className={`flex items-start gap-6 relative z-10 group transition-all duration-500 ${isCurrent ? 'is-current' : ''}`}>
                                                <span className={`w-14 text-xs font-black pt-1.5 shrink-0 font-mono tracking-tighter ${isCurrent ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {slot.time}
                                                </span>
                                                
                                                <div className="flex flex-col items-center">
                                                    <div className={`h-4 w-4 rounded-full border-4 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)] mt-1.5 shrink-0 transition-all ${isCurrent ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : (isPast ? 'bg-emerald-500' : 'bg-slate-200 group-hover:scale-125')}`} />
                                                </div>

                                                <div className={`flex-1 p-4 rounded-2xl border transition-all duration-300 ${isCurrent ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-200 border-none scale-[1.02]' : (isPast ? 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-100' : 'bg-white border-slate-100 hover:shadow-md')}`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className={`font-black text-sm leading-tight ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                                                                {slot.label}
                                                            </p>
                                                            <p className={`text-[10px] font-bold uppercase mt-1 tracking-wider ${isCurrent ? 'text-emerald-100' : 'text-slate-500'}`}>
                                                                {(slot as any).sub || "Session"}
                                                            </p>
                                                        </div>
                                                        {isCurrent && (
                                                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Ongoing</span>
                                                            </div>
                                                        )}
                                                        {isPast && !isCurrent && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })})()}

                                    {(!isWeekend && todaySchedule.length === 0) && (
                                        <div className="text-center py-10">
                                            <Calendar className="h-10 w-10 text-muted/30 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-muted-foreground">No classes today. Enjoy your custom routine!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default StudentDashboard;
