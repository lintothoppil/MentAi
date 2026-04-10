import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, BarChart3, Calendar, BookOpen, FileText, Bell,
    Upload, Brain, Users, Clock, CheckCircle, XCircle, AlertTriangle,
    Video, MapPin, Loader2, ExternalLink, RefreshCw, X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
};

const FMT_TIME = (t: string) => {
    if (!t) return "";
    const [h] = t.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 || 12;
    return `${hr12}:00 ${ampm}`;
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

// Build reschedule date options (tomorrow + 28 days, skip sundays)
function buildRescheduleDateOptions() {
    const options: { label: string; value: string }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 28; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        if (d.getDay() === 0) continue;
        const iso = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        options.push({ label, value: iso });
    }
    return options;
}

const TIME_OPTIONS = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
    "17:00", "18:00",
];

const anim = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.07 },
});

// ── Reschedule / Cancel Dialog ──────────────────────────────────────
interface RescheduleDialogProps {
    open: boolean;
    session: Session | null;
    admNo: string;
    onClose: () => void;
    onDone: () => void;
}

const RescheduleDialog = ({ open, session, admNo, onClose, onDone }: RescheduleDialogProps) => {
    const [reason, setReason] = useState("");
    const [preferredDate, setPreferredDate] = useState("");
    const [preferredTime, setPreferredTime] = useState("");
    const [loading, setLoading] = useState(false);
    const dateOptions = buildRescheduleDateOptions();

    // Reset on open
    useEffect(() => {
        if (open) {
            setReason("");
            setPreferredDate(dateOptions[0]?.value || "");
            setPreferredTime("");
        }
    }, [open]);

    if (!session) return null;

    const isApproved = session.status === "Approved";

    const handleSubmit = async () => {
        if (isApproved && !reason.trim()) {
            toast.error("Please provide a reason for rescheduling.");
            return;
        }
        setLoading(true);
        try {
            const body: any = { admission_number: admNo };
            if (isApproved) {
                body.reason = reason;
                if (preferredDate) body.preferred_date = preferredDate;
                if (preferredTime) body.preferred_time = preferredTime;
            }
            const res = await fetch(`http://localhost:5000/api/session/${session.id}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(isApproved
                    ? "Reschedule request sent to your mentor. They will review and confirm."
                    : "Session cancelled successfully."
                );
                onDone();
                onClose();
            } else {
                toast.error(data.message || "Failed to process request.");
            }
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isApproved
                            ? <><RefreshCw className="h-5 w-5 text-blue-500" /> Request Reschedule</>
                            : <><XCircle className="h-5 w-5 text-destructive" /> Cancel Session</>
                        }
                    </DialogTitle>
                    <DialogDescription>
                        {isApproved
                            ? "Your session is approved. You can request your mentor to reschedule it by providing a reason and your preferred new date/time."
                            : "Are you sure you want to cancel this pending session request?"
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* Session Info Banner */}
                <div className="rounded-lg bg-muted/50 border px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-3">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(session.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {FMT_TIME(session.time_slot)}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            {session.session_type === "Online" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                            {session.session_type}
                        </span>
                    </div>
                </div>

                {isApproved ? (
                    <div className="space-y-4">
                        {/* Reason */}
                        <div>
                            <Label className="text-sm font-semibold mb-1.5 block">
                                Reason for Rescheduling <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                placeholder="e.g. I have a prior commitment / exam clash / personal reason..."
                                className="h-24 resize-none"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>

                        {/* Preferred Date */}
                        <div>
                            <Label className="text-sm font-semibold mb-1.5 block">
                                Preferred New Date <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                            </Label>
                            <Select value={preferredDate} onValueChange={setPreferredDate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a preferred date" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dateOptions.slice(0, 20).map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preferred Time */}
                        <div>
                            <Label className="text-sm font-semibold mb-1.5 block">
                                Preferred New Time <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                            </Label>
                            <Select value={preferredTime} onValueChange={setPreferredTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a preferred time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_OPTIONS.map(t => (
                                        <SelectItem key={t} value={t}>{FMT_TIME(t)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                            <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                            Your mentor will review this request and confirm a new time. The session will remain
                            in "Pending" state until they respond.
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        <XCircle className="h-4 w-4 inline mr-1.5" />
                        This action is irreversible. The session slot will be freed for re-booking.
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        <X className="h-4 w-4 mr-1" /> Keep Session
                    </Button>
                    <Button
                        variant={isApproved ? "default" : "destructive"}
                        onClick={handleSubmit}
                        disabled={loading}
                        className={isApproved ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : isApproved
                                ? <RefreshCw className="h-4 w-4 mr-1.5" />
                                : <XCircle className="h-4 w-4 mr-1.5" />
                        }
                        {isApproved ? "Send Reschedule Request" : "Yes, Cancel Session"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

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

    // Reschedule/Cancel Dialog
    const [rescheduleTarget, setRescheduleTarget] = useState<Session | null>(null);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);

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

    const openReschedule = (session: Session) => {
        setRescheduleTarget(session);
        setRescheduleOpen(true);
    };

    const systemSlots = slots.filter(s => s.slot_type === "system");
    const mentorSlots = slots.filter(s => s.slot_type === "mentor");

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
                                <div className="space-y-3">
                                    {sessions.map((s, i) => {
                                        const d = new Date(s.date + "T00:00:00");
                                        const dateLabel = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
                                        const isPending = s.status === "Pending";
                                        const isApproved = s.status === "Approved";
                                        const canAction = isPending || isApproved;

                                        return (
                                            <motion.div key={s.id} {...anim(i)}>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                                    {/* Date column */}
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
                                                                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">Evening Slot</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">with <strong>{s.mentor_name}</strong></p>
                                                        {s.notes && (
                                                            <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">"{s.notes}"</p>
                                                        )}
                                                        {/* Show reschedule request info if notes contain it */}
                                                        {s.notes && s.notes.includes("[Reschedule Requested") && s.status === "Pending" && (
                                                            <div className="mt-1.5 inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                                                                <RefreshCw className="h-3 w-3" /> Reschedule pending mentor review
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                        <Badge className={`text-xs border ${STATUS_COLORS[s.status] || "bg-gray-100"}`}>
                                                            {s.status === "Approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                                                            {s.status === "Rejected" && <XCircle className="h-3 w-3 mr-1" />}
                                                            {s.status === "Cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                                                            {s.status === "Pending" && <Clock className="h-3 w-3 mr-1" />}
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

                                                        {/* Single action button per status */}
                                                        {canAction && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className={
                                                                    isApproved
                                                                        ? "text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200"
                                                                        : "text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                }
                                                                onClick={() => openReschedule(s)}
                                                            >
                                                                {isApproved
                                                                    ? <><RefreshCw className="h-3 w-3 mr-1" /> Request Reschedule</>
                                                                    : <><XCircle className="h-3 w-3 mr-1" /> Cancel</>
                                                                }
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Reschedule / Cancel Dialog */}
            <RescheduleDialog
                open={rescheduleOpen}
                session={rescheduleTarget}
                admNo={admNo}
                onClose={() => { setRescheduleOpen(false); setRescheduleTarget(null); }}
                onDone={fetchSessions}
            />
        </DashboardLayout>
    );
}
