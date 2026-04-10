import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, BarChart3, Calendar, FileText, Bell,
    Upload, Brain, Users, Send, Loader2, Sparkles, BookOpen,
    RefreshCw, Zap, MessageSquare, TrendingUp, TrendingDown,
    Minus, AlertTriangle, CheckCircle2, Info, Lightbulb, X, Dumbbell,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

// ─── nav ───────────────────────────────────────────────────────────
const navItems = [
    { label: "Overview",      icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
    { label: "Academics",     icon: <BarChart3 className="h-4 w-4" />,       path: "/dashboard/student/academics" },
    { label: "AI Insights",   icon: <Brain className="h-4 w-4" />,           path: "/dashboard/student/insights" },
    { label: "Timetable",     icon: <Calendar className="h-4 w-4" />,        path: "/dashboard/student/timetable" },
    { label: "Mentoring",     icon: <Users className="h-4 w-4" />,           path: "/dashboard/student/mentoring" },
    { label: "Requests",      icon: <FileText className="h-4 w-4" />,        path: "/dashboard/student/requests" },
    { label: "Certificates",  icon: <Upload className="h-4 w-4" />,          path: "/dashboard/student/certificates" },
    { label: "Notifications", icon: <Bell className="h-4 w-4" />,            path: "/dashboard/student/notifications" },
];

// ─── types ─────────────────────────────────────────────────────────
interface InsightCard { title: string; body: string; type: string; icon: string }
interface ChatMsg      { role: "user" | "assistant"; content: string; ts: Date }
interface CombinedBlock {
    time: string;
    subject?: string;
    focus?: string;
    duration_hours?: number;
    type?: string;
    goal?: string;
    intensity?: string;
    duration_minutes?: number;
}
interface CombinedDayPlan {
    day: string;
    date: string;
    class_hours: string[];
    study_blocks: CombinedBlock[];
    workout_blocks: CombinedBlock[];
    break_guidance: string;
    sleep_guidance: string;
    recovery_day: boolean;
}

// ─── card theme map ────────────────────────────────────────────────
const THEMES: Record<string, { grad: string; glow: string; iconComp: typeof AlertTriangle; text: string }> = {
    warning: { grad: "from-red-500/15 to-orange-500/10",  glow: "shadow-red-500/10",    iconComp: AlertTriangle,  text: "text-red-400" },
    success: { grad: "from-emerald-500/15 to-green-500/10", glow: "shadow-emerald-500/10", iconComp: CheckCircle2, text: "text-emerald-400" },
    info:    { grad: "from-blue-500/15 to-cyan-500/10",    glow: "shadow-blue-500/10",   iconComp: Info,           text: "text-blue-400" },
    tip:     { grad: "from-purple-500/15 to-violet-500/10", glow: "shadow-purple-500/10", iconComp: Lightbulb,     text: "text-purple-400" },
};

const QUICK = [
    "📊 How are my marks?",
    "📅 Give me a weekly plan",
    "⚠️ What's my risk level?",
    "📈 How to improve attendance?",
    "🎯 Which subject needs focus?",
    "💡 Top 3 study tips for me",
];

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
    openai:       { label: "GPT-4o mini",      color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    gemini:       { label: "Gemini Flash",      color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    "rule-based": { label: "Smart Analysis",    color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const fade = (i = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

// ═══════════════════════════════════════════════════════════════════
export default function StudentInsightsPage() {
    const user  = JSON.parse(localStorage.getItem("user") || "{}");
    const admNo = user.admission_number || "";
    const firstName = user.name?.split(" ")[0] || "there";

    // states
    const [cards, setCards]               = useState<InsightCard[]>([]);
    const [cardsLoading, setCardsLoading] = useState(true);
    const [source, setSource]             = useState("");
    const [messages, setMessages]         = useState<ChatMsg[]>([]);
    const [input, setInput]               = useState("");
    const [chatLoading, setChatLoading]   = useState(false);
    const [plan, setPlan]                 = useState("");
    const [planLoading, setPlanLoading]   = useState(false);
    const [planSource, setPlanSource]     = useState("");
    const [planOpen, setPlanOpen]         = useState(false);
    const [combinedPlanOpen, setCombinedPlanOpen] = useState(false);
    const [combinedPlanLoading, setCombinedPlanLoading] = useState(false);
    const [combinedMode, setCombinedMode] = useState<"balanced" | "exam_week" | "light_workout" | "revision_priority">("balanced");
    const [combinedDays, setCombinedDays] = useState<CombinedDayPlan[]>([]);
    const [combinedTargets, setCombinedTargets] = useState<{ study_hours_target: number; workout_sessions_target: number } | null>(null);
    const [wellnessNote, setWellnessNote] = useState("");
    const [compliance, setCompliance] = useState<{ study_compliance: number; workout_compliance: number; balanced_routine_score: number } | null>(null);
    const [expandCard, setExpandCard]     = useState<number | null>(null);
    const chatEnd = useRef<HTMLDivElement>(null);

    // fetch insights
    const fetchInsights = useCallback(async () => {
        if (!admNo) return;
        setCardsLoading(true);
        try {
            const r = await fetch(`${API_BASE}/api/ai/insights/${admNo}`);
            const d = await r.json();
            if (d.success) { setCards(d.data); setSource(d.source); }
        } catch { /* silent */ }
        finally { setCardsLoading(false); }
    }, [admNo]);

    useEffect(() => { fetchInsights(); }, [fetchInsights]);
    useEffect(() => {
        if (!admNo) return;
        fetch(`${API_BASE}/api/planner/workout-compliance/${admNo}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setCompliance({
                        study_compliance: d.data.study_compliance ?? 0,
                        workout_compliance: d.data.workout_compliance ?? 0,
                        balanced_routine_score: d.data.balanced_routine_score ?? 0,
                    });
                }
            })
            .catch(() => {});
    }, [admNo]);

    // scroll chat
    useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    // welcome
    useEffect(() => {
        if (!admNo) return;
        setMessages([{
            role: "assistant",
            content: `Hi **${firstName}**! 👋 I'm **MentorAI**, your personal academic advisor.\n\nI have real-time access to your attendance, marks, risk score, and study plan. Ask me anything — or tap a quick question below!`,
            ts: new Date(),
        }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admNo]);

    // send message
    const sendMsg = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || chatLoading) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: msg, ts: new Date() }]);
        setChatLoading(true);
        try {
            const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
            const r = await fetch(`${API_BASE}/api/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ admission_number: admNo, message: msg, history }),
            });
            const d = await r.json();
            if (d.success) setMessages(p => [...p, { role: "assistant", content: d.reply, ts: new Date() }]);
        } catch {
            setMessages(p => [...p, { role: "assistant", content: "Connection error. Please try again.", ts: new Date() }]);
        } finally { setChatLoading(false); }
    };

    // generate plan
    const genPlan = async () => {
        if (!admNo || planLoading) return;
        setPlanLoading(true);
        setPlanOpen(true);
        setPlan("");
        try {
            const r = await fetch(`${API_BASE}/api/ai/study-plan/${admNo}?_ts=${Date.now()}`, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            });
            const d = await r.json();
            if (d.success) {
                setPlan(d.plan);
                setPlanSource(d.source);
            } else {
                setPlan(d.message || "Failed to generate. Please try again.");
            }
        } catch {
            setPlan("Failed to generate. Please try again.");
        }
        finally { setPlanLoading(false); }
    };

    const genCombinedPlan = async (mode = combinedMode) => {
        if (!admNo || combinedPlanLoading) return;
        setCombinedPlanLoading(true);
        setCombinedPlanOpen(true);
        try {
            const r = await fetch(`${API_BASE}/api/ai/combined-plan/${admNo}?mode=${mode}&_ts=${Date.now()}`, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            });
            const d = await r.json();
            if (d.success) {
                setCombinedDays(d.data?.days || []);
                setCombinedTargets(d.data?.weekly_targets || null);
                setWellnessNote(d.data?.wellness_note || "");
                setCombinedMode((d.data?.mode || mode) as "balanced" | "exam_week" | "light_workout" | "revision_priority");
            } else {
                setCombinedDays([]);
                setCombinedTargets(null);
            }
        } catch {
            setCombinedDays([]);
            setCombinedTargets(null);
        } finally {
            setCombinedPlanLoading(false);
        }
    };

    const logWorkout = async (block: CombinedBlock) => {
        if (!admNo || !block.duration_minutes) return;
        try {
            const r = await fetch(`${API_BASE}/api/planner/log-workout-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: admNo,
                    duration_minutes: block.duration_minutes,
                    workout_type: block.type || "home_workout",
                    intensity: block.intensity || "moderate",
                    completed: true,
                }),
            });
            const d = await r.json();
            if (d.success) {
                const c = await fetch(`${API_BASE}/api/planner/workout-compliance/${admNo}`);
                const cd = await c.json();
                if (cd.success) {
                    setCompliance({
                        study_compliance: cd.data.study_compliance ?? 0,
                        workout_compliance: cd.data.workout_compliance ?? 0,
                        balanced_routine_score: cd.data.balanced_routine_score ?? 0,
                    });
                }
            }
        } catch {
            // silent
        }
    };

    const srcInfo = SOURCE_LABELS[source] || SOURCE_LABELS["rule-based"];
    const planInfo = SOURCE_LABELS[planSource] || SOURCE_LABELS["rule-based"];

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
            <div className="space-y-6 pb-8">

                {/* ══════════ HERO ══════════════════════════════════ */}
                <motion.div {...fade(0)}>
                    <div className="relative overflow-hidden rounded-3xl p-8 text-white"
                        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6d28d9 100%)" }}>
                        {/* animated orbs */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <motion.div
                                className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl"
                                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl"
                                animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/10 blur-2xl"
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            />
                        </div>

                        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <motion.div
                                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-2xl"
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                >
                                    <Brain className="h-9 w-9 text-white" />
                                </motion.div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-3xl font-black tracking-tight">AI Insights</h1>
                                        {source && (
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${srcInfo.color}`}>
                                                ✦ {srcInfo.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-white/70 text-sm">
                                        Personalised intelligence — powered by your real academic data
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={fetchInsights}
                                    disabled={cardsLoading}
                                    variant="ghost"
                                    className="bg-white/10 hover:bg-white/20 text-white border-0 gap-2 backdrop-blur-sm"
                                >
                                    {cardsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Refresh
                                </Button>
                                <Button
                                    onClick={genPlan}
                                    disabled={planLoading}
                                    className="bg-white text-indigo-700 hover:bg-white/90 font-bold gap-2 shadow-xl"
                                >
                                    {planLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                    Generate Study Plan
                                </Button>
                                <Button
                                    onClick={() => genCombinedPlan(combinedMode)}
                                    disabled={combinedPlanLoading}
                                    className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-bold gap-2 shadow-xl"
                                >
                                    {combinedPlanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
                                    Study + Workout Plan
                                </Button>
                            </div>
                        </div>

                        {/* stat pills */}
                        <motion.div
                            className="relative z-10 mt-6 flex flex-wrap gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {[
                                { label: "AI Chat", emoji: "💬", hint: "Multi-turn Q&A" },
                                { label: "Auto Insights", emoji: "⚡", hint: "4 personalised cards" },
                                { label: "Study Planner", emoji: "📅", hint: "7-day AI plan" },
                                { label: "Context-Aware", emoji: "🎯", hint: "Uses your real data" },
                            ].map(p => (
                                <div key={p.label} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                                    <span>{p.emoji}</span>
                                    <span>{p.label}</span>
                                    <span className="text-white/50">· {p.hint}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                {/* ══════════ INSIGHT CARDS ════════════════════════ */}
                <div>
                    <motion.div {...fade(1)} className="flex items-center justify-between mb-4">
                        <h2 className="flex items-center gap-2 text-base font-bold">
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                            Your Personalised Insights
                        </h2>
                        {source && !cardsLoading && (
                            <span className="text-xs text-muted-foreground">
                                Generated by {srcInfo.label}
                            </span>
                        )}
                    </motion.div>

                    {cardsLoading ? (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[0,1,2,3].map(i => (
                                <motion.div key={i} {...fade(i)} className="h-40 rounded-2xl bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {cards.map((card, i) => {
                                const th  = THEMES[card.type] || THEMES.info;
                                const Icon = th.iconComp;
                                const open = expandCard === i;
                                return (
                                    <motion.div key={i} {...fade(i + 1)}>
                                        <motion.div
                                            className={`relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${th.grad}
                                                backdrop-blur-sm shadow-lg ${th.glow} hover:shadow-xl cursor-pointer
                                                transition-all duration-300`}
                                            onClick={() => setExpandCard(open ? null : i)}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {/* sheen */}
                                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

                                            <div className="relative p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10`}>
                                                            <span className="text-xl">{card.icon}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-bold text-sm">{card.title}</h3>
                                                                <Badge className={`text-[9px] px-1.5 py-0 border ${card.type === 'warning' ? 'bg-red-500/20 text-red-300 border-red-400/30' : card.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : card.type === 'tip' ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-blue-500/20 text-blue-300 border-blue-400/30'}`}>
                                                                    {card.type}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${th.text}`} />
                                                </div>

                                                <AnimatePresence>
                                                    {!open && (
                                                        <motion.p
                                                            initial={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-2"
                                                        >
                                                            {card.body}
                                                        </motion.p>
                                                    )}
                                                    {open && (
                                                        <motion.p
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mt-3 text-xs text-muted-foreground leading-relaxed"
                                                        >
                                                            {card.body}
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>

                                                <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <span>{open ? "Click to collapse" : "Click to expand"}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ══════════ STUDY PLAN ═══════════════════════════ */}
                <AnimatePresence>
                    {planOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 overflow-hidden">
                                <div className="flex items-center justify-between p-5 border-b border-indigo-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                            <BookOpen className="h-5 w-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">AI-Generated Study Plan</h3>
                                            {planSource && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Generated by {planInfo.label}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => setPlanOpen(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="p-5">
                                    {planLoading ? (
                                        <div className="flex flex-col items-center gap-4 py-10 text-muted-foreground">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Brain className="h-10 w-10 text-indigo-400" />
                                            </motion.div>
                                            <div className="text-center">
                                                <p className="font-medium">Generating your personalised 7-day plan…</p>
                                                <p className="text-xs mt-1 text-muted-foreground/70">Analysing your subjects, attendance & marks</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                                            <ReactMarkdown>{plan}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════════ COMBINED STUDY + WORKOUT PLAN ═════════ */}
                <AnimatePresence>
                    {combinedPlanOpen && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 overflow-hidden">
                                <div className="flex flex-col gap-3 p-5 border-b border-emerald-500/10">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                <Dumbbell className="h-5 w-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm">Study + Home Workout Schedule</h3>
                                                {combinedTargets && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Target: {combinedTargets.study_hours_target}h study · {combinedTargets.workout_sessions_target} workouts
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => setCombinedPlanOpen(false)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: "balanced", label: "Balanced" },
                                            { key: "exam_week", label: "Exam week mode" },
                                            { key: "light_workout", label: "Light workout mode" },
                                            { key: "revision_priority", label: "Revision priority mode" },
                                        ].map((m) => (
                                            <Button
                                                key={m.key}
                                                size="sm"
                                                variant={combinedMode === m.key ? "default" : "outline"}
                                                className={combinedMode === m.key ? "bg-emerald-600 hover:bg-emerald-500" : ""}
                                                onClick={() => {
                                                    const mode = m.key as "balanced" | "exam_week" | "light_workout" | "revision_priority";
                                                    setCombinedMode(mode);
                                                    genCombinedPlan(mode);
                                                }}
                                            >
                                                {m.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    {compliance && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                                                <p className="text-[11px] text-muted-foreground">Study Compliance</p>
                                                <p className="text-lg font-bold">{compliance.study_compliance}%</p>
                                            </div>
                                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                                                <p className="text-[11px] text-muted-foreground">Workout Consistency</p>
                                                <p className="text-lg font-bold">{compliance.workout_compliance}%</p>
                                            </div>
                                            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                                                <p className="text-[11px] text-muted-foreground">Balanced Routine Score</p>
                                                <p className="text-lg font-bold">{compliance.balanced_routine_score}%</p>
                                            </div>
                                        </div>
                                    )}
                                    {combinedPlanLoading ? (
                                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating combined schedule...
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {combinedDays.map((d) => (
                                                <div key={`${d.day}-${d.date}`} className="rounded-xl border border-border/50 p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="font-semibold text-sm">{d.day} <span className="text-xs text-muted-foreground">({d.date})</span></p>
                                                        {d.recovery_day && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Recovery day</Badge>}
                                                    </div>
                                                    {d.class_hours?.length > 0 && (
                                                        <p className="text-[11px] text-muted-foreground mb-2">Class hours: {d.class_hours.join(", ")}</p>
                                                    )}
                                                    <div className="space-y-2">
                                                        {d.study_blocks.map((b, i) => (
                                                            <div key={i} className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2 text-xs">
                                                                📘 <span className="font-semibold">{b.time}</span> · {b.subject} ({b.duration_hours}h)
                                                            </div>
                                                        ))}
                                                        {d.workout_blocks.map((b, i) => (
                                                            <div key={`w-${i}`} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs flex items-center justify-between gap-2">
                                                                <span>🏃 <span className="font-semibold">{b.time}</span> · {b.goal} ({b.duration_minutes} mins, {b.intensity})</span>
                                                                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => logWorkout(b)}>
                                                                    Mark done
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {wellnessNote && <p className="text-[11px] text-muted-foreground">{wellnessNote}</p>}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════════ CHAT ══════════════════════════════════ */}
                <motion.div {...fade(5)}>
                    <Card className="overflow-hidden border-0 shadow-2xl"
                        style={{ background: "var(--card)" }}>
                        {/* header */}
                        <div className="flex items-center gap-3 border-b border-border/60 p-5"
                            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)" }}>
                            <div className="relative">
                                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <MessageSquare className="h-5 w-5 text-white" />
                                </div>
                                <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold">Chat with MentorAI</h3>
                                <p className="text-xs text-muted-foreground">Context-aware · Powered by your academic data</p>
                            </div>
                            {source && (
                                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${srcInfo.color}`}>
                                    {srcInfo.label}
                                </span>
                            )}
                        </div>

                        {/* messages */}
                        <div className="overflow-y-auto p-5 space-y-4" style={{ height: "400px" }}>
                            <AnimatePresence initial={false}>
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                                    >
                                        {/* avatar */}
                                        {msg.role === "assistant" ? (
                                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md mt-0.5">
                                                <Brain className="h-4 w-4 text-white" />
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 shadow-md mt-0.5 text-xs font-bold text-white">
                                                {firstName.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {/* bubble */}
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm
                                            ${msg.role === "user"
                                                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm"
                                                : "bg-muted/50 border border-border/50 rounded-tl-sm"}`}>
                                            {msg.role === "assistant" ? (
                                                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                            )}
                                            <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-white/50 text-right" : "text-muted-foreground/60"}`}>
                                                {msg.ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* typing indicator */}
                            {chatLoading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                        <Brain className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-1.5">
                                        {[0, 150, 300].map(d => (
                                            <motion.div
                                                key={d}
                                                className="h-2 w-2 rounded-full bg-indigo-400"
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: d / 1000 }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            <div ref={chatEnd} />
                        </div>

                        {/* quick questions */}
                        <div className="border-t border-border/40 px-4 py-3">
                            <p className="text-[10px] text-muted-foreground/70 mb-2 font-medium uppercase tracking-wide">Quick Questions</p>
                            <div className="flex gap-2 flex-wrap">
                                {QUICK.map((q, i) => (
                                    <motion.button
                                        key={i}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => sendMsg(q)}
                                        disabled={chatLoading}
                                        className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5
                                            hover:bg-indigo-500/15 hover:border-indigo-500/40 hover:text-indigo-400
                                            transition-all duration-150 disabled:opacity-40"
                                    >
                                        {q}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* input */}
                        <div className="border-t border-border/40 p-4 flex gap-3 items-end bg-muted/20">
                            <Textarea
                                placeholder="Ask MentorAI anything about your academics…"
                                className="resize-none min-h-[44px] max-h-28 flex-1 text-sm bg-background/60 border-border/60 rounded-xl"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
                                }}
                                rows={1}
                            />
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    className="h-11 w-11 p-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:opacity-90 shadow-lg"
                                    onClick={() => sendMsg()}
                                    disabled={!input.trim() || chatLoading}
                                >
                                    {chatLoading
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Send className="h-4 w-4" />}
                                </Button>
                            </motion.div>
                        </div>
                    </Card>
                </motion.div>

                {/* ══════════ TREND LEGEND ════════════════════════ */}
                <motion.div {...fade(6)}>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: <TrendingUp className="h-4 w-4 text-emerald-400" />, label: "Improving", desc: "Above baseline trend", color: "emerald" },
                            { icon: <Minus className="h-4 w-4 text-amber-400" />,       label: "Stable",    desc: "Consistent performance", color: "amber" },
                            { icon: <TrendingDown className="h-4 w-4 text-red-400" />,  label: "Declining", desc: "Needs immediate focus", color: "red" },
                        ].map(t => (
                            <div key={t.label}
                                className={`rounded-xl border border-${t.color}-500/10 bg-${t.color}-500/5 p-3.5 flex items-center gap-2.5`}>
                                <div className={`h-8 w-8 rounded-lg bg-${t.color}-500/15 flex items-center justify-center shrink-0`}>
                                    {t.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold">{t.label}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </div>
        </DashboardLayout>
    );
}
