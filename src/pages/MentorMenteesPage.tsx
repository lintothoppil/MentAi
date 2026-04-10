import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Search, Filter, TrendingUp, AlertTriangle, CheckCircle,
    MoreHorizontal, Calendar, LayoutDashboard, X, Video, MapPin,
    Link2, Phone, Mail, BookOpen, Home, GraduationCap, Clock,
    ChevronRight, ExternalLink, Edit3, UserCheck, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

const navItems = [
    { label: "Overview",   icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor" },
    { label: "My Mentees", icon: <Users className="h-4 w-4" />,           path: "/dashboard/mentor/mentees", isActive: true },
    { label: "Sessions",   icon: <Calendar className="h-4 w-4" />,        path: "/dashboard/mentor/sessions" },
    { label: "Timetable",  icon: <Calendar className="h-4 w-4" />,        path: "/dashboard/faculty/timetable" },
    { label: "Reports",    icon: <TrendingUp className="h-4 w-4" />,      path: "/dashboard/mentor/reports" },
];

const anim = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05 },
});

const riskColor = (r: number) =>
    r >= 70 ? "text-destructive" : r >= 40 ? "text-orange-500" : "text-green-600";
const riskBorderColor = (r: number) =>
    r >= 70 ? "#ef4444" : r >= 40 ? "#f59e0b" : "#22c55e";
const riskBg = (r: number) =>
    r >= 70 ? "bg-red-50 dark:bg-red-950/20" : r >= 40 ? "bg-orange-50 dark:bg-orange-950/20" : "bg-green-50 dark:bg-green-950/20";

// ─── Time / Date helpers ────────────────────────────────────────────────────
const TODAY = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const LAST_DAY_OF_MONTH = () => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
};
// Returns the next full hour clamped to 09:00–19:00 when today is selected
const calcMinTime = (selectedDate: string): string => {
    if (selectedDate === TODAY()) {
        const now = new Date();
        const nextHour = now.getHours() + 1;
        const clamped = Math.min(Math.max(nextHour, 9), 19);
        return `${String(clamped).padStart(2, '0')}:00`;
    }
    return '09:00';
};
const snapTime = (t: string, minT: string): string => {
    if (!t) return minT;
    const [h] = t.split(':').map(Number);
    if (h < Number(minT.split(':')[0])) return minT;
    if (h >= 19) return '19:00';
    return t;
};

// ─── Student Photo ──────────────────────────────────────────────────────────
const StudentAvatar = ({ student, size = "md" }: { student: any; size?: "sm" | "md" | "lg" | "xl" }) => {
    const sizeClasses: Record<string, string> = {
        sm:  "h-10 w-10",
        md:  "h-14 w-14",
        lg:  "h-20 w-20",
        xl:  "h-28 w-28",
    };
    const fallbackClasses: Record<string, string> = {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-2xl",
    };
    const initials = (student.name || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
    return (
        <Avatar className={`${sizeClasses[size]} border-2 border-background shadow-md ring-2 ring-mentor/20`}>
            {student.photo_url
                ? <AvatarImage src={student.photo_url} alt={student.name} className="object-cover" />
                : <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}&backgroundColor=6366f1,8b5cf6,06b6d4&backgroundType=gradientLinear&fontSize=35`} />
            }
            <AvatarFallback className={`bg-mentor/10 text-mentor font-bold ${fallbackClasses[size]}`}>
                {initials}
            </AvatarFallback>
        </Avatar>
    );
};

// ─── Session Modal ──────────────────────────────────────────────────────────
const SessionModal = ({
    open, onClose, student, mentorId, onBooked
}: {
    open: boolean; onClose: () => void; student: any; mentorId: string; onBooked: () => void;
}) => {
    const [sessionType, setSessionType] = useState<"Online" | "Offline">("Offline");
    const [date, setDate]               = useState("");
    const [timeSlot, setTimeSlot]       = useState("10:00");
    const [meetLink, setMeetLink]       = useState("");
    const [notes, setNotes]             = useState("");
    const [loading, setLoading]         = useState(false);
    const [editMode, setEditMode]       = useState(false);

    // Reset when student changes
    useEffect(() => {
        if (open) {
            const todayStr = TODAY();
            const minT = calcMinTime(todayStr);
            setSessionType("Offline");
            setDate(todayStr);
            setTimeSlot(minT);
            setMeetLink("");
            setNotes("");
            setEditMode(false);
        }
    }, [open, student?.student_id, student?.admission_number]);

    const handleBook = async () => {
        if (!date) { toast.error("Please select a date"); return; }
        if (sessionType === "Online" && !meetLink.trim()) {
            toast.error("Please provide a Google Meet link for online sessions"); return;
        }
        setLoading(true);
        try {
            // Normalize: detail drawer uses admission_number, card uses student_id
            const studentId = student.student_id || student.admission_number;
            if (!studentId) { toast.error("Could not identify student"); setLoading(false); return; }

            const res = await fetch("http://localhost:5000/api/mentor/session/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mentor_id: mentorId,
                    student_id: studentId,
                    date,
                    time_slot: timeSlot,
                    session_type: sessionType,
                    meeting_link: sessionType === "Online" ? meetLink : "",
                    notes,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                onBooked();
                onClose();
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error("Failed to book session");
        } finally {
            setLoading(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-mentor/10 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-mentor" />
                        </div>
                        Schedule Mentoring Session
                    </DialogTitle>
                    <DialogDescription>
                        For <strong>{student.name}</strong> · {student.student_id || student.admission_number}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {/* Session Mode Toggle */}
                    <div className="grid gap-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Session Mode</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setSessionType("Offline")}
                                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                                    sessionType === "Offline"
                                        ? "border-mentor bg-mentor/10 text-mentor"
                                        : "border-border text-muted-foreground hover:border-mentor/40"
                                }`}
                            >
                                <MapPin className="h-4 w-4" /> In-Person
                            </button>
                            <button
                                onClick={() => setSessionType("Online")}
                                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                                    sessionType === "Online"
                                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                        : "border-border text-muted-foreground hover:border-blue-500/40"
                                }`}
                            >
                                <Video className="h-4 w-4" /> Online
                            </button>
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="session-date" className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
                            <Input
                                id="session-date"
                                type="date"
                                value={date}
                                min={TODAY()}
                                max={LAST_DAY_OF_MONTH()}
                                onChange={(e) => {
                                    const newDate = e.target.value;
                                    setDate(newDate);
                                    const minT = calcMinTime(newDate);
                                    setTimeSlot(prev => snapTime(prev, minT));
                                }}
                                className="h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="session-time" className="text-xs uppercase tracking-wider text-muted-foreground">
                                Time <span className="font-normal normal-case text-muted-foreground">(9am–7pm)</span>
                            </Label>
                            <Input
                                id="session-time"
                                type="time"
                                value={timeSlot}
                                min={calcMinTime(date)}
                                max="19:00"
                                step="3600"
                                onChange={(e) => {
                                    const t = e.target.value;
                                    const minT = calcMinTime(date);
                                    if (t < minT) setTimeSlot(minT);
                                    else if (t > "19:00") setTimeSlot("19:00");
                                    else setTimeSlot(t);
                                }}
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* GMeet Link (only for Online) */}
                    <AnimatePresence>
                        {sessionType === "Online" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid gap-2"
                            >
                                <Label htmlFor="meet-link" className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Google Meet / Video Link <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="meet-link"
                                        placeholder="meet.google.com/xxx-xxxx-xxx"
                                        value={meetLink}
                                        onChange={(e) => setMeetLink(e.target.value)}
                                        className="pl-9 h-10 font-mono text-sm"
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    The student will receive this link via notification.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="session-notes" className="text-xs uppercase tracking-wider text-muted-foreground">Notes / Agenda (Optional)</Label>
                        <Textarea
                            id="session-notes"
                            placeholder="Topics to discuss, areas of concern, action items..."
                            className="h-24 resize-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Summary Banner */}
                    {date && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-lg p-3 flex items-center gap-3 ${sessionType === "Online" ? "bg-blue-500/10 border border-blue-500/20" : "bg-mentor/10 border border-mentor/20"}`}
                        >
                            {sessionType === "Online" ? <Video className="h-4 w-4 text-blue-500 shrink-0" /> : <MapPin className="h-4 w-4 text-mentor shrink-0" />}
                            <div className="text-xs">
                                <p className="font-semibold text-foreground">
                                    {sessionType} Session · {date} at {timeSlot}
                                </p>
                                {sessionType === "Online" && meetLink && (
                                    <p className="text-muted-foreground truncate mt-0.5">{meetLink}</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        className={sessionType === "Online" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-mentor hover:bg-mentor/90 text-white"}
                        onClick={handleBook}
                        disabled={loading}
                    >
                        {loading ? "Booking..." : `Schedule ${sessionType} Session`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ─── Student Detail Drawer ───────────────────────────────────────────────────
const StudentDetailSheet = ({
    open, onClose, studentId, mentorId, onSchedule
}: {
    open: boolean; onClose: () => void; studentId: string | null; mentorId: string; onSchedule: (student: any) => void;
}) => {
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [sessionActionLoading, setSessionActionLoading] = useState<number | null>(null);

    const handleSessionAction = (sessionId: number, action: string, extraData: any = {}) => {
        setSessionActionLoading(sessionId);
        fetch(`http://localhost:5000/api/session/${sessionId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mentor_id: mentorId, action, ...extraData })
        })
            .then(res => res.json())
            .then(resData => {
                if (resData.success) {
                    setDetail((prev: any) => {
                        if (!prev || !prev.recent_sessions) return prev;
                        return {
                            ...prev,
                            recent_sessions: prev.recent_sessions.map((s: any) => {
                                if (s.id === sessionId) {
                                    return { 
                                        ...s, 
                                        status: action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'cancel' ? 'Cancelled' : 'Rescheduled',
                                        meeting_link: extraData.meeting_link !== undefined ? extraData.meeting_link : s.meeting_link
                                    };
                                }
                                return s;
                            })
                        };
                    });
                } else {
                    toast.error(resData.message);
                }
            })
            .catch(err => toast.error("Failed to perform action"))
            .finally(() => setSessionActionLoading(null));
    };

    useEffect(() => {
        if (!studentId || !open) return;
        setLoading(true);
        setDetail(null);
        fetch(`http://localhost:5000/api/student/detail/${studentId}`)
            .then(r => r.json())
            .then(d => { if (d.success) setDetail(d.data); else toast.error(d.message); })
            .catch(() => toast.error("Failed to load student details"))
            .finally(() => setLoading(false));
    }, [studentId, open]);

    const info = detail;
    const analytics = info?.analytics;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto p-0" side="right">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center justify-between">
                    <SheetTitle className="text-base font-bold">Student Profile</SheetTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>

                {loading && (
                    <div className="flex flex-col gap-4 p-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                        ))}
                    </div>
                )}

                {!loading && !info && (
                    <div className="p-6 text-center text-muted-foreground">No data found.</div>
                )}

                {!loading && info && (
                    <div className="flex flex-col">
                        {/* Hero Card */}
                        <div className="gradient-mentor p-6 flex items-center gap-4">
                            <StudentAvatar student={{ name: info.name, photo_url: info.photo_url }} size="xl" />
                            <div className="text-white">
                                <h2 className="text-xl font-bold leading-tight">{info.name}</h2>
                                <p className="text-white/70 text-sm font-mono">{info.admission_number}</p>
                                <p className="text-white/70 text-xs mt-1">{info.branch} · {info.batch}</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge className="bg-white/20 text-white border-0 text-[10px]">
                                        {info.status}
                                    </Badge>
                                    {!info.profile_completed && (
                                        <Badge className="bg-orange-500/80 text-white border-0 text-[10px]">
                                            Profile Incomplete
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 flex gap-2">
                            <Button
                                className="flex-1 bg-mentor hover:bg-mentor/90 text-white gap-2"
                                onClick={() => onSchedule(info)}
                            >
                                <Calendar className="h-4 w-4" /> Schedule Session
                            </Button>
                            {info.email && (
                                <Button variant="outline" size="icon" asChild>
                                    <a href={`mailto:${info.email}`}><Mail className="h-4 w-4" /></a>
                                </Button>
                            )}
                            {info.mobile && (
                                <Button variant="outline" size="icon" asChild>
                                    <a href={`tel:${info.mobile}`}><Phone className="h-4 w-4" /></a>
                                </Button>
                            )}
                        </div>

                        <Separator />

                        {/* Analytics */}
                        {analytics && (
                            <div className="p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Academic Performance</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`rounded-xl p-3 ${riskBg(analytics.adjusted_risk)}`}>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Risk Score</p>
                                        <p className={`text-2xl font-black ${riskColor(analytics.adjusted_risk)}`}>
                                            {(analytics.adjusted_risk || 0).toFixed(1)}%
                                        </p>
                                        <p className={`text-xs font-semibold capitalize ${riskColor(analytics.adjusted_risk)}`}>{analytics.status}</p>
                                    </div>
                                    <div className="rounded-xl p-3 bg-muted/40">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Attendance</p>
                                        <p className="text-2xl font-black text-foreground">
                                            {(analytics.attendance_percentage || 0).toFixed(1)}%
                                        </p>
                                        <Progress value={analytics.attendance_percentage || 0} className="h-1 mt-1" />
                                    </div>
                                    <div className="rounded-xl p-3 bg-muted/40">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Avg Internal Marks</p>
                                        <p className="text-2xl font-black text-foreground">
                                            {(analytics.avg_internal_marks || 0).toFixed(1)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl p-3 bg-muted/40">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Subject Failures</p>
                                        <p className={`text-2xl font-black ${analytics.failure_count > 0 ? "text-destructive" : "text-green-600"}`}>
                                            {analytics.failure_count || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Contact Info */}
                        <div className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</p>
                            <div className="space-y-2 text-sm">
                                {info.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        <a href={`mailto:${info.email}`} className="hover:text-foreground transition-colors truncate">{info.email}</a>
                                    </div>
                                )}
                                {info.mobile && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                        <a href={`tel:${info.mobile}`} className="hover:text-foreground transition-colors">{info.mobile}</a>
                                    </div>
                                )}
                                {info.dob && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                        <span>DOB: {info.dob}</span>
                                    </div>
                                )}
                                {info.blood_group && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Activity className="h-3.5 w-3.5 shrink-0" />
                                        <span>Blood Group: <strong>{info.blood_group}</strong></span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Extended data — only if profile is complete */}
                        {info.profile_completed ? (
                            <>
                                {/* Parent Info */}
                                {info.parents && (
                                    <>
                                        <Separator />
                                        <div className="p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Parent Information</p>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                {info.parents.father_name && (
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] text-muted-foreground uppercase">Father</p>
                                                        <p className="font-medium">{info.parents.father_name}</p>
                                                        {info.parents.father_profession && <p className="text-xs text-muted-foreground">{info.parents.father_profession}</p>}
                                                        {info.parents.father_mobile && (
                                                            <a href={`tel:${info.parents.father_mobile}`} className="text-xs text-mentor hover:underline flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />{info.parents.father_mobile}
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                {info.parents.mother_name && (
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] text-muted-foreground uppercase">Mother</p>
                                                        <p className="font-medium">{info.parents.mother_name}</p>
                                                        {info.parents.mother_profession && <p className="text-xs text-muted-foreground">{info.parents.mother_profession}</p>}
                                                        {info.parents.mother_mobile && (
                                                            <a href={`tel:${info.parents.mother_mobile}`} className="text-xs text-mentor hover:underline flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />{info.parents.mother_mobile}
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Academic Background */}
                                {info.academics && (
                                    <>
                                        <Separator />
                                        <div className="p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Academic Background</p>
                                            <div className="space-y-2 text-sm">
                                                {info.academics.percentage_10th && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3 w-3" />10th</span>
                                                        <span className="font-semibold">{info.academics.percentage_10th}%</span>
                                                    </div>
                                                )}
                                                {info.academics.percentage_12th && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3 w-3" />12th</span>
                                                        <span className="font-semibold">{info.academics.percentage_12th}%</span>
                                                    </div>
                                                )}
                                                {info.academics.cgpa && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" />Current CGPA</span>
                                                        <span className="font-bold text-mentor">{info.academics.cgpa}</span>
                                                    </div>
                                                )}
                                                {info.academics.nature_of_admission && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Admission Type</span>
                                                        <Badge variant="outline" className="text-[10px]">{info.academics.nature_of_admission}</Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Accommodation */}
                                {info.other?.accommodation_type && (
                                    <>
                                        <Separator />
                                        <div className="p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Accommodation</p>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Home className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium">{info.other.accommodation_type}</span>
                                                {info.other.staying_with && <span className="text-muted-foreground">· With {info.other.staying_with}</span>}
                                                {info.other.hostel_name && <span className="text-muted-foreground">· {info.other.hostel_name}</span>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="p-4">
                                <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    Student has not completed their profile. Basic information shown above.
                                </div>
                            </div>
                        )}

                        {/* Recent Sessions */}
                        {info.recent_sessions && info.recent_sessions.length > 0 && (
                            <>
                                <Separator />
                                <div className="p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Recent Sessions</p>
                                    <div className="space-y-2">
                                        {info.recent_sessions.map((s: any) => (
                                            <div key={s.id} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 text-sm border border-border/50">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-2">
                                                        <div className="mt-0.5">
                                                            {s.session_type === "Online"
                                                                ? <Video className="h-4 w-4 text-blue-500" />
                                                                : <MapPin className="h-4 w-4 text-mentor" />
                                                            }
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-xs text-foreground/90">{new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})} · {s.time_slot}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] uppercase font-bold py-0 h-4 border-0 ${s.session_type === "Online" ? "bg-blue-50 text-blue-700" : "bg-mentor/10 text-mentor"}`}
                                                                >
                                                                    {s.session_type}
                                                                </Badge>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[9px] py-0 h-4 ${s.status === "Approved" ? "text-green-600 border-green-200 bg-green-50" : s.status === "Pending" ? "text-orange-500 border-orange-200 bg-orange-50" : "text-muted-foreground"}`}
                                                                >
                                                                    {s.status}
                                                                </Badge>
                                                            </div>
                                                            {s.notes && (
                                                                <p className="text-[10px] text-muted-foreground mt-2 italic border-l-2 pl-2">"{s.notes}"</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/50">
                                                    {s.status === 'Pending' && (
                                                        <>
                                                            <Button size="sm" className="h-7 text-[10px] bg-green-600 hover:bg-green-700" onClick={() => {
                                                                const link = s.session_type === 'Online' ? prompt('Enter meeting link (optional):', s.meeting_link || '') || '' : '';
                                                                handleSessionAction(s.id, 'approve', { meeting_link: link });
                                                            }} disabled={sessionActionLoading === s.id}>
                                                                Approve
                                                            </Button>
                                                            <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={() => handleSessionAction(s.id, 'reject')} disabled={sessionActionLoading === s.id}>
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {s.status === 'Approved' && (
                                                        <>
                                                            {s.meeting_link && s.session_type === 'Online' && (
                                                                <Button size="sm" className="h-7 text-[10px] bg-mentor hover:bg-mentor/90" asChild>
                                                                    <a href={s.meeting_link.startsWith('http') ? s.meeting_link : `https://${s.meeting_link}`} target="_blank" rel="noopener noreferrer">
                                                                        Join Meet
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            {!s.meeting_link && s.session_type === 'Online' && (
                                                                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
                                                                    const link = prompt('Enter meeting link:');
                                                                    if (link) handleSessionAction(s.id, 'approve', { meeting_link: link });
                                                                }} disabled={sessionActionLoading === s.id}>Add Link</Button>
                                                            )}
                                                            <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleSessionAction(s.id, 'cancel')} disabled={sessionActionLoading === s.id}>Cancel Session</Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const MentorMenteesPage = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    // Supports both faculty login (faculty_id) and any fallback (id)
    const mentorUserId = String(user.faculty_id || user.id || "");
    const [mentees, setMentees] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [loading, setLoading] = useState(true);
    const [plannerStats, setPlannerStats] = useState<any>({});
    const [loggedInterventions, setLoggedInterventions] = useState<any>({});

    // Detail Drawer
    const [detailStudent, setDetailStudent]   = useState<string | null>(null);
    const [detailOpen, setDetailOpen]         = useState(false);

    // Session Modal
    const [sessionStudent, setSessionStudent] = useState<any>(null);
    const [sessionOpen, setSessionOpen]       = useState(false);

    // Intervention Modal
    const [interventionOpen, setInterventionOpen]             = useState(false);
    const [selectedStudentForIntervention, setSelectedForInt] = useState<any>(null);
    const [interventionType, setInterventionType]             = useState("");
    const [interventionNotes, setInterventionNotes]           = useState("");

    useEffect(() => {
        const mid = user.faculty_id || user.id;
        if (mid) fetchAllData();
        else setLoading(false);
    }, [user.faculty_id, user.id]);

    const fetchAllData = async () => {
        setLoading(true);
        const mid = user.faculty_id || user.id;
        try {
            const [menteesRes, plannerRes, interventionsRes] = await Promise.all([
                fetch(`http://localhost:5000/api/analytics/mentor/${mid}`).then(r => r.json()),
                fetch(`http://localhost:5000/api/planner/mentor/${mid}`).then(r => r.json()),
                fetch(`http://localhost:5000/api/intervention/mentor/${mid}`).then(r => r.json()),
            ]);
            if (menteesRes.success) setMentees(menteesRes.data);
            if (plannerRes.success) {
                const statsMap: any = {};
                plannerRes.data.forEach((s: any) => { statsMap[s.student_id] = s; });
                setPlannerStats(statsMap);
            }
            if (interventionsRes.success) setLoggedInterventions(interventionsRes.data);
        } catch {
            toast.error("Failed to load mentees");
        } finally {
            setLoading(false);
        }
    };

    const handleLogIntervention = () => {
        if (!selectedStudentForIntervention || !interventionType) return;
        fetch("http://localhost:5000/api/intervention/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_id: selectedStudentForIntervention.student_id,
                mentor_id: user.id,
                intervention_type: interventionType,
                notes: interventionNotes,
            }),
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setLoggedInterventions({ ...loggedInterventions, [selectedStudentForIntervention.student_id]: true });
                    setInterventionOpen(false);
                    setSelectedForInt(null);
                    setInterventionType(""); setInterventionNotes("");
                    toast.success("Intervention logged successfully");
                } else toast.error(data.message);
            })
            .catch(() => toast.error("Failed to log intervention"));
    };

    const openDetail = (studentId: string) => {
        setDetailStudent(studentId);
        setDetailOpen(true);
    };
    const openSession = (student: any) => {
        setSessionStudent(student);
        setSessionOpen(true);
        setDetailOpen(false); // close drawer if open
    };

    const filteredMentees = mentees.filter(m => {
        const matchesSearch =
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.student_id.toLowerCase().includes(searchTerm.toLowerCase());
        const risk = m.adjusted_risk || 0;
        const matchesFilter =
            filterStatus === "all" ||
            (filterStatus === "critical" && risk >= 70) ||
            (filterStatus === "at-risk"  && risk >= 40 && risk < 70) ||
            (filterStatus === "stable"   && risk < 40);
        return matchesSearch && matchesFilter;
    }).sort((a, b) => (b.adjusted_risk || 0) - (a.adjusted_risk || 0));

    const criticalCount  = mentees.filter(m => (m.adjusted_risk || 0) >= 70).length;
    const atRiskCount    = mentees.filter(m => { const r = m.adjusted_risk || 0; return r >= 40 && r < 70; }).length;
    const stableCount    = mentees.filter(m => (m.adjusted_risk || 0) < 40).length;

    return (
        <DashboardLayout role="mentor" roleLabel="Mentor Dashboard" navItems={navItems} gradientClass="gradient-mentor">
            <div className="flex flex-col gap-6">

                {/* Header */}
                <motion.div {...anim(0)} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mentee Directory</h1>
                        <p className="text-muted-foreground">
                            {mentees.length} students assigned · {criticalCount} critical · {atRiskCount} at-risk
                        </p>
                    </div>
                    <Button
                        className="bg-mentor hover:bg-mentor/90 text-white gap-2 shrink-0"
                        onClick={() => window.location.href = "/dashboard/mentor/sessions"}
                    >
                        <Calendar className="h-4 w-4" /> View All Sessions
                    </Button>
                </motion.div>

                {/* Summary Stats */}
                <motion.div {...anim(1)} className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Critical Risk", count: criticalCount, color: "text-destructive", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", icon: AlertTriangle },
                        { label: "At Risk",       count: atRiskCount,   color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800", icon: TrendingUp },
                        { label: "Stable",        count: stableCount,   color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800", icon: CheckCircle },
                    ].map((s) => (
                        <button
                            key={s.label}
                            onClick={() => setFilterStatus(s.label.toLowerCase().replace(" ", "-"))}
                            className={`rounded-xl border ${s.border} ${s.bg} p-3 text-left transition-all hover:scale-105 cursor-pointer`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                            </div>
                            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                        </button>
                    ))}
                </motion.div>

                {/* Search + Filter */}
                <motion.div {...anim(2)} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or admission number..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Mentees</SelectItem>
                            <SelectItem value="critical">Critical (≥70%)</SelectItem>
                            <SelectItem value="at-risk">At Risk (40–70%)</SelectItem>
                            <SelectItem value="stable">Stable (&lt;40%)</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>

                {/* Mentee Cards */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mentor" />
                        </div>
                    ) : filteredMentees.length === 0 ? (
                        <Card className="p-12 text-center text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No mentees found.</p>
                        </Card>
                    ) : (
                        filteredMentees.map((student, i) => {
                            const risk = student.adjusted_risk || 0;
                            return (
                                <motion.div key={student.student_id} {...anim(i + 3)}>
                                    <Card className="overflow-hidden border-l-4 hover:shadow-lg transition-shadow"
                                        style={{ borderLeftColor: riskBorderColor(risk) }}>
                                        <CardContent className="p-0">
                                            <div className="flex flex-col md:flex-row items-stretch">

                                                {/* Student Identity */}
                                                <div className="p-5 flex flex-1 items-center gap-4 cursor-pointer group"
                                                    onClick={() => openDetail(student.student_id)}>
                                                    <div className="relative shrink-0">
                                                        <StudentAvatar student={student} size="md" />
                                                        {risk >= 70 && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 rounded-full bg-destructive border-2 border-background shadow-sm" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-lg font-bold truncate group-hover:text-mentor transition-colors">
                                                                {student.name}
                                                            </h3>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-mentor transition-colors" />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{student.student_id} · {student.batch}</p>
                                                        <div className="flex gap-2 mt-2 flex-wrap">
                                                            <Badge variant={student.status === "Declining" ? "destructive" : student.status === "Improving" ? "default" : "secondary"}
                                                                className={student.status === "Improving" ? "bg-green-600 text-white" : ""}>
                                                                {student.status}
                                                            </Badge>
                                                            {loggedInterventions[student.student_id] && (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                    <CheckCircle className="h-3 w-3 mr-1" /> Intervened
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Metrics */}
                                                <div className="bg-muted/30 p-5 md:w-72 flex flex-col justify-center border-l border-border gap-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Adjusted Risk</p>
                                                            <p className={`text-4xl font-black tracking-tighter ${riskColor(risk)}`}>
                                                                {risk.toFixed(1)}%
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Compliance</p>
                                                            <p className="text-xl font-bold">{plannerStats[student.student_id]?.compliance || 0}%</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 pt-2 border-t border-border/50">
                                                        <div className="flex-1">
                                                            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Attendance</p>
                                                            <p className="font-semibold text-sm">{(student.attendance_percentage || 0).toFixed(1)}%</p>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Avg Marks</p>
                                                            <p className="font-semibold text-sm">{(student.avg_internal_marks || 0).toFixed(1)}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="p-5 md:w-52 flex flex-col justify-center gap-2 border-l border-border">
                                                    <Button
                                                        className="w-full bg-mentor hover:bg-mentor/90 text-white gap-1 text-xs"
                                                        onClick={() => openDetail(student.student_id)}
                                                    >
                                                        <UserCheck className="h-3.5 w-3.5" /> View Details
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-1 text-xs border-mentor/30 text-mentor hover:bg-mentor/10 hover:border-mentor"
                                                        onClick={() => openSession({ student_id: student.student_id, name: student.name, photo_url: null })}
                                                    >
                                                        <Calendar className="h-3.5 w-3.5" /> Schedule Session
                                                    </Button>
                                                    {risk >= 70 && !loggedInterventions[student.student_id] ? (
                                                        <Button
                                                            variant="destructive"
                                                            className="w-full text-xs gap-1"
                                                            onClick={() => { setSelectedForInt(student); setInterventionOpen(true); }}
                                                        >
                                                            <AlertTriangle className="h-3.5 w-3.5" /> Intervene
                                                        </Button>
                                                    ) : (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="w-full text-muted-foreground text-xs">
                                                                    <MoreHorizontal className="h-4 w-4 mr-1" /> More
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openDetail(student.student_id)}>
                                                                    <UserCheck className="h-4 w-4 mr-2" /> Full Profile
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openSession({ student_id: student.student_id, name: student.name, photo_url: null })}>
                                                                    <Video className="h-4 w-4 mr-2" /> Online Session
                                                                </DropdownMenuItem>
                                                                {risk >= 70 && (
                                                                    <DropdownMenuItem
                                                                        className="text-destructive"
                                                                        onClick={() => { setSelectedForInt(student); setInterventionOpen(true); }}
                                                                    >
                                                                        <AlertTriangle className="h-4 w-4 mr-2" /> Escalate
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>

                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Student Detail Drawer */}
            <StudentDetailSheet
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                studentId={detailStudent}
                mentorId={mentorUserId}
                onSchedule={(student) => openSession(student)}
            />

            {/* Session Booking Modal */}
            <SessionModal
                open={sessionOpen}
                onClose={() => setSessionOpen(false)}
                student={sessionStudent}
                mentorId={mentorUserId}
                onBooked={fetchAllData}
            />

            {/* Intervention Modal */}
            <Dialog open={interventionOpen} onOpenChange={setInterventionOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Urgent Mentor Intervention
                        </DialogTitle>
                        <DialogDescription>
                            Student <strong>{selectedStudentForIntervention?.name}</strong> is at{" "}
                            <strong>{(selectedStudentForIntervention?.adjusted_risk || 0).toFixed(1)}%</strong> risk.
                            This creates an immutable record for institutional audits.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Intervention Type</Label>
                            <Select value={interventionType} onValueChange={setInterventionType}>
                                <SelectTrigger><SelectValue placeholder="Select action taken..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Academic Counseling">Academic Counseling</SelectItem>
                                    <SelectItem value="Warning Issued">Warning Issued</SelectItem>
                                    <SelectItem value="Parent Call">Parent Call</SelectItem>
                                    <SelectItem value="Psychological Counseling Reference">Psychological Reference</SelectItem>
                                    <SelectItem value="Peer Study Group Assignment">Peer Study Group</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Notes</Label>
                            <Textarea
                                placeholder="Describe the discussion and agreed-upon action plan..."
                                className="h-28"
                                value={interventionNotes}
                                onChange={(e) => setInterventionNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInterventionOpen(false)}>Cancel</Button>
                        <Button className="bg-destructive text-white" onClick={handleLogIntervention}>
                            Submit Intervention
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
};

export default MentorMenteesPage;
