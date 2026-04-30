import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Clock, Calendar, BookOpen, Save, RefreshCw, 
    Brain, ThumbsUp, ThumbsDown, AlertCircle, Sparkles,
    ChevronRight, ChevronDown, CheckCircle2, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SubjectPerception {
    subject_name: string;
    difficulty_level: number;
}

interface Preferences {
    preferred_time: string;
    daily_hours: number;
    weekend_hours: number;
    perceptions: SubjectPerception[];
}

interface TimetableSlot {
    time: string;
    subject: string;
    activity: string;
    duration_mins: number;
    priority: string;
}

interface AdaptiveTimetableData {
    weekday: TimetableSlot[];
    weekend: TimetableSlot[];
}

interface Insight {
    title: string;
    body: string;
    type: string;
    icon: string;
}

export default function AdaptiveStudySystem({ admissionNumber }: { admissionNumber: string }) {
    const [activeTab, setActiveTab] = useState("planner");
    const [prefs, setPrefs] = useState<Preferences>({
        preferred_time: "Evening",
        daily_hours: 4,
        weekend_hours: 6,
        perceptions: []
    });
    const [timetable, setTimetable] = useState<AdaptiveTimetableData | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (admissionNumber) {
            fetchData();
        }
    }, [admissionNumber]);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchPreferences(),
                fetchTimetable(),
                fetchInsights()
            ]);
        } catch (error) {
            console.error("Error fetching adaptive data:", error);
            toast.error("Failed to load adaptive system data");
        } finally {
            setLoading(false);
        }
    };

    const fetchPreferences = async () => {
        try {
            const r = await fetch(`http://localhost:5000/api/student/study-preferences/${admissionNumber}`);
            const d = await r.json();
            if (d.success && d.data) setPrefs(d.data);
        } catch (e) { console.error("Pref fetch error:", e); }
    };

    const fetchTimetable = async () => {
        try {
            const r = await fetch(`http://localhost:5000/api/student/adaptive-timetable/${admissionNumber}`);
            const d = await r.json();
            if (d.success && d.data && Object.keys(d.data).length > 0) setTimetable(d.data);
        } catch (e) { console.error("Timetable fetch error:", e); }
    };

    const fetchInsights = async () => {
        try {
            const r = await fetch(`http://localhost:5000/api/ai/adaptive-insights/${admissionNumber}`);
            const d = await r.json();
            if (d.success && d.data) setInsights(d.data);
        } catch (e) { console.error("Insights fetch error:", e); }
    };

    const handleSavePreferences = async () => {
        setSaving(true);
        try {
            const r = await fetch(`http://localhost:5000/api/student/study-preferences/${admissionNumber}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(prefs)
            });
            const d = await r.json();
            if (d.success) {
                toast.success("Preferences saved successfully!");
                // Trigger auto-regen if no timetable exists
                if (!timetable) handleGenerate();
            }
        } catch (error) {
            toast.error("Failed to save preferences");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const r = await fetch(`http://localhost:5000/api/student/generate-adaptive-timetable/${admissionNumber}`, {
                method: "POST"
            });
            const d = await r.json();
            if (d.success) {
                toast.success("Adaptive timetable generated!");
                fetchTimetable();
                fetchInsights();
                setActiveTab("planner");
            } else {
                toast.error(d.message || "Failed to generate");
            }
        } catch (error) {
            toast.error("Error generating timetable");
        } finally {
            setGenerating(false);
        }
    };
    const [refining, setRefining] = useState(false);
    const [lastInsight, setLastInsight] = useState<string>("");
    const [logs, setLogs] = useState<any[]>([]);

    const logStudy = async (subject: string, hours: number, status: 'completed' | 'skipped' | 'partial') => {
        try {
            const r = await fetch('http://localhost:5000/api/ai/log-study', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ admission_number: admissionNumber, subject_name: subject, hours, status })
            });
            const d = await r.json();
            if (d.success) {
                toast.success(`✅ ${subject} marked as ${status}!`);
                setLogs(p => [...p, { subject, status, date: new Date().toLocaleDateString() }]);
            } else {
                toast.error(d.message || 'Failed to log progress');
            }
        } catch { toast.error("Network error — is the backend running?"); }
    };

    const handleRefinePlan = async () => {
        setRefining(true);
        try {
            const r = await fetch('http://localhost:5000/api/ai/regenerate-plan', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ admission_number: admissionNumber })
            });
            const d = await r.json();
            if (d.success) {
                toast.success("Plan refined based on your behavior!");
                setLastInsight(d.insight);
                fetchTimetable(); 
                setActiveTab("planner");
            }
        } catch { toast.error("Refinement failed"); }
        finally { setRefining(false); }
    };

    const updateDifficulty = (sub: string, level: number) => {
        setPrefs(prev => ({
            ...prev,
            perceptions: prev.perceptions.map(p => 
                p.subject_name === sub ? { ...p, difficulty_level: level } : p
            )
        }));
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <Brain className="h-7 w-7 text-indigo-500" />
                        Smart Adaptive System
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        AI-driven study planning tailored to your performance and preferences.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={handleGenerate} 
                        disabled={generating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg gap-2"
                    >
                        {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Regenerate Adaptive Plan
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="planner" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold">
                        <Calendar className="h-4 w-4 mr-2" />
                        Study Planner
                    </TabsTrigger>
                    <TabsTrigger value="tracking" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Tracking
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Adaptive Insights
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold">
                        <Clock className="h-4 w-4 mr-2" />
                        Preferences
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="planner" className="space-y-6">
                    {lastInsight && (
                         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-600 p-3 rounded-xl shadow-lg border-l-4 border-indigo-300">
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-indigo-200 shrink-0 mt-0.5" />
                                <div className="text-white text-xs font-bold leading-relaxed">
                                    <span className="opacity-70 uppercase tracking-widest text-[9px] block mb-1">Latest Adaptation</span>
                                    {lastInsight}
                                </div>
                            </div>
                         </motion.div>
                    )}

                    {!timetable ? (
                        <Card className="border-dashed py-12 text-center">
                            <CardContent className="flex flex-col items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Sparkles className="h-8 w-8 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">No Adaptive Plan Yet</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                                        Configure your preferences and click regenerate to create your smart study schedule.
                                    </p>
                                </div>
                                <Button onClick={() => setActiveTab("settings")}>Set Preferences First</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Weekday Section */}
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                <Card className="overflow-hidden border-0 shadow-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                                    <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <Calendar className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">Weekday Focus</CardTitle>
                                                    <CardDescription>Mon - Fri Schedule</CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {prefs.daily_hours} hrs/day
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {timetable.weekday.map((slot, idx) => (
                                                <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center shrink-0 min-w-[80px]">
                                                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{slot.time}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{slot.duration_mins} min</p>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                                                                    {slot.subject}
                                                                </h4>
                                                                <Badge className={
                                                                    slot.priority === 'High' ? 'bg-red-500/10 text-red-600 border-red-200' :
                                                                    slot.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                                                                    'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                                                } variant="outline">
                                                                    {slot.priority}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{slot.activity}</p>
                                                            </div>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Weekend Section */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <Card className="overflow-hidden border-0 shadow-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                                    <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                    <Zap className="h-5 w-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">Weekend Mastery</CardTitle>
                                                    <CardDescription>Sat - Sun Schedule</CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                                {prefs.weekend_hours} hrs/day
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {timetable.weekend.map((slot, idx) => (
                                                <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center shrink-0 min-w-[80px]">
                                                            <p className="text-sm font-black text-purple-600 dark:text-purple-400">{slot.time}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{slot.duration_mins} min</p>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 transition-colors">
                                                                    {slot.subject}
                                                                </h4>
                                                                <Badge className={
                                                                    slot.priority === 'High' ? 'bg-red-500/10 text-red-600 border-red-200' :
                                                                    slot.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                                                                    'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                                                } variant="outline">
                                                                    {slot.priority}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{slot.activity}</p>
                                                            </div>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="tracking" className="space-y-6">
                    {prefs.perceptions.length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-6 flex items-start gap-4">
                            <div className="text-2xl">⚠️</div>
                            <div>
                                <h4 className="font-black text-sm text-amber-900 dark:text-amber-300">No Study Plan Found</h4>
                                <p className="text-[12px] text-amber-800 dark:text-amber-400 font-medium mt-1">
                                    Go to the <strong>Preferences</strong> tab, set your difficulty levels, then click <strong>Generate Study Plan</strong>. Come back here after that to start tracking.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="grid lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-4">
                            <Card className="border-0 shadow-xl ring-1 ring-border overflow-hidden rounded-2xl">
                                <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b pb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-amber-500" />
                                                Daily Consistency Tracker
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-bold text-slate-500">Log your actual study hours today</CardDescription>
                                        </div>
                                        <Button 
                                            onClick={handleRefinePlan} 
                                            disabled={refining}
                                            className="bg-slate-900 hover:bg-slate-800 text-white font-black h-8 text-[11px] px-4 gap-2 shadow-lg"
                                        >
                                            {refining ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                            Refine My Plan
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/50">
                                        {(prefs.perceptions || []).map((p, i) => {
                                            const subj = p.subject_name;
                                            return (
                                                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-[14px] font-black text-slate-900 dark:text-white">{subj}</h4>
                                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Daily Target: {prefs.daily_hours}h total</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 ml-4">
                                                        <Button 
                                                            size="sm" variant="outline" 
                                                            onClick={() => logStudy(subj, 1, 'completed')}
                                                            className="h-7 px-2.5 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white font-bold"
                                                        >
                                                            Done
                                                        </Button>
                                                        <Button 
                                                            size="sm" variant="outline" 
                                                            onClick={() => logStudy(subj, 0, 'skipped')}
                                                            className="h-7 px-2.5 text-[10px] bg-red-50 text-red-700 border-red-200 hover:bg-red-600 hover:text-white font-bold"
                                                        >
                                                            Skip
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="lg:col-span-4 space-y-4">
                            <Card className="border-0 shadow-lg ring-1 ring-border rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Weekly Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-sm">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[10px] font-black text-slate-600">Overall Consistency</span>
                                            <span className="text-[10px] font-black text-indigo-600">0%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 w-[0%]" />
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-border shadow-sm">
                                        <p className="text-[10px] text-slate-500 font-bold leading-normal italic">
                                            "You haven't logged any sessions yet. Once you complete 3 sessions, AI will begin suggesting behavioral optimizations."
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {insights.map((insight, idx) => (
                            <motion.div 
                                key={idx} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className={`h-full border-l-4 ${
                                    insight.type === 'warning' ? 'border-l-red-500 bg-red-50/30' :
                                    insight.type === 'success' ? 'border-l-emerald-500 bg-emerald-50/30' :
                                    insight.type === 'tip' ? 'border-l-purple-500 bg-purple-50/30' :
                                    'border-l-blue-500 bg-blue-50/30'
                                }`}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">{insight.icon}</span>
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-sm">{insight.title}</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {insight.body}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <Card className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white border-0 shadow-2xl overflow-hidden">
                        <div className="relative p-8">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Brain className="h-40 w-40" />
                            </div>
                            <div className="relative z-10 max-w-2xl">
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                    <Sparkles className="h-6 w-6 text-indigo-300" />
                                    Adaptive Method: Priority-Based Allocation
                                </h3>
                                <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                                    Our system doesn't just give you a static schedule. It identifies your weakest subjects using actual marks and allocates more "Deep Focus" blocks to them. Your preferred study time (Morning/Evening/Night) determines when these high-intensity blocks are scheduled for maximum efficiency.
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                        <p className="text-xl font-black">{prefs.perceptions.length}</p>
                                        <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Subjects</p>
                                    </div>
                                    <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                        <p className="text-xl font-black">{prefs.daily_hours}h</p>
                                        <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Daily Goal</p>
                                    </div>
                                    <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                        <p className="text-xl font-black">{timetable?.weekday?.length || 0}</p>
                                        <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Weekday Slots</p>
                                    </div>
                                    <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                        <p className="text-xl font-black">{timetable?.weekend?.length || 0}</p>
                                        <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Weekend Slots</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                    <div className="grid lg:grid-cols-12 gap-6 pb-4">
                        <div className="lg:col-span-12">
                            <Card className="border shadow-none bg-white dark:bg-slate-900 ring-1 ring-border/50">
                                <CardHeader className="pb-3 border-b bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-slate-50">
                                                <BookOpen className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                                                Difficulty & Time Preferences
                                            </CardTitle>
                                            <CardDescription className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">Customize how AI prioritizes your subjects and time</CardDescription>
                                        </div>
                                        <Button 
                                            size="sm"
                                            onClick={handleSavePreferences} 
                                            disabled={saving}
                                            className="bg-indigo-700 hover:bg-indigo-800 h-8 text-xs gap-2 text-white font-bold"
                                        >
                                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-border/50">
                                        {/* Time Config Col */}
                                        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                                <Clock className="h-3 w-3" /> Schedule Config
                                            </h4>
                                            
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Best Study Time</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Morning", "Evening", "Night"].map(time => (
                                                        <button
                                                            key={time}
                                                            onClick={() => setPrefs(p => ({ ...p, preferred_time: time }))}
                                                            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all
                                                                ${prefs.preferred_time === time 
                                                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' 
                                                                    : 'border-border bg-white dark:bg-slate-900 text-muted-foreground hover:border-indigo-300'}`}
                                                        >
                                                            {time}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    <label>Daily Hours</label>
                                                    <Badge className="bg-indigo-600 text-white border-0">{prefs.daily_hours}h</Badge>
                                                </div>
                                                <Slider
                                                    value={[prefs.daily_hours]}
                                                    min={1}
                                                    max={8}
                                                    step={0.5}
                                                    onValueChange={(val) => setPrefs(p => ({ ...p, daily_hours: val[0] }))}
                                                />
                                            </div>

                                            <div className="space-y-5">
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    <label>Weekend Goal</label>
                                                    <Badge className="bg-purple-600 text-white border-0">{prefs.weekend_hours}h</Badge>
                                                </div>
                                                <Slider
                                                    value={[prefs.weekend_hours]}
                                                    min={1}
                                                    max={12}
                                                    step={0.5}
                                                    onValueChange={(val) => setPrefs(p => ({ ...p, weekend_hours: val[0] }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Perception Grid Col (Span 2) */}
                                        <div className="md:col-span-1 lg:col-span-2 p-6 bg-white dark:bg-slate-950">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 flex items-center justify-between">
                                                <span className="flex items-center gap-2"><Sparkles className="h-3 w-3" /> Subject Perception</span>
                                            </h4>
                                            
                                            {prefs.perceptions.length > 0 ? (
                                                <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                                                    {prefs.perceptions.map((p, idx) => (
                                                        <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                            <div className="flex items-center justify-between text-[11px] font-black text-slate-900 dark:text-slate-100">
                                                                <span className="truncate max-w-[120px]">{p.subject_name}</span>
                                                                <span className={p.difficulty_level >= 4 ? "text-red-600" : "text-indigo-600"}>
                                                                    Lvl {p.difficulty_level}
                                                                </span>
                                                            </div>
                                                            <Slider
                                                                value={[p.difficulty_level]}
                                                                min={1}
                                                                max={5}
                                                                step={1}
                                                                onValueChange={(val) => updateDifficulty(p.subject_name, val[0])}
                                                                className="h-1.5"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-32 flex flex-col items-center justify-center border border-dashed rounded-xl bg-slate-50/50">
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">No subjects found</p>
                                                    <p className="text-[9px] text-muted-foreground/50 mt-1">Add marks to see your subjects here.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
