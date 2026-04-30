import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle, Bell, BookOpen, Brain, Calendar, CheckCircle2,
    FileText, LayoutDashboard, Loader2, RefreshCw, Sparkles, Target,
    TrendingUp, Users, Zap,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SmartStudyPlanner from "@/components/dashboards/SmartStudyPlanner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BASE = "http://localhost:5000";

const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
    { label: "Academics", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/student/academics" },
    { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
    { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/timetable" },
    { label: "Mentoring", icon: <Users className="h-4 w-4" />, path: "/dashboard/student/mentoring" },
    { label: "Requests", icon: <FileText className="h-4 w-4" />, path: "/dashboard/student/requests" },
    { label: "Certificates", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/student/certificates" },
    { label: "Notifications", icon: <Bell className="h-4 w-4" />, path: "/dashboard/student/notifications" },
];

interface InsightCard {
    title: string;
    body: string;
    type: string;
    icon: string;
}

interface FailedSubject {
    subject: string;
    mark?: number | null;
    attendance_pct?: number | null;
    handler_id?: number | null;
    handler_name: string;
    class_slots: string[];
    notes_available: number;
    recommended_hours: number;
    quick_fix: string;
    pass_strategy: string[];
}

interface SupportNote {
    id: number;
    subject: string;
    title: string;
    description?: string;
    download_url?: string | null;
    uploaded_by_name?: string;
}

interface SupportReport {
    student_name: string;
    summary: {
        overall_score: number;
        overall_status: string;
        attendance_pct: number;
        avg_marks: number;
        cgpa?: number | null;
        planner_score: number;
        planner_status: string;
        completed_sessions: number;
        skipped_sessions: number;
        planned_sessions: number;
        failed_subject_count: number;
        available_note_count: number;
    };
    failed_subjects: FailedSubject[];
    improving_areas: { title: string; detail: string }[];
    attention_areas: { title: string; detail: string }[];
    ongoing_areas: { title: string; detail: string }[];
    recommended_actions: string[];
    available_notes: SupportNote[];
    upcoming_remedials: {
        id: number;
        subject: string;
        title: string;
        scheduled_date: string;
        time_slot: string;
        mode: string;
        meeting_link?: string;
        handler_name: string;
    }[];
    attendance_alert?: string;
    focus_now?: { subject: string; reason: string; action_today: string }[];
    today_plan?: { time: string; subject: string; type: string; tasks: string[] }[];
    weak_subjects_strategy?: { subject: string; problem: string; solution: string }[];
    failure_analysis?: { subject: string; reason: string; fix: string }[];
    behavior_correction?: string;
    motivation?: string;
}

const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.3 },
});

const cardTone: Record<string, string> = {
    warning: "border-l-red-500 bg-red-50/70",
    success: "border-l-emerald-500 bg-emerald-50/70",
    info: "border-l-blue-500 bg-blue-50/70",
    tip: "border-l-purple-500 bg-purple-50/70",
};

export default function StudentInsightsPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const admNo = user.admission_number || "";
    const firstName = user.name?.split(" ")[0] || "there";

    const [cards, setCards] = useState<InsightCard[]>([]);
    const [report, setReport] = useState<SupportReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [preferredDate, setPreferredDate] = useState("");
    const [preferredTime, setPreferredTime] = useState("18:30");

    const loadAll = useCallback(async (showRefresh = false) => {
        if (!admNo) return;
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [insightsRes, reportRes] = await Promise.all([
                fetch(`${BASE}/api/ai/insights/${admNo}`),
                fetch(`${BASE}/api/student/support-report/${admNo}`),
            ]);
            const [insightsData, reportData] = await Promise.all([insightsRes.json(), reportRes.json()]);

            if (insightsData.success) setCards(insightsData.data || []);
            if (reportData.success) setReport(reportData.data || null);
        } catch {
            toast.error("Couldn't load the latest student support report");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admNo]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const requestSupport = async (subject: FailedSubject, actionType: "session_request" | "notes_request") => {
        if (!subject.handler_id) {
            toast.error("No subject handler is mapped for this subject yet");
            return;
        }

        const actionKey = `${actionType}-${subject.subject}`;
        setActionLoading(actionKey);
        try {
            const res = await fetch(`${BASE}/api/student/support-actions/${admNo}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action_type: actionType,
                    subject: subject.subject,
                    handler_id: subject.handler_id,
                    preferred_date: actionType === "session_request" ? preferredDate : "",
                    preferred_time: actionType === "session_request" ? preferredTime : "",
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Request failed");
            toast.success(data.message || "Support request sent");
            loadAll(true);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Support request failed");
        } finally {
            setActionLoading(null);
        }
    };

    const summaryCards = useMemo(() => {
        if (!report) return [];
        return [
            { label: "Recovery Score", value: `${report.summary.overall_score}/100`, tone: "text-indigo-700" },
            { label: "Current CGPA", value: report.summary.cgpa ? report.summary.cgpa.toFixed(2) : "—", tone: "text-emerald-700" },
            { label: "Failed Subjects", value: String(report.summary.failed_subject_count), tone: "text-red-700" },
            { label: "Planner Score", value: `${report.summary.planner_score}/100`, tone: "text-amber-700" },
        ];
    }, [report]);

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
            <div className="space-y-6 pb-6">
                <motion.div {...fade(0)}>
                    <div className="rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        style={{ background: "linear-gradient(135deg, #0F2A44 0%, #1b3555 100%)" }}>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                    <Brain className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black">Student Recovery Insights</h1>
                                    <p className="text-white/75 text-sm">Hi {firstName}, this report is built from your real marks, attendance, CGPA, and study-plan activity.</p>
                                </div>
                            </div>
                            {report && (
                                <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 w-fit">
                                    {report.summary.overall_status}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => loadAll(true)}
                                disabled={refreshing}
                                className="bg-white/10 hover:bg-white/20 text-white border-0"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {loading ? (
                    <Card className="rounded-3xl border-dashed">
                        <CardContent className="py-16 text-center text-slate-500">
                            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
                            Loading your support report...
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {summaryCards.map((item, index) => (
                                <motion.div key={item.label} {...fade(index * 0.04)}>
                                    <Card className="rounded-2xl border shadow-sm">
                                        <CardContent className="p-5">
                                            <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">{item.label}</p>
                                            <p className={`text-3xl font-black mt-2 ${item.tone}`}>{item.value}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {cards.map((card, index) => (
                                <motion.div key={`${card.title}-${index}`} {...fade(index * 0.05)}>
                                    <Card className={`border-l-4 rounded-2xl shadow-sm ${cardTone[card.type] || cardTone.info}`}>
                                        <CardContent className="p-4">
                                            <p className="text-xl">{card.icon}</p>
                                            <h3 className="font-black text-sm mt-2">{card.title}</h3>
                                            <p className="text-sm text-slate-700 mt-1">{card.body}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>

                        <Card className="rounded-3xl border shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg font-black">
                                    <Sparkles className="h-5 w-5 text-indigo-600" /> Recommended next actions
                                </CardTitle>
                                <CardDescription>These actions are generated from your real weak areas and current plan activity.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {(report?.recommended_actions || []).map((item, index) => (
                                    <div key={`${item}-${index}`} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
                                        {item}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>


                        <div className="grid xl:grid-cols-2 gap-4">
                            <Card className="rounded-3xl border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg font-black">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" /> Attendance Monitor
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-slate-700">
                                        {report?.attendance_alert || "Attendance alert unavailable."}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg font-black">
                                        <Zap className="h-5 w-5 text-red-600" /> Focus Now
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {report?.focus_now?.length ? report.focus_now.map((item, index) => (
                                        <div key={`${item.subject}-${index}`} className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
                                            <p className="font-black text-sm">{item.subject}</p>
                                            <p className="text-sm text-slate-700 mt-1">{item.reason}</p>
                                            <p className="text-sm text-red-700 mt-2 font-medium">{item.action_today}</p>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-500">No urgent focus items right now.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="rounded-3xl border shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg font-black">
                                    <Calendar className="h-5 w-5 text-indigo-600" /> Today's Plan
                                </CardTitle>
                                <CardDescription>Max 2-3 focused sessions, prioritized by current risk.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {report?.today_plan?.length ? report.today_plan.map((item, index) => (
                                    <div key={`${item.subject}-${item.time}-${index}`} className="rounded-2xl border p-4">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <p className="font-black text-sm">{item.subject}</p>
                                            <Badge variant="outline">{item.time}</Badge>
                                        </div>
                                        <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mt-1">{item.type}</p>
                                        <div className="mt-3 space-y-2">
                                            {item.tasks.map((task, taskIndex) => (
                                                <div key={taskIndex} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                                                    {task}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-500">Today's plan is not ready yet.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg font-black">
                                    <Target className="h-5 w-5 text-red-600" /> Failed subject recovery
                                </CardTitle>
                                <CardDescription>Backlog subjects are listed here with tips, handler support, and extra study hours to include in your week.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs uppercase font-bold text-slate-500 mb-2">Preferred support date</p>
                                        <input
                                            type="date"
                                            value={preferredDate}
                                            onChange={(e) => setPreferredDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-slate-500 mb-2">Preferred support time</p>
                                        <input
                                            type="time"
                                            value={preferredTime}
                                            onChange={(e) => setPreferredTime(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>

                                {report?.failed_subjects.length ? report.failed_subjects.map((subject) => {
                                    const sessionKey = `session_request-${subject.subject}`;
                                    const notesKey = `notes_request-${subject.subject}`;
                                    return (
                                        <div key={subject.subject} className="rounded-3xl border border-red-100 bg-red-50/40 p-5 space-y-4">
                                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-lg font-black text-slate-900">{subject.subject}</h3>
                                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Needs pass support</Badge>
                                                        <Badge variant="outline">{subject.recommended_hours} hrs/week</Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-700">{subject.quick_fix}</p>
                                                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                                        <span>Mark: {subject.mark ?? "—"}</span>
                                                        <span>Attendance: {subject.attendance_pct ?? "—"}%</span>
                                                        <span>Handler: {subject.handler_name}</span>
                                                    </div>
                                                    {!!subject.class_slots.length && (
                                                        <p className="text-xs text-slate-500">Current class slots: {subject.class_slots.join(" · ")}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <Button
                                                        onClick={() => requestSupport(subject, "session_request")}
                                                        disabled={actionLoading === sessionKey}
                                                        className="bg-indigo-600 hover:bg-indigo-700"
                                                    >
                                                        {actionLoading === sessionKey ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                                        Request study session
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => requestSupport(subject, "notes_request")}
                                                        disabled={actionLoading === notesKey}
                                                    >
                                                        {actionLoading === notesKey ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                                        Ask notes
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-3">
                                                {subject.pass_strategy.map((tip, index) => (
                                                    <div key={index} className="rounded-2xl bg-white p-3 border text-sm text-slate-700">
                                                        {tip}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-700">
                                        No failed subjects are currently listed. Keep using the planner so weaker current-semester subjects do not become new backlogs.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid xl:grid-cols-3 gap-4">
                            {[
                                { title: "Improving", icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, items: report?.improving_areas || [], tone: "border-emerald-100 bg-emerald-50/50" },
                                { title: "Needs Attention", icon: <AlertTriangle className="h-4 w-4 text-red-600" />, items: report?.attention_areas || [], tone: "border-red-100 bg-red-50/50" },
                                { title: "Ongoing", icon: <Zap className="h-4 w-4 text-amber-600" />, items: report?.ongoing_areas || [], tone: "border-amber-100 bg-amber-50/50" },
                            ].map((group) => (
                                <Card key={group.title} className={`rounded-3xl border shadow-sm ${group.tone}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base font-black">{group.icon} {group.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {group.items.length ? group.items.map((item, index) => (
                                            <div key={`${item.title}-${index}`} className="rounded-2xl bg-white/90 p-3 border">
                                                <p className="font-bold text-sm">{item.title}</p>
                                                <p className="text-sm text-slate-600 mt-1">{item.detail}</p>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-slate-500">No items available right now.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="grid xl:grid-cols-2 gap-4">
                            <Card className="rounded-3xl border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg font-black">
                                        <BookOpen className="h-5 w-5 text-indigo-600" /> Notes and study material
                                    </CardTitle>
                                    <CardDescription>Use uploaded notes first, then ask the subject handler for more if something is still unclear.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {report?.available_notes.length ? report.available_notes.map((note) => (
                                        <div key={note.id} className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <p className="font-bold text-sm">{note.title}</p>
                                                <p className="text-xs text-slate-500 mt-1">{note.subject} · {note.uploaded_by_name || "Subject Handler"}</p>
                                                {note.description ? <p className="text-sm text-slate-600 mt-1">{note.description}</p> : null}
                                            </div>
                                            {note.download_url ? (
                                                <Button asChild variant="outline">
                                                    <a href={`${BASE}${note.download_url}`} target="_blank" rel="noreferrer">Open note</a>
                                                </Button>
                                            ) : null}
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-500">No dedicated notes are available yet. Use the “Ask notes” action above for the weakest subject.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg font-black">
                                        <Calendar className="h-5 w-5 text-indigo-600" /> Upcoming remedial support
                                    </CardTitle>
                                    <CardDescription>Any remedial sessions already scheduled for you will appear here.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {report?.upcoming_remedials.length ? report.upcoming_remedials.map((item) => (
                                        <div key={item.id} className="rounded-2xl border p-4">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <p className="font-bold text-sm">{item.title}</p>
                                                <Badge variant="outline">{item.subject}</Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 mt-2">{item.scheduled_date} · {item.time_slot} · {item.mode}</p>
                                            <p className="text-xs text-slate-500 mt-1">Handled by {item.handler_name}</p>
                                            {item.meeting_link ? (
                                                <Button asChild variant="outline" className="mt-3">
                                                    <a href={item.meeting_link} target="_blank" rel="noreferrer">Open meeting link</a>
                                                </Button>
                                            ) : null}
                                        </div>
                                    )) : (
                                        <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">
                                            No remedial class is scheduled yet. Request a personalized study session from the failed subject card above.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <motion.div {...fade(0.1)}>
                            <SmartStudyPlanner admissionNumber={admNo} />
                        </motion.div>

                        <Card className="rounded-3xl border border-emerald-100 bg-emerald-50/60 shadow-sm">
                            <CardContent className="p-5 flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                                <p className="text-sm text-emerald-800">
                                    The planner below now uses your current timetable plus backlog recovery hours. If you skip a session, your mentor and subject handler can be alerted and track follow-up support.
                                </p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
