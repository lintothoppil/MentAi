import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    LayoutDashboard, BarChart3, Calendar, BookOpen, FileText, Bell,
    Upload, Brain, Users, Clock, CheckCircle, XCircle, AlertTriangle,
    ChevronLeft, ChevronRight, Video, MapPin, Loader2, ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const navItems = [
    { label: "Overview",       icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
    { label: "Academics",      icon: <BarChart3 className="h-4 w-4" />,       path: "/dashboard/student/academics" },
    { label: "AI Insights",    icon: <Brain className="h-4 w-4" />,           path: "/dashboard/student/insights" },
    { label: "Timetable",      icon: <Calendar className="h-4 w-4" />,        path: "/dashboard/student/timetable" },
    { label: "Mentoring",      icon: <Users className="h-4 w-4" />,           path: "/dashboard/student/mentoring", isActive: true },
    { label: "Requests",       icon: <FileText className="h-4 w-4" />,        path: "/dashboard/student/requests" },
    { label: "Certificates",   icon: <Upload className="h-4 w-4" />,          path: "/dashboard/student/certificates" },
    { label: "Notifications",  icon: <Bell className="h-4 w-4" />,            path: "/dashboard/student/notifications" },
];

interface Slot {
    slot: string;
    slot_type: 'system' | 'mentor';
    available: boolean;
}

interface Session {
    id: number;
    date: string;
    time_slot: string;
    slot_type: string;
    session_type: string;
    status: string;
    mentor_name: string;
    notes: string;
    meeting_link: string;
    calendar_link: string;
    absence_reason?: string;
    attendance_marked_at?: string | null;
}

interface Mentor {
    id: number;
    name: string;
    email: string;
    designation: string;
    department: string;
}

const STATUS_COLORS: Record<string, string> = {
    Approved:  "bg-green-100 text-green-800 border-green-200",
    Pending:   "bg-yellow-100 text-yellow-800 border-yellow-200",
    Rejected:  "bg-red-100 text-red-800 border-red-200",
    Cancelled: "bg-gray-100 text-gray-500 border-gray-200",
    Attended:  "bg-indigo-100 text-indigo-800 border-indigo-200",
    Absent:    "bg-rose-100 text-rose-800 border-rose-200",
};

const FMT_TIME = (t: string) => {
    const [h] = t.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 || 12;
    return `${hr12}:00 ${ampm}`;
};

const getSessionDateTime = (date: string, timeSlot: string) => {
    const timeStr = (timeSlot || "00:00").split("-")[0].trim();
    const [h, m] = timeStr.split(":").map(Number);
    return new Date(`${date}T${String(h || 0).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}:00`);
};

// Generate date options: tomorrow → +28 days (skip Sundays)
function buildDateOptions() {
    const options: { label: string; value: string }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 28; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        if (d.getDay() === 0) continue; // skip Sunday
        const iso = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        options.push({ label, value: iso });
    }
    return options;
}

const anim = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.07 },
});

export default function StudentMentoringPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const admNo = user.admission_number || "";

    const [mentor, setMentor] = useState<Mentor | null>(null);
    const [mentorLoading, setMentorLoading] = useState(true);

    const [dateOptions] = useState(buildDateOptions);
    const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.value || "");
    const [slots, setSlots] = useState<Slot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const [pickedSlot, setPickedSlot] = useState<string>("");
    const [sessionType, setSessionType] = useState<"Online" | "Offline">("Online");
    const [notes, setNotes] = useState("");
    const [booking, setBooking] = useState(false);

    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // ── fetch my mentor ───────────────────────────────
    useEffect(() => {
        if (!admNo) return;
        fetch(`http://localhost:5000/api/student/my-mentor/${admNo}`)
            .then(r => r.json())
            .then(d => { if (d.success) setMentor(d.data); })
            .catch(() => {})
            .finally(() => setMentorLoading(false));
    }, [admNo]);

    // ── fetch my sessions ─────────────────────────────
    const fetchSessions = useCallback(() => {
        if (!admNo) return;
        setSessionsLoading(true);
        fetch(`http://localhost:5000/api/session/student/${admNo}`)
            .then(r => r.json())
            .then(d => { if (d.success) setSessions(d.data); })
            .catch(() => {})
            .finally(() => setSessionsLoading(false));
    }, [admNo]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    // ── fetch slots when date or mentor changes ───────
    useEffect(() => {
        if (!mentor || !selectedDate) { setSlots([]); return; }
        setSlotsLoading(true);
        setPickedSlot("");
        fetch(`http://localhost:5000/api/session/available-slots?mentor_id=${mentor.id}&date=${selectedDate}`)
            .then(r => r.json())
            .then(d => { if (d.success) setSlots(d.data); })
            .catch(() => {})
            .finally(() => setSlotsLoading(false));
    }, [mentor, selectedDate]);

    // ── book session ──────────────────────────────────
    const handleBook = async () => {
        if (!pickedSlot || !mentor) return;
        setBooking(true);
        try {
            const res = await fetch("http://localhost:5000/api/session/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    admission_number: admNo,
                    mentor_id: mentor.id,
                    date: selectedDate,
                    time_slot: pickedSlot,
                    session_type: sessionType,
                    notes,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setPickedSlot("");
                setNotes("");
                // Refresh slots & sessions
                const slotsRes = await fetch(`http://localhost:5000/api/session/available-slots?mentor_id=${mentor.id}&date=${selectedDate}`);
                const slotsData = await slotsRes.json();
                if (slotsData.success) setSlots(slotsData.data);
                fetchSessions();
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error("Network error");
        } finally {
            setBooking(false);
        }
    };

    // ── cancel / reschedule session ────────────────────────────────
    const handleCancel = async (sessionId: number) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        // For approved sessions, ask for reason and preferred date/time
        if (session.status === "Approved") {
            const reason = prompt("Please provide a reason for rescheduling:");
            if (!reason) return; // User cancelled

            // Ask for preferred date
            const preferredDate = prompt("Preferred new date (YYYY-MM-DD), or press Cancel to skip:");
            
            // Ask for preferred time
            const preferredTime = prompt("Preferred new time (HH:MM), or press Cancel to skip:");

            try {
                const res = await fetch(`http://localhost:5000/api/session/${sessionId}/cancel`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        admission_number: admNo, 
                        reason,
                        preferred_date: preferredDate || undefined,
                        preferred_time: preferredTime || undefined
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success("Reschedule request sent to mentor. They will review and respond.");
                    fetchSessions();
                } else {
                    toast.error(data.message);
                }
            } catch {
                toast.error("Network error");
            }
        } else {
            // For pending sessions, just cancel directly
            if (!confirm("Are you sure you want to cancel this session?")) return;
            try {
                const res = await fetch(`http://localhost:5000/api/session/${sessionId}/cancel`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ admission_number: admNo }),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success("Session cancelled");
                    fetchSessions();
                } else {
                    toast.error(data.message);
                }
            } catch {
                toast.error("Network error");
            }
        }
    };

    const systemSlots = slots.filter(s => s.slot_type === "system");
    const mentorSlots = slots.filter(s => s.slot_type === "mentor");
    const now = new Date();
    const upcomingSessions = sessions.filter((s) => {
        const hasPassed = getSessionDateTime(s.date, s.time_slot) < now;
        return !hasPassed && ["Pending", "Approved"].includes(s.status);
    });
    const pastSessions = sessions.filter((s) => {
        const hasPassed = getSessionDateTime(s.date, s.time_slot) < now;
        return hasPassed || ["Attended", "Absent", "Rejected", "Cancelled"].includes(s.status);
    });

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
            <div className="space-y-8">
                {/* Header */}
                <motion.div {...anim(0)}>
                    <h1 className="text-3xl font-bold tracking-tight">Mentoring Sessions</h1>
                    <p className="text-muted-foreground mt-1">Book, view, and manage your sessions with your mentor.</p>
                </motion.div>

                {/* Mentor Info Card */}
                <motion.div {...anim(1)}>
                    {mentorLoading ? (
                        <Card className="p-6 flex items-center gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading mentor info...
                        </Card>
                    ) : mentor ? (
                        <Card className="overflow-hidden border-l-4 border-l-[hsl(220,70%,50%)]">
                            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                                <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                                    {mentor.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Your Assigned Mentor</p>
                                    <h2 className="text-2xl font-bold">{mentor.name}</h2>
                                    <p className="text-muted-foreground text-sm">{mentor.designation} · {mentor.department}</p>
                                    {mentor.email && <p className="text-xs text-muted-foreground mt-0.5">{mentor.email}</p>}
                                </div>
                                <Badge className="bg-green-100 text-green-800 border border-green-200 text-sm px-3 py-1">
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Assigned
                                </Badge>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="p-6 flex items-center gap-3 text-muted-foreground border-l-4 border-l-yellow-400">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            No mentor assigned yet. Contact admin.
                        </Card>
                    )}
                </motion.div>

                {/* Booking Panel */}
                {mentor && (
                    <motion.div {...anim(2)}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" /> Book a Session
                                </CardTitle>
                                <CardDescription>
                                    Choose a date and available slot. System slots (9 AM–5 PM) are auto-approved based on mentor's timetable.
                                    Evening slots (5–7 PM) need mentor confirmation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Date Picker */}
                                <div>
                                    <Label className="text-sm font-semibold mb-2 block">Select Date</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {dateOptions.slice(0, 14).map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setSelectedDate(opt.value)}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border
                                                    ${selectedDate === opt.value
                                                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {dateOptions.length > 14 && (
                                        <div className="flex gap-2 flex-wrap mt-2">
                                            {dateOptions.slice(14).map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setSelectedDate(opt.value)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border
                                                        ${selectedDate === opt.value
                                                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Slots */}
                                {slotsLoading ? (
                                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
                                    </div>
                                ) : slots.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* System Slots */}
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" /> System Slots (Auto-approved · 9 AM–5 PM)
                                            </p>
                                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                                {systemSlots.map(s => (
                                                    <button
                                                        key={s.slot}
                                                        disabled={!s.available}
                                                        onClick={() => setPickedSlot(s.slot)}
                                                        className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all
                                                            ${!s.available
                                                                ? "opacity-30 cursor-not-allowed bg-muted border-border"
                                                                : pickedSlot === s.slot
                                                                    ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30"
                                                                    : "border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-400"
                                                            }`}
                                                    >
                                                        {FMT_TIME(s.slot)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Mentor Slots */}
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5" /> Mentor Slots (Pending approval · 5–7 PM)
                                            </p>
                                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                                {mentorSlots.map(s => (
                                                    <button
                                                        key={s.slot}
                                                        disabled={!s.available}
                                                        onClick={() => setPickedSlot(s.slot)}
                                                        className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all
                                                            ${!s.available
                                                                ? "opacity-30 cursor-not-allowed bg-muted border-border"
                                                                : pickedSlot === s.slot
                                                                    ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30"
                                                                    : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-400"
                                                            }`}
                                                    >
                                                        {FMT_TIME(s.slot)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Session Options */}
                                        {pickedSlot && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-4 pt-2 border-t border-border"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <Label className="text-sm font-semibold mb-1 block">Session Type</Label>
                                                        <Select value={sessionType} onValueChange={(v: any) => setSessionType(v)}>
                                                            <SelectTrigger className="w-40">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Online">
                                                                    <span className="flex items-center gap-2"><Video className="h-4 w-4" /> Online</span>
                                                                </SelectItem>
                                                                <SelectItem value="Offline">
                                                                    <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Offline</span>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="bg-muted/60 rounded-lg px-4 py-2 text-sm">
                                                        <span className="text-muted-foreground">Selected:</span>{" "}
                                                        <strong>{FMT_TIME(pickedSlot)}</strong> on{" "}
                                                        <strong>{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</strong>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-semibold mb-1 block">Notes / Agenda (optional)</Label>
                                                    <Textarea
                                                        placeholder="What would you like to discuss?"
                                                        className="h-24 resize-none"
                                                        value={notes}
                                                        onChange={e => setNotes(e.target.value)}
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full sm:w-auto"
                                                    onClick={handleBook}
                                                    disabled={booking}
                                                >
                                                    {booking
                                                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking…</>
                                                        : <><Calendar className="h-4 w-4 mr-2" /> Confirm Booking</>
                                                    }
                                                </Button>
                                            </motion.div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">No slots found for this date.</p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Session History */}
                <motion.div {...anim(3)}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" /> My Sessions
                            </CardTitle>
                            <CardDescription>All your scheduled and past mentoring sessions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sessionsLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground p-6">
                                    <Loader2 className="h-5 w-5 animate-spin" /> Loading sessions…
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>No sessions yet. Book your first session above!</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Meetings</h3>
                                            <Badge variant="outline" className="text-xs">{upcomingSessions.length}</Badge>
                                        </div>
                                        {upcomingSessions.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                                                No upcoming meetings.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {upcomingSessions.map((s, i) => {
                                                    const d = new Date(s.date + "T00:00:00");
                                                    const canCancel = ["Pending", "Approved"].includes(s.status);
                                                    return (
                                                        <motion.div key={s.id} {...anim(i)}>
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                                                <div className="flex-none text-center w-20 bg-primary/5 rounded-lg p-3 border border-primary/10">
                                                                    <p className="text-xs font-bold uppercase text-muted-foreground">{d.toLocaleDateString("en-IN", { month: "short" })}</p>
                                                                    <p className="text-2xl font-black leading-tight text-primary">{d.getDate()}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                        <span className="font-semibold">{FMT_TIME(s.time_slot)}</span>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {s.session_type === "Online" ? <Video className="h-3 w-3 mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                                                                            {s.session_type}
                                                                        </Badge>
                                                                        {s.slot_type === "mentor" && (
                                                                            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">Mentor Slot</Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">with <strong>{s.mentor_name}</strong></p>
                                                                    {s.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{s.notes}"</p>}
                                                                </div>

                                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                                    <Badge className={`text-xs border ${STATUS_COLORS[s.status] || "bg-gray-100"}`}>
                                                                        {s.status}
                                                                    </Badge>
                                                                    {s.meeting_link && (
                                                                        <a href={s.meeting_link} target="_blank" rel="noopener noreferrer">
                                                                            <Button size="sm" variant="outline" className="text-xs">
                                                                                <Video className="h-3 w-3 mr-1" /> Join
                                                                            </Button>
                                                                        </a>
                                                                    )}
                                                                    {s.calendar_link && (
                                                                        <a href={s.calendar_link} target="_blank" rel="noopener noreferrer">
                                                                            <Button size="sm" variant="ghost" className="text-xs text-blue-600">
                                                                                <ExternalLink className="h-3 w-3 mr-1" /> Calendar
                                                                            </Button>
                                                                        </a>
                                                                    )}
                                                                    {canCancel && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                            onClick={() => handleCancel(s.id)}
                                                                        >
                                                                            <XCircle className="h-3 w-3 mr-1" /> Cancel
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Past Meetings</h3>
                                            <Badge variant="outline" className="text-xs">{pastSessions.length}</Badge>
                                        </div>
                                        {pastSessions.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                                                No past meetings yet.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {pastSessions.map((s, i) => {
                                                    const d = new Date(s.date + "T00:00:00");
                                                    return (
                                                        <motion.div key={s.id} {...anim(i + upcomingSessions.length)}>
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                                                <div className="flex-none text-center w-20 bg-primary/5 rounded-lg p-3 border border-primary/10">
                                                                    <p className="text-xs font-bold uppercase text-muted-foreground">{d.toLocaleDateString("en-IN", { month: "short" })}</p>
                                                                    <p className="text-2xl font-black leading-tight text-primary">{d.getDate()}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                        <span className="font-semibold">{FMT_TIME(s.time_slot)}</span>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {s.session_type === "Online" ? <Video className="h-3 w-3 mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                                                                            {s.session_type}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">with <strong>{s.mentor_name}</strong></p>
                                                                    {s.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{s.notes}"</p>}
                                                                    {s.status === "Absent" && s.absence_reason && (
                                                                        <p className="text-xs mt-2 text-rose-700 font-medium">Absence reason: {s.absence_reason}</p>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                                    <Badge className={`text-xs border ${STATUS_COLORS[s.status] || "bg-gray-100"}`}>
                                                                        {s.status}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
