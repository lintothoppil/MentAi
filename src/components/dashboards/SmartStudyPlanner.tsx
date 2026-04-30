/**
 * SmartStudyPlanner.tsx
 * Complete AI-powered study planner component.
 * Tabs: Plan | Tracking | Adaptive Insights | Preferences + AI Assistant chat
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Brain, Sparkles, RefreshCw, Calendar, CheckCircle2, Clock,
    BookOpen, TrendingUp, AlertCircle, Send, Loader2, Play, Flag,
    SkipForward, Timer, Target, Zap, ChevronDown, ChevronUp,
    MessageSquare, Save, Bell, BarChart3, Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
    id: number;
    day: string;
    subject: string;
    topic: string;
    session_type: string;
    priority: string;
    planned_start: string;
    planned_end: string;
    planned_duration_minutes: number;
    actual_duration_minutes?: number;
    status: "not_started" | "in_progress" | "completed" | "skipped" | "rescheduled";
    completion_percent: number;
    notes?: string;
    difficulty_level: number;
    distraction_level: number;
    reason: string;
}

interface StudyPlan {
    summary?: string;
    riskLevel?: string;
    weeklyGoal?: string;
    motivationalMessage?: string;
    alerts?: string[];
    focusSubjects?: { subject: string; reason: string; recommendedHours: number }[];
}

interface Progress {
    compliance_score: number;
    completed_sessions: number;
    missed_sessions: number;
    planned_minutes: number;
    actual_minutes: number;
    status_label: string;
    high_priority_completed: number;
    high_priority_total: number;
    generated_insights: string; // JSON string
}

interface Prefs {
    weekday_study_hours: number;
    weekend_study_hours: number;
    preferred_start_time: string;
    preferred_end_time: string;
    weak_subjects: string[];
    strong_subjects: string[];
    learning_style: string;
    reminder_enabled: boolean;
    target_marks: number;
}

interface ChatMsg {
    role: "user" | "assistant";
    content: string;
}

interface InsightPanelItem {
    title: string;
    body: string;
    tone: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BASE = "http://localhost:5000";

const statusColor = (s: string) => ({
    not_started: "bg-slate-100 text-slate-500 border-slate-200",
    in_progress:  "bg-blue-50 text-blue-700 border-blue-200",
    completed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    skipped:      "bg-red-50 text-red-600 border-red-200",
    rescheduled:  "bg-amber-50 text-amber-700 border-amber-200",
}[s] || "bg-slate-100 text-slate-500");

const priorityDot = (p: string) => ({
    high:   "bg-red-500",
    medium: "bg-amber-400",
    low:    "bg-emerald-400",
}[p] || "bg-slate-300");

const fade = (i = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.04, duration: 0.3 },
});

const parseGeneratedInsights = (raw?: string): string[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
    } catch {
        return [];
    }
};

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session, onUpdate }: { session: Session; onUpdate: (id: number, updates: Partial<Session>) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState(session.notes || "");

    const updateStatus = (status: Session["status"]) => {
        const extra: Partial<Session> = { status };
        if (status === "completed") extra.completion_percent = 100;
        if (status === "in_progress") extra.completion_percent = 50;
        if (status === "skipped") extra.completion_percent = 0;
        onUpdate(session.id, extra);
    };

    return (
        <div className={`rounded-2xl border ${statusColor(session.status)} p-4 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${priorityDot(session.priority)}`} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-sm text-slate-900 dark:text-white">{session.subject}</p>
                            <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-1.5 h-4 border-slate-200">
                                {session.session_type}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{session.topic}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {session.planned_start} – {session.planned_end} · {session.planned_duration_minutes} min
                        </p>
                    </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                    {session.status === "not_started" && (
                        <Button size="sm" onClick={() => updateStatus("in_progress")}
                            className="h-7 px-2.5 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1">
                            <Play className="h-3 w-3" /> Start
                        </Button>
                    )}
                    {session.status === "in_progress" && (
                        <Button size="sm" onClick={() => updateStatus("completed")}
                            className="h-7 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Done
                        </Button>
                    )}
                    {(session.status === "not_started" || session.status === "in_progress") && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus("skipped")}
                            className="h-7 px-2.5 text-[10px] text-red-600 border-red-200 hover:bg-red-50 font-bold gap-1">
                            <SkipForward className="h-3 w-3" /> Skip
                        </Button>
                    )}
                    <button onClick={() => setExpanded(!expanded)} className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                        {expanded ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
                    </button>
                </div>
            </div>

            {session.reason && (
                <p className="text-[10px] text-slate-500 mt-2 italic pl-5 border-l-2 border-slate-200">
                    {session.reason}
                </p>
            )}

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Difficulty</p>
                                    <Slider value={[session.difficulty_level]} min={1} max={5} step={1}
                                        onValueChange={([v]) => onUpdate(session.id, { difficulty_level: v })} className="h-1" />
                                    <p className="text-[9px] text-slate-400 text-right mt-1">{session.difficulty_level}/5</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Distractions</p>
                                    <Slider value={[session.distraction_level]} min={1} max={5} step={1}
                                        onValueChange={([v]) => onUpdate(session.id, { distraction_level: v })} className="h-1" />
                                    <p className="text-[9px] text-slate-400 text-right mt-1">{session.distraction_level}/5</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Notes</p>
                                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="What did you cover? Any difficulties?"
                                    className="text-xs h-16 resize-none rounded-xl" />
                                <Button size="sm" className="mt-1.5 h-6 text-[9px] bg-slate-800 text-white"
                                    onClick={() => onUpdate(session.id, { notes })}>Save notes</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────

function AiAssistant({ admNo }: { admNo: string }) {
    const [msgs, setMsgs] = useState<ChatMsg[]>([
        { role: "assistant", content: "Hi, I am your MentAi study coach. Ask what to study now, how to catch up, or how to improve marks, and I will answer using your planner data." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

    const QUICK = [
        "What should I study now?",
        "I missed today's plan",
        "How can I improve marks?",
        "Explain my risk level",
    ];

    const send = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;
        setInput("");
        setMsgs(p => [...p, { role: "user", content: msg }]);
        setLoading(true);
        try {
            const r = await fetch(`${BASE}/api/ai/chat-planner`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    admission_number: admNo, message: msg,
                    history: msgs.slice(-6).map(m => ({ role: m.role, content: m.content }))
                })
            });
            const d = await r.json();
            if (d.success) setMsgs(p => [...p, { role: "assistant", content: d.reply }]);
        } catch { setMsgs(p => [...p, { role: "assistant", content: "Couldn't reach the server. Try again shortly." }]); }
        finally { setLoading(false); }
    };

    return (
        <Card className="border-0 shadow-xl ring-1 ring-border rounded-2xl overflow-hidden flex flex-col h-[480px] bg-white dark:bg-slate-950">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                    <p className="font-black text-sm text-white">MentAi Study Coach</p>
                    <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] text-white/70 uppercase font-bold">Online</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {msgs.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-[12px] shadow-sm ${
                            m.role === "user"
                                ? "bg-indigo-600 text-white rounded-tr-none"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50"
                        }`}>
                            <div className="prose-xs dark:prose-invert">
                                <ReactMarkdown>{m.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 border border-slate-200 flex gap-1 items-center">
                            <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce" />
                            <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <div className="p-3 border-t bg-white dark:bg-slate-900/50 space-y-2">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                    {QUICK.map(q => (
                        <button key={q} onClick={() => send(q)}
                            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-[9px] font-black text-indigo-700 dark:text-indigo-400 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all">
                            {q}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Textarea value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder="Ask your study coach..." rows={1}
                        className="flex-1 text-[12px] min-h-[36px] max-h-24 rounded-xl resize-none py-2" />
                    <Button onClick={() => send()} disabled={!input.trim() || loading} size="icon"
                        className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartStudyPlanner({ admissionNumber }: { admissionNumber: string }) {
    const [tab, setTab] = useState("plan");
    const [plan, setPlan] = useState<StudyPlan | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [prefs, setPrefs] = useState<Prefs>({
        weekday_study_hours: 3, weekend_study_hours: 5,
        preferred_start_time: "18:00", preferred_end_time: "21:00",
        weak_subjects: [], strong_subjects: [],
        learning_style: "visual", reminder_enabled: true, target_marks: 75,
    });
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingPrefs, setSavingPrefs] = useState(false);

    const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const todaySessions = sessions.filter(s => s.day === todayName);

    const fetchAll = useCallback(async () => {
        if (!admissionNumber) return;
        setLoading(true);
        try {
            const [planRes, progressRes, prefsRes] = await Promise.all([
                fetch(`${BASE}/api/study-plan/${admissionNumber}`),
                fetch(`${BASE}/api/study-plan/progress/${admissionNumber}`),
                fetch(`${BASE}/api/study-plan/preferences/${admissionNumber}`),
            ]);
            const [pd, prog, pref] = await Promise.all([planRes.json(), progressRes.json(), prefsRes.json()]);
            if (pd.success) {
                setPlan(pd.plan);
                setSessions(pd.sessions || []);
            }
            if (prog.success && prog.progress) setProgress(prog.progress);
            if (pref.success && pref.preferences) setPrefs(pref.preferences);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [admissionNumber]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const generatePlan = async () => {
        if (!admissionNumber || generating) return;
        setGenerating(true);
        toast.info("Generating your AI study plan…");
        try {
            const r = await fetch(`${BASE}/api/ai/generate-study-plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id: admissionNumber }),
            });
            const d = await r.json();
            if (d.success) {
                toast.success(`Plan ready! (${d.source === "gemini" ? "Gemini AI" : "Smart Fallback"})`);
                await fetchAll();
                setTab("plan");
            } else {
                toast.error(d.message || "Failed to generate plan");
            }
        } catch { toast.error("Network error"); }
        finally { setGenerating(false); }
    };

    const updateSession = async (sessionId: number, updates: Partial<Session>) => {
        try {
            await fetch(`${BASE}/api/study-plan/session/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId, ...updates }),
            });
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
            // Refresh progress
            const r = await fetch(`${BASE}/api/study-plan/progress/${admissionNumber}`);
            const d = await r.json();
            if (d.success && d.progress) setProgress(d.progress);
            if (updates.status === "completed") toast.success("Session completed! 🎉");
        } catch { toast.error("Couldn't update session"); }
    };

    const savePrefs = async () => {
        setSavingPrefs(true);
        try {
            const r = await fetch(`${BASE}/api/study-plan/preferences/${admissionNumber}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(prefs),
            });
            const d = await r.json();
            if (d.success) {
                toast.success("Preferences saved. Regenerating your plan...");
                await generatePlan();
            }
        } catch { toast.error("Failed to save"); }
        finally { setSavingPrefs(false); }
    };

    const complianceColor = (score: number) =>
        score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : score >= 40 ? "text-orange-500" : "text-red-600";

    const complianceBg = (score: number) =>
        score >= 80 ? "from-emerald-500 to-teal-500" : score >= 60 ? "from-amber-400 to-orange-400" : "from-orange-400 to-red-500";

    const trackedSessions = (progress?.completed_sessions || 0) + (progress?.missed_sessions || 0) + sessions.filter(s => s.status === "in_progress").length;
    const hasTrackedProgress = trackedSessions > 0 || (progress?.actual_minutes || 0) > 0;
    const plannedSessionsCount = sessions.length;
    const activeSessions = sessions.filter(s => !["completed", "skipped"].includes(s.status));
    const firstActionSession = todaySessions.find(s => !["completed", "skipped"].includes(s.status))
        || activeSessions[0]
        || sessions[0]
        || null;
    const parsedInsights = parseGeneratedInsights(progress?.generated_insights);
    const prioritySubjectsText = plan?.focusSubjects?.length
        ? plan.focusSubjects.slice(0, 3).map(item => item.subject).join(", ")
        : "";
    const insightCards: InsightPanelItem[] = hasTrackedProgress
        ? parsedInsights.map((insight, index) => {
            const lowerInsight = insight.toLowerCase();
            if (lowerInsight.includes("priority subjects")) {
                return { title: "Priority subjects", body: insight, tone: "border-red-100 bg-red-50/50" };
            }
            if (lowerInsight.includes("attendance")) {
                return { title: "Attendance recovery", body: insight, tone: "border-amber-100 bg-amber-50/60" };
            }
            if (lowerInsight.includes("remedial") || lowerInsight.includes("action")) {
                return { title: "Next action", body: insight, tone: "border-blue-100 bg-blue-50/60" };
            }
            if (lowerInsight.includes("marks average") || lowerInsight.includes("understanding")) {
                return { title: "Marks focus", body: insight, tone: "border-indigo-100 bg-indigo-50/60" };
            }
            return {
                title: index === 0 ? "MentAi insight" : `Insight ${index + 1}`,
                body: insight,
                tone: "border-slate-200 bg-slate-50/80",
            };
        })
        : [
            {
                title: "Start here",
                body: firstActionSession
                    ? `Begin with ${firstActionSession.subject} at ${firstActionSession.planned_start}. Finish one focused session to activate your recovery score and personal insights.`
                    : "Your plan is ready. Start your first scheduled session to activate your recovery score and personal insights.",
                tone: "border-emerald-100 bg-emerald-50/70",
            },
            {
                title: "Priority subjects",
                body: prioritySubjectsText
                    ? `Give first attention to ${prioritySubjectsText}. These subjects were placed first because they need the fastest recovery.`
                    : "Your next session is already prioritized. Begin with the subject shown in today's plan.",
                tone: "border-red-100 bg-red-50/50",
            },
            {
                title: "Attendance recovery",
                body: parsedInsights.find(item => item.toLowerCase().includes("attendance"))
                    || "Protect attendance this week, collect missed notes on the same day, and do not skip difficult classes.",
                tone: "border-amber-100 bg-amber-50/60",
            },
            {
                title: "What to do today",
                body: parsedInsights.find(item => item.toLowerCase().includes("marks average"))
                    || "Keep today simple: learn one concept, test yourself with a few questions, and mark the session complete when you finish.",
                tone: "border-blue-100 bg-blue-50/60",
            },
        ];
    const scoreBreakdown = progress ? [
        {
            label: "Sessions kept",
            value: hasTrackedProgress && progress.completed_sessions + progress.missed_sessions > 0
                ? Math.round((progress.completed_sessions / (progress.completed_sessions + progress.missed_sessions)) * 50)
                : 0,
            max: 50,
        },
        {
            label: "Study time followed",
            value: hasTrackedProgress && progress.planned_minutes > 0
                ? Math.min(30, Math.round((progress.actual_minutes / progress.planned_minutes) * 30))
                : 0,
            max: 30,
        },
        {
            label: "Priority subjects covered",
            value: hasTrackedProgress
                ? (progress.high_priority_total > 0
                    ? Math.round((progress.high_priority_completed / progress.high_priority_total) * 20)
                    : 20)
                : 0,
            max: 20,
        },
    ] : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <Brain className="h-7 w-7 text-indigo-500" />
                        Smart Adaptive Study Planner
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        AI-guided study plan, manual refresh, and simple progress tracking
                    </p>
                </div>
                <div className="flex gap-2">
                    {plan && (
                        <Button variant="outline" size="sm" onClick={fetchAll} className="h-8 text-xs gap-2">
                            <RefreshCw className="h-3 w-3" /> Refresh
                        </Button>
                    )}
                    <Button onClick={generatePlan} disabled={generating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg gap-2">
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {plan ? "Regenerate AI Plan" : "Generate AI Plan"}
                    </Button>
                </div>
            </div>

            {/* Motivation + Alerts Banner */}
            {plan?.motivationalMessage && (
                <motion.div {...fade(0)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-200 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-white font-bold text-sm">{plan.motivationalMessage}</p>
                        {plan.weeklyGoal && <p className="text-indigo-200 text-xs mt-1">🎯 {plan.weeklyGoal}</p>}
                    </div>
                </motion.div>
            )}
            {plan?.alerts && plan.alerts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {plan.alerts.map((a, i) => (
                        <Badge key={i} className="bg-red-50 text-red-700 border-red-200 text-[11px] font-bold gap-1">
                            <AlertCircle className="h-3 w-3" /> {a}
                        </Badge>
                    ))}
                </div>
            )}

            {!plan && !generating ? (
                <Card className="border-dashed py-16 text-center rounded-2xl">
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <Brain className="h-10 w-10 text-indigo-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">No Study Plan Yet</h3>
                            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                                Click "Generate AI Plan" to create a personalized weekly schedule based on your marks, attendance, and preferences.
                            </p>
                        </div>
                        <Button onClick={generatePlan} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                            <Sparkles className="h-4 w-4" /> Generate My First Plan
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {[
                            { value: "plan", label: "Plan", icon: <Calendar className="h-4 w-4" /> },
                            { value: "tracking", label: "Tracking", icon: <Timer className="h-4 w-4" /> },
                            { value: "insights", label: "Insights", icon: <BarChart3 className="h-4 w-4" /> },
                            { value: "preferences", label: "Preferences", icon: <Target className="h-4 w-4" /> },
                        ].map(t => (
                            <TabsTrigger key={t.value} value={t.value}
                                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm font-bold text-xs gap-1.5">
                                {t.icon} {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* ── PLAN TAB ─────────────────────────────────────────── */}
                    <TabsContent value="plan" className="space-y-6">
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Day-by-day sessions */}
                            <div className="lg:col-span-2 space-y-6">
                                {DAYS.map(day => {
                                    const daySessions = sessions.filter(s => s.day === day);
                                    if (daySessions.length === 0) return null;
                                    const isToday = day === todayName;
                                    return (
                                        <motion.div key={day} {...fade()}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide ${isToday ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                                                    <Calendar className="h-3 w-3" /> {day}
                                                    {isToday && <span className="ml-1">· TODAY</span>}
                                                </div>
                                                <div className="flex-1 h-px bg-slate-200" />
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    {daySessions.filter(s => s.status === "completed").length}/{daySessions.length} done
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {daySessions.map(sess => (
                                                    <SessionCard key={sess.id} session={sess} onUpdate={updateSession} />
                                                ))}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {sessions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No sessions found. Generate a plan first.
                                    </div>
                                )}
                            </div>

                            {/* Focus Subjects Sidebar */}
                            <div className="space-y-4">
                                {plan?.focusSubjects && plan.focusSubjects.length > 0 && (
                                    <Card className="border border-orange-100 bg-orange-50/30 rounded-2xl overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-black flex items-center gap-2 text-orange-700">
                                                <Flag className="h-4 w-4" /> Focus Areas
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {plan.focusSubjects.map((f, i) => (
                                                <div key={i} className="p-3 bg-white rounded-xl border border-orange-100">
                                                    <p className="font-black text-sm">{f.subject}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{f.reason}</p>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <Clock className="h-3 w-3 text-orange-500" />
                                                        <span className="text-[10px] font-bold text-orange-600">{f.recommendedHours}h recommended</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* AI Assistant */}
                                <AiAssistant admNo={admissionNumber} />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── TRACKING TAB ─────────────────────────────────────── */}
                    <TabsContent value="tracking" className="space-y-6">
                        <div className="grid lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-black">
                                        <Calendar className="h-3 w-3" /> Today · {todayName}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{todaySessions.length} sessions planned</span>
                                </div>

                                {todaySessions.length === 0 ? (
                                    <Card className="border-dashed rounded-2xl py-10 text-center">
                                        <CardContent>
                                            <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                                            <p className="font-bold text-slate-600">No sessions planned for today</p>
                                            <p className="text-sm text-muted-foreground mt-1">Generate or view the full weekly plan.</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        {todaySessions.map(sess => (
                                            <SessionCard key={sess.id} session={sess} onUpdate={updateSession} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Today's Stats */}
                                <Card className="rounded-2xl border border-indigo-100 bg-indigo-50/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-black text-indigo-700 flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4" /> Today's Stats
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            { label: "Completed", value: todaySessions.filter(s => s.status === "completed").length, color: "text-emerald-600" },
                                            { label: "In Progress", value: todaySessions.filter(s => s.status === "in_progress").length, color: "text-blue-600" },
                                            { label: "Skipped", value: todaySessions.filter(s => s.status === "skipped").length, color: "text-red-500" },
                                            { label: "Remaining", value: todaySessions.filter(s => s.status === "not_started").length, color: "text-slate-600" },
                                        ].map(stat => (
                                            <div key={stat.label} className="flex justify-between text-sm">
                                                <span className="text-slate-600 font-medium">{stat.label}</span>
                                                <span className={`font-black ${stat.color}`}>{stat.value}</span>
                                            </div>
                                        ))}
                                        <div className="pt-1">
                                            <Progress
                                                value={todaySessions.length ? (todaySessions.filter(s => s.status === "completed").length / todaySessions.length) * 100 : 0}
                                                className="h-2" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* AI Chat */}
                                <AiAssistant admNo={admissionNumber} />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── INSIGHTS TAB ─────────────────────────────────────── */}
                    <TabsContent value="insights" className="space-y-6">
                        {/* Compliance Score  */}
                        {progress && (
                            <motion.div {...fade(0)}>
                                <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                                    <div className={`bg-gradient-to-r ${complianceBg(progress.compliance_score)} p-6 text-white`}>
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Study Progress</p>
                                                <p className="text-5xl font-black leading-none mt-2">{hasTrackedProgress ? Math.round(progress.compliance_score) : "Ready"}</p>
                                                <p className="text-lg font-bold opacity-90 mt-2">
                                                    {hasTrackedProgress ? progress.status_label : "Your plan is ready to begin"}
                                                </p>
                                                <p className="text-sm opacity-80 mt-2 max-w-2xl">
                                                    {hasTrackedProgress
                                                        ? "This score now reflects your real session completion, study time, and high-priority coverage."
                                                        : "Start one planned session and mark it complete. MentAi will begin showing a real recovery score instead of empty tracking values."}
                                                </p>
                                            </div>
                                            <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                <Award className="h-12 w-12 text-white/80" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                                            {(hasTrackedProgress
                                                ? [
                                                    { label: "Sessions planned", value: plannedSessionsCount },
                                                    { label: "Completed", value: progress.completed_sessions },
                                                    { label: "Missed", value: progress.missed_sessions },
                                                    { label: "Study minutes", value: progress.actual_minutes },
                                                ]
                                                : [
                                                    { label: "Sessions planned", value: plannedSessionsCount },
                                                    { label: "Today", value: todaySessions.length },
                                                    { label: "Focus subjects", value: plan?.focusSubjects?.length || 0 },
                                                    { label: "Start time", value: firstActionSession?.planned_start || "--" },
                                                ]).map(s => (
                                                <div key={s.label} className="text-center bg-white/10 rounded-xl p-3">
                                                    <p className="text-2xl font-black">{s.value}</p>
                                                    <p className="text-[9px] uppercase font-bold opacity-70">{s.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* Score breakdown */}
                        {progress && (
                            <Card className="rounded-2xl border shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-black flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-indigo-600" /> How your progress is measured
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {!hasTrackedProgress ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                                            <p className="font-semibold text-slate-800">Your score has not started yet.</p>
                                            <p>Finish your first planned session, then mark it done. After that, this section will show your real consistency, time-following, and priority coverage.</p>
                                        </div>
                                    ) : (
                                        scoreBreakdown.map(item => (
                                            <div key={item.label}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-slate-600">{item.label}</span>
                                                    <span className="font-black text-slate-900">{`${item.value}/${item.max}`}</span>
                                                </div>
                                                <Progress value={(item.value / item.max) * 100} className="h-1.5" />
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-3">
                            <h3 className="font-black text-sm uppercase tracking-wide text-slate-500 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" /> Clear Action Guide
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {insightCards.map((insight, i) => (
                                    <motion.div key={`${insight.title}-${i}`} {...fade(i * 0.08)}
                                        className={`p-4 rounded-2xl border ${insight.tone} flex items-start gap-3`}>
                                        <AlertCircle className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-black text-slate-900">{insight.title}</p>
                                            <p className="text-sm text-slate-700 mt-1 leading-6">{insight.body}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* AI Assistant for insights */}
                        <AiAssistant admNo={admissionNumber} />

                        {!progress && (
                            <Card className="border-dashed rounded-2xl py-10 text-center">
                                <CardContent>
                                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                    <p className="font-bold">No progress data yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">Complete some sessions to see your compliance score.</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ── PREFERENCES TAB ──────────────────────────────────── */}
                    <TabsContent value="preferences" className="space-y-6">
                        <Card className="rounded-2xl border shadow-md">
                            <CardHeader className="pb-2 border-b bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-black flex items-center gap-2">
                                            <Target className="h-4 w-4 text-indigo-600" /> Study Preferences
                                        </CardTitle>
                                        <CardDescription className="text-xs">Customize how AI builds your study plan</CardDescription>
                                    </div>
                                    <Button size="sm" onClick={savePrefs} disabled={savingPrefs}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1.5 font-bold">
                                        {savingPrefs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        Save & Regenerate
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                                {/* Left: Time settings */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                        <Clock className="h-3 w-3" /> Schedule Config
                                    </h4>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-800">Preferred Study Start</label>
                                        <input type="time" value={prefs.preferred_start_time}
                                            onChange={e => setPrefs(p => ({ ...p, preferred_start_time: e.target.value }))}
                                            className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm font-mono" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-800">Preferred Study End</label>
                                        <input type="time" value={prefs.preferred_end_time}
                                            onChange={e => setPrefs(p => ({ ...p, preferred_end_time: e.target.value }))}
                                            className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm font-mono" />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span>Weekday Hours</span>
                                            <Badge className="bg-indigo-600 text-white border-0">{prefs.weekday_study_hours}h</Badge>
                                        </div>
                                        <Slider value={[prefs.weekday_study_hours]} min={1} max={8} step={0.5}
                                            onValueChange={([v]) => setPrefs(p => ({ ...p, weekday_study_hours: v }))} />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span>Weekend Hours</span>
                                            <Badge className="bg-purple-600 text-white border-0">{prefs.weekend_study_hours}h</Badge>
                                        </div>
                                        <Slider value={[prefs.weekend_study_hours]} min={1} max={12} step={0.5}
                                            onValueChange={([v]) => setPrefs(p => ({ ...p, weekend_study_hours: v }))} />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span>Target Marks %</span>
                                            <Badge className="bg-emerald-600 text-white border-0">{prefs.target_marks}%</Badge>
                                        </div>
                                        <Slider value={[prefs.target_marks]} min={40} max={100} step={5}
                                            onValueChange={([v]) => setPrefs(p => ({ ...p, target_marks: v }))} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-800">Learning Style</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["visual", "auditory", "kinesthetic", "reading"].map(s => (
                                                <button key={s} onClick={() => setPrefs(p => ({ ...p, learning_style: s }))}
                                                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold capitalize transition-all ${
                                                        prefs.learning_style === s
                                                            ? "border-indigo-600 bg-indigo-600 text-white"
                                                            : "border-slate-200 text-slate-600 hover:border-indigo-300"
                                                    }`}>{s}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-bold text-slate-800">Reminders</label>
                                        <button onClick={() => setPrefs(p => ({ ...p, reminder_enabled: !p.reminder_enabled }))}
                                            className={`relative h-5 w-9 rounded-full transition-colors ${prefs.reminder_enabled ? "bg-indigo-600" : "bg-slate-200"}`}>
                                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs.reminder_enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                                        </button>
                                        <Bell className={`h-4 w-4 ${prefs.reminder_enabled ? "text-indigo-600" : "text-slate-300"}`} />
                                    </div>
                                </div>

                                {/* Right: Subject tags */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3" /> Subject Profiling
                                    </h4>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-800">Weak Subjects (comma-separated)</label>
                                        <Textarea
                                            value={prefs.weak_subjects.join(", ")}
                                            onChange={e => setPrefs(p => ({
                                                ...p,
                                                weak_subjects: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                                            }))}
                                            placeholder="e.g. Mathematics, Physics"
                                            className="rounded-xl text-sm h-20 resize-none" />
                                        <p className="text-[10px] text-slate-400">AI will prioritize these with more sessions and higher priority.</p>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-800">Strong Subjects (comma-separated)</label>
                                        <Textarea
                                            value={prefs.strong_subjects.join(", ")}
                                            onChange={e => setPrefs(p => ({
                                                ...p,
                                                strong_subjects: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                                            }))}
                                            placeholder="e.g. English, History"
                                            className="rounded-xl text-sm h-20 resize-none" />
                                        <p className="text-[10px] text-slate-400">These get lighter sessions to maintain performance.</p>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                        <p className="text-[10px] font-black uppercase text-amber-700 mb-2 flex items-center gap-1">
                                            <Sparkles className="h-3 w-3" /> After saving
                                        </p>
                                        <p className="text-xs text-amber-800">
                                            Click "Save & Regenerate" above, then go to the Plan tab to see your updated AI-generated schedule. The new plan uses your preferences to allocate time wisely.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
