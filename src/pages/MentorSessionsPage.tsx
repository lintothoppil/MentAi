import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, Users, Calendar, TrendingUp, Clock, CheckCircle,
    XCircle, AlertTriangle, Loader2, Video, MapPin, Plus, Trash2,
    RefreshCw, User, GraduationCap, Activity, Phone, Mail, ChevronDown, ChevronUp, BookOpen
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const navItems = [
    { label: "Overview",    icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor" },
    { label: "My Mentees",  icon: <Users className="h-4 w-4" />,          path: "/dashboard/mentor/mentees" },
    { label: "Sessions",    icon: <Calendar className="h-4 w-4" />,       path: "/dashboard/mentor/sessions", isActive: true },
    { label: "Timetable",   icon: <Calendar className="h-4 w-4" />,       path: "/dashboard/faculty/timetable" },
    { label: "Academics",   icon: <BookOpen className="h-4 w-4" />,       path: "/dashboard/mentor/academics" },
    { label: "AI Reports",  icon: <TrendingUp className="h-4 w-4" />,     path: "/dashboard/mentor/ai-reports" },
    { label: "Reports",     icon: <TrendingUp className="h-4 w-4" />,     path: "/dashboard/mentor/reports" },
];

interface Session {
    id: number;
    date: string;
    time_slot: string;
    slot_type: string;
    session_type: string;
    status: string;
    student_name: string;
    student_id: string;
    notes: string;
    meeting_link: string;
    absence_reason?: string;
    attendance_marked_at?: string | null;
}

interface Leave {
    id: number;
    date: string;
    from_time: string | null;
    to_time: string | null;
    reason: string;
}

interface StudentDetail {
    admission_number: string;
    name: string;
    email: string;
    mobile: string;
    branch: string;
    batch: string;
    blood_group: string;
    dob: string;
    status: string;
    photo_url: string | null;
    profile_completed: boolean;
    parents?: {
        father_name: string;
        father_mobile: string;
        mother_name: string;
        mother_mobile: string;
    };
    academics?: {
        percentage_10th: number;
        percentage_12th: number;
        cgpa: number;
        nature_of_admission: string;
    };
    analytics?: {
        attendance_percentage: number;
        avg_internal_marks: number;
        risk_score: number;
        adjusted_risk: number;
        status: string;
        failure_count: number;
    };
    recent_sessions?: Array<{
        id: number;
        date: string;
        time_slot: string;
        session_type: string;
        status: string;
    }>;
}

const STATUS_COLORS: Record<string, string> = {
    Approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    Pending:   "bg-amber-50 text-amber-700 border-amber-200",
    Rejected:  "bg-red-50 text-red-700 border-red-200",
    Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
    Attended:  "bg-indigo-50 text-indigo-700 border-indigo-200",
    Absent:    "bg-rose-50 text-rose-700 border-rose-200",
};

// Helper: parse session datetime from date ("YYYY-MM-DD") + time_slot ("09:00" or "9:00 - 10:00")
const getSessionDateTime = (date: string, time_slot: string): Date => {
    const timeStr = (time_slot || "00:00").split('-')[0].trim();
    const [h, m] = timeStr.split(':').map(Number);
    return new Date(`${date}T${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`);
};

const FMT_TIME = (t: string) => {
    if (!t) return "";
    const [h] = t.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    return `${hr % 12 || 12}:00 ${ampm}`;
};

const riskColor = (r: number) =>
    r >= 70 ? "text-destructive" : r >= 40 ? "text-orange-500" : "text-green-600";
const riskBg = (r: number) =>
    r >= 70 ? "bg-red-50 dark:bg-red-950/20" : r >= 40 ? "bg-orange-50 dark:bg-orange-950/20" : "bg-green-50 dark:bg-green-950/20";

const anim = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.06 },
});

// ── Inline Student Info Panel ────────────────────────────────────────────────
const StudentInfoPanel = ({ studentId }: { studentId: string }) => {
    const [detail, setDetail] = useState<StudentDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const fetchDetail = async () => {
        if (detail || loading) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/student/detail/${studentId}`);
            const data = await res.json();
            if (data.success) setDetail(data.data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        if (!expanded) fetchDetail();
        setExpanded(e => !e);
    };

    return (
        <div className="mt-2 border-t border-border/50 pt-2">
            <button
                onClick={handleToggle}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium"
            >
                <User className="h-3 w-3" />
                {expanded ? "Hide" : "View"} Student Details
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3">
                            {loading && (
                                <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading student data…
                                </div>
                            )}
                            {!loading && detail && (
                                <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                                    {/* Basic Info */}
                                    <div className="flex flex-wrap gap-3 text-xs">
                                        {detail.email && (
                                            <a href={`mailto:${detail.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                                <Mail className="h-3 w-3" /> {detail.email}
                                            </a>
                                        )}
                                        {detail.mobile && (
                                            <a href={`tel:${detail.mobile}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                                <Phone className="h-3 w-3" /> {detail.mobile}
                                            </a>
                                        )}
                                        {detail.blood_group && (
                                            <span className="flex items-center gap-1 text-muted-foreground">
                                                <Activity className="h-3 w-3" /> {detail.blood_group}
                                            </span>
                                        )}
                                        <span className="text-muted-foreground">{detail.branch} · {detail.batch}</span>
                                    </div>

                                    {/* Analytics */}
                                    {detail.analytics && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className={`rounded-lg p-2 ${riskBg(detail.analytics.adjusted_risk)}`}>
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Risk Score</p>
                                                <p className={`text-lg font-black ${riskColor(detail.analytics.adjusted_risk)}`}>
                                                    {(detail.analytics.adjusted_risk || 0).toFixed(1)}%
                                                </p>
                                                <p className={`text-[10px] capitalize font-semibold ${riskColor(detail.analytics.adjusted_risk)}`}>{detail.analytics.status}</p>
                                            </div>
                                            <div className="rounded-lg p-2 bg-muted/50">
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Attendance</p>
                                                <p className="text-lg font-black">{(detail.analytics.attendance_percentage || 0).toFixed(1)}%</p>
                                                <Progress value={detail.analytics.attendance_percentage || 0} className="h-1 mt-1" />
                                            </div>
                                            <div className="rounded-lg p-2 bg-muted/50">
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Avg Marks</p>
                                                <p className="text-lg font-black">{(detail.analytics.avg_internal_marks || 0).toFixed(1)}</p>
                                            </div>
                                            <div className="rounded-lg p-2 bg-muted/50">
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Failures</p>
                                                <p className={`text-lg font-black ${detail.analytics.failure_count > 0 ? "text-destructive" : "text-green-600"}`}>
                                                    {detail.analytics.failure_count || 0}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Parent Info */}
                                    {detail.parents && (detail.parents.father_name || detail.parents.mother_name) && (
                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                            <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Parent Contacts</p>
                                            {detail.parents.father_name && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-foreground font-medium">{detail.parents.father_name}</span>
                                                    {detail.parents.father_mobile && (
                                                        <a href={`tel:${detail.parents.father_mobile}`} className="flex items-center gap-0.5 text-primary hover:underline">
                                                            <Phone className="h-3 w-3" /> {detail.parents.father_mobile}
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {detail.parents.mother_name && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-foreground font-medium">{detail.parents.mother_name}</span>
                                                    {detail.parents.mother_mobile && (
                                                        <a href={`tel:${detail.parents.mother_mobile}`} className="flex items-center gap-0.5 text-primary hover:underline">
                                                            <Phone className="h-3 w-3" /> {detail.parents.mother_mobile}
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Academics */}
                                    {detail.academics && (
                                        <div className="text-xs text-muted-foreground">
                                            <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Academic Background</p>
                                            <div className="flex flex-wrap gap-3">
                                                {detail.academics.percentage_10th && (
                                                    <span><GraduationCap className="h-3 w-3 inline mr-0.5" /> 10th: <strong>{detail.academics.percentage_10th}%</strong></span>
                                                )}
                                                {detail.academics.percentage_12th && (
                                                    <span><GraduationCap className="h-3 w-3 inline mr-0.5" /> 12th: <strong>{detail.academics.percentage_12th}%</strong></span>
                                                )}
                                                {detail.academics.cgpa && (
                                                    <span>CGPA: <strong className="text-primary">{detail.academics.cgpa}</strong></span>
                                                )}
                                                {detail.academics.nature_of_admission && (
                                                    <Badge variant="outline" className="text-[10px] h-4">{detail.academics.nature_of_admission}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {!loading && !detail && (
                                <p className="text-xs text-muted-foreground py-2">Could not load student details.</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function MentorSessionsPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const mentorId = user.faculty_id || user.id;

    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [leavesLoading, setLeavesLoading] = useState(true);

    // Respond modal
    const [respondTarget, setRespondTarget] = useState<Session | null>(null);
    const [meetingLink, setMeetingLink] = useState("");
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");
    const [rescheduleMessage, setRescheduleMessage] = useState("");
    const [responding, setResponding] = useState(false);
    const [noteTarget, setNoteTarget] = useState<Session | null>(null);
    const [privateNoteType, setPrivateNoteType] = useState("session");
    const [privateNoteContent, setPrivateNoteContent] = useState("");
    const [savingPrivateNote, setSavingPrivateNote] = useState(false);
    const [attendanceTarget, setAttendanceTarget] = useState<Session | null>(null);
    const [attendanceStatus, setAttendanceStatus] = useState<"Attended" | "Absent">("Attended");
    const [absenceReason, setAbsenceReason] = useState("");
    const [savingAttendance, setSavingAttendance] = useState(false);

    // Leave modal
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [leaveDate, setLeaveDate] = useState("");
    const [leaveFrom, setLeaveFrom] = useState("");
    const [leaveTo, setLeaveTo] = useState("");
    const [leaveReason, setLeaveReason] = useState("");
    const [leaveType, setLeaveType] = useState<"whole" | "partial">("whole");
    const [addingLeave, setAddingLeave] = useState(false);

    const fetchSessions = useCallback(() => {
        if (!mentorId) return;
        setSessionsLoading(true);
        fetch(`http://localhost:5000/api/session/mentor/${mentorId}`)
            .then(r => r.json())
            .then(d => { if (d.success) setSessions(d.data); })
            .catch(() => {})
            .finally(() => setSessionsLoading(false));
    }, [mentorId]);

    const fetchLeaves = useCallback(() => {
        if (!mentorId) return;
        setLeavesLoading(true);
        fetch(`http://localhost:5000/api/mentor/${mentorId}/leaves`)
            .then(r => r.json())
            .then(d => { if (d.success) setLeaves(d.data); })
            .catch(() => {})
            .finally(() => setLeavesLoading(false));
    }, [mentorId]);

    useEffect(() => { fetchSessions(); fetchLeaves(); }, [fetchSessions, fetchLeaves]);

    const isRescheduleRequest = (notes: string) =>
        notes && notes.includes("[Reschedule Requested");

    const handleRespond = async (action: "approve" | "reject" | "cancel" | "reschedule" | "Attended" | "Absent") => {
        if (!respondTarget) return;
        setResponding(true);
        try {
            const body: any = { action, mentor_id: mentorId };
            if (meetingLink) body.meeting_link = meetingLink;
            if (action === "reschedule") {
                if (rescheduleDate) body.date = rescheduleDate;
                if (rescheduleTime) body.time_slot = rescheduleTime;
                if (rescheduleMessage) body.message = rescheduleMessage;
            }
            
            // Attendance/Status update endpoint usually the same or similar
            const endpoint = (action === "Attended" || action === "Absent") 
                ? `http://localhost:5000/api/session/${respondTarget.id}/status`
                : `http://localhost:5000/api/session/${respondTarget.id}/respond`;

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action === "Attended" || action === "Absent" ? { status: action } : body),
            });
            const d = await res.json();
            if (d.success) {
                toast.success(d.message || `Session marked as ${action}`);
                setRespondTarget(null);
                setMeetingLink("");
                fetchSessions();
            } else {
                toast.error(d.message);
            }
        } catch { toast.error("Network error"); }
        finally { setResponding(false); }
    };

    const handleMarkLeave = async () => {
        if (!leaveDate) { toast.error("Please select a date"); return; }
        if (leaveType === "partial" && (!leaveFrom || !leaveTo)) {
            toast.error("Please specify from/to times"); return;
        }
        setAddingLeave(true);
        try {
            const res = await fetch("http://localhost:5000/api/mentor/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mentor_id: mentorId,
                    date: leaveDate,
                    from_time: leaveType === "whole" ? null : leaveFrom,
                    to_time:   leaveType === "whole" ? null : leaveTo,
                    reason: leaveReason,
                }),
            });
            const d = await res.json();
            if (d.success) {
                toast.success(d.message);
                setLeaveOpen(false);
                setLeaveDate(""); setLeaveFrom(""); setLeaveTo(""); setLeaveReason("");
                fetchLeaves();
                fetchSessions();
            } else {
                toast.error(d.message);
            }
        } catch { toast.error("Network error"); }
        finally { setAddingLeave(false); }
    };

    const handleDeleteLeave = async (id: number) => {
        try {
            const res = await fetch(`http://localhost:5000/api/mentor/leave/${id}`, { method: "DELETE" });
            const d = await res.json();
            if (d.success) { toast.success("Leave removed"); fetchLeaves(); }
            else toast.error(d.message);
        } catch { toast.error("Network error"); }
    };

    const handleSavePrivateNote = async () => {
        if (!noteTarget || !privateNoteContent.trim()) {
            toast.error("Please enter a note");
            return;
        }

        setSavingPrivateNote(true);
        try {
            const res = await fetch("http://localhost:5000/api/mentor/private-notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mentor_id: mentorId,
                    student_id: noteTarget.student_id,
                    session_id: noteTarget.id,
                    note_type: privateNoteType,
                    content: privateNoteContent.trim(),
                }),
            });
            const d = await res.json();
            if (d.success) {
                toast.success("Private session note saved");
                setNoteTarget(null);
                setPrivateNoteContent("");
                setPrivateNoteType("session");
            } else {
                toast.error(d.message || "Failed to save note");
            }
        } catch {
            toast.error("Failed to save note");
        } finally {
            setSavingPrivateNote(false);
        }
    };

    const openAttendanceDialog = (session: Session, status: "Attended" | "Absent") => {
        setAttendanceTarget(session);
        setAttendanceStatus(status);
        setAbsenceReason(status === "Absent" ? (session.absence_reason || "") : "");
    };

    const handleSubmitAttendance = async () => {
        if (!attendanceTarget) return;
        if (attendanceStatus === "Absent" && !absenceReason.trim()) {
            toast.error("Please enter the reason for absence");
            return;
        }

        setSavingAttendance(true);
        try {
            const res = await fetch(`http://localhost:5000/api/session/${attendanceTarget.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mentor_id: mentorId,
                    status: attendanceStatus,
                    absence_reason: attendanceStatus === "Absent" ? absenceReason.trim() : "",
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(attendanceStatus === "Attended" ? "Attendance marked present" : "Attendance marked absent");
                setAttendanceTarget(null);
                setAbsenceReason("");
                fetchSessions();
            } else {
                toast.error(data.message || "Failed to update attendance");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSavingAttendance(false);
        }
    };

    const now = new Date();
    const pending  = sessions.filter(s => s.status === "Pending");
    // Upcoming: Approved sessions whose time has NOT yet passed
    const upcoming = sessions.filter(s => s.status === "Approved" && getSessionDateTime(s.date, s.time_slot) > now);
    // History: Attended, Absent, Rejected, Cancelled OR Approved sessions whose time HAS passed
    const history  = sessions.filter(s =>
        ["Attended", "Absent", "Rejected", "Cancelled"].includes(s.status) ||
        (s.status === "Approved" && getSessionDateTime(s.date, s.time_slot) <= now)
    );

    const SessionCard = ({ s, isHistory = false }: { s: Session; isHistory?: boolean }) => {
        const d = new Date(s.date + "T00:00:00");
        const hasRescheduleReq = isRescheduleRequest(s.notes);
        const sessionTime = getSessionDateTime(s.date, s.time_slot);
        const hasPassed = new Date() > sessionTime;
        const canMarkAttendance = s.status === "Approved" && hasPassed;
        return (
            <div className={`p-5 rounded-2xl border bg-white transition-all hover:shadow-md ${
                canMarkAttendance ? "border-amber-200 shadow-amber-50" :
                s.status === "Attended" ? "border-indigo-100" :
                s.status === "Absent" ? "border-rose-100" :
                "border-slate-100"
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Date Block */}
                    <div className={`flex-none text-center w-20 rounded-2xl p-3 border shrink-0 ${
                        canMarkAttendance ? "bg-amber-50 border-amber-100" :
                        s.status === "Attended" ? "bg-indigo-50 border-indigo-100" :
                        s.status === "Absent" ? "bg-rose-50 border-rose-100" :
                        "bg-slate-50 border-slate-100"
                    }`}>
                        <p className="text-[10px] font-black uppercase text-slate-400">{d.toLocaleDateString("en-IN", { month: "short" })}</p>
                        <p className={`text-2xl font-black leading-tight ${
                            canMarkAttendance ? "text-amber-600" :
                            s.status === "Attended" ? "text-indigo-600" :
                            s.status === "Absent" ? "text-rose-600" :
                            "text-slate-700"
                        }`}>{d.getDate()}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{d.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                            <span className="font-black text-slate-800 text-lg">{FMT_TIME(s.time_slot)}</span>
                            <Badge className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-lg border-none text-[10px]">
                                {s.session_type === "Online" ? <Video className="h-3 w-3 mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                                {s.session_type.toUpperCase()}
                            </Badge>
                            {s.slot_type === "mentor" && <Badge className="bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-lg border border-indigo-100 text-[10px]">EVENING</Badge>}
                            <Badge className={`text-[10px] font-black uppercase tracking-wide border px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || ""}`}>{s.status}</Badge>
                            {hasRescheduleReq && (
                                <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                                    <RefreshCw className="h-3 w-3 mr-1" /> Reschedule Req
                                </Badge>
                            )}
                            {canMarkAttendance && (
                                <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-black animate-pulse">
                                    ⏰ Awaiting Attendance
                                </Badge>
                            )}
                        </div>

                        <p className="text-base font-black text-slate-800">{s.student_name} <span className="text-xs font-mono text-slate-400 font-normal">({s.student_id})</span></p>

                        {s.notes && (
                            <div className="mt-2">
                                {hasRescheduleReq ? (
                                    <div className="text-xs bg-blue-50 border border-blue-100 rounded-xl p-3 text-blue-800 space-y-0.5">
                                        <p className="font-black flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Reschedule Request:</p>
                                        {s.notes.split('\n').filter(Boolean).map((line, i) => (
                                            <p key={i} className="text-blue-700 font-semibold">{line}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                                        <p className="text-xs font-bold text-slate-600 italic">"{s.notes}"</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Post-session attendance buttons */}
                        {canMarkAttendance && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-3">⏰ Session Time Passed — Record Attendance</p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md"
                                        disabled={savingAttendance}
                                        onClick={() => openAttendanceDialog(s, "Attended")}
                                    >
                                        {savingAttendance && attendanceTarget?.id === s.id && attendanceStatus === "Attended"
                                            ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            : <CheckCircle className="h-3 w-3 mr-1" />}
                                        Mark Attended
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-rose-200 text-rose-600 hover:bg-rose-50 font-black rounded-xl text-xs"
                                        disabled={savingAttendance}
                                        onClick={() => openAttendanceDialog(s, "Absent")}
                                    >
                                        {savingAttendance && attendanceTarget?.id === s.id && attendanceStatus === "Absent"
                                            ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            : <XCircle className="h-3 w-3 mr-1" />}
                                        Mark Absent
                                    </Button>
                                </div>
                            </div>
                        )}

                        {s.status === "Attended" && (
                            <div className="mt-2 flex items-center gap-2 bg-indigo-50 rounded-xl border border-indigo-100 px-4 py-2">
                                <CheckCircle className="h-4 w-4 text-indigo-500" />
                                <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">Session Completed — Attended</span>
                            </div>
                        )}
                        {s.status === "Absent" && (
                            <div className="mt-2 bg-rose-50 rounded-xl border border-rose-100 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-rose-500" />
                                    <span className="text-xs font-black text-rose-700 uppercase tracking-wider">Student Was Absent</span>
                                </div>
                                {s.absence_reason && (
                                    <p className="mt-2 text-xs text-rose-800 font-medium">Reason: {s.absence_reason}</p>
                                )}
                            </div>
                        )}

                        {/* Student Info Panel */}
                        <StudentInfoPanel studentId={s.student_id} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                        {s.status === "Pending" && (
                            <>
                                <Button size="sm" variant="outline" className="text-xs font-black" onClick={() => setNoteTarget(s)}>
                                    Private Note
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs font-black border-yellow-200 text-yellow-600 hover:bg-yellow-50" onClick={() => setRespondTarget(s)}>
                                    Respond
                                </Button>
                            </>
                        )}
                        {s.status === "Approved" && (
                            <>
                                <Button size="sm" variant="outline" className="text-xs font-black" onClick={() => setNoteTarget(s)}>
                                    Private Note
                                </Button>
                                {(() => {
                                    // Parse time e.g. "12:00" or range
                                    const timeStr = (s.time_slot || "00:00").split('-')[0].trim();
                                    const [h, m] = timeStr.split(':').map(Number);
                                    const sessionTime = new Date(s.date + "T" + String(h).padStart(2, '0') + ":" + String(m || 0).padStart(2, '0') + ":00");
                                    const now = new Date();
                                    const hasPassed = now > sessionTime;

                                    if (hasPassed) {
                                        return (
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm" 
                                                    className="text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => openAttendanceDialog(s, "Attended")}
                                                >
                                                    Mark Attended
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="text-[10px] font-black border-red-200 text-red-600 hover:bg-red-50"
                                                    onClick={() => openAttendanceDialog(s, "Absent")}
                                                >
                                                    Mark Absent
                                                </Button>
                                            </div>
                                        );
                                    }
                                    return (
                                        <Button size="sm" variant="ghost" className="text-xs text-red-500 font-bold hover:bg-red-50" onClick={() => setRespondTarget(s)}>
                                            Cancel Session
                                        </Button>
                                    );
                                })()}
                            </>
                        )}
                        {isHistory && s.status !== "Approved" && (
                            <Button size="sm" variant="outline" className="text-xs font-black" onClick={() => setNoteTarget(s)}>
                                Private Note
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const isRespondingToReschedule = respondTarget && isRescheduleRequest(respondTarget.notes);

    return (
        <DashboardLayout role="mentor" roleLabel="Mentor Dashboard" navItems={navItems} gradientClass="gradient-mentor">
            <div className="space-y-6">
                {/* Header */}
                <motion.div {...anim(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mentoring Sessions</h1>
                        <p className="text-muted-foreground mt-1">Manage session requests, approvals, and your availability.</p>
                    </div>
                    <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Mark Unavailability
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Mark Leave / Unavailability</DialogTitle>
                                <DialogDescription>
                                    Any pending or approved sessions during the selected time will be automatically cancelled.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div>
                                    <Label>Date</Label>
                                    <Input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)}
                                        min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} />
                                </div>
                                <div>
                                    <Label>Leave Type</Label>
                                    <Select value={leaveType} onValueChange={(v: any) => setLeaveType(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="whole">Whole Day</SelectItem>
                                            <SelectItem value="partial">Specific Hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {leaveType === "partial" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>From</Label>
                                            <Input type="time" value={leaveFrom} onChange={e => setLeaveFrom(e.target.value)} />
                                        </div>
                                        <div>
                                            <Label>To</Label>
                                            <Input type="time" value={leaveTo} onChange={e => setLeaveTo(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <Label>Reason (optional)</Label>
                                    <Input placeholder="e.g. Conference, Medical" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
                                <Button onClick={handleMarkLeave} disabled={addingLeave}>
                                    {addingLeave ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Confirm
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </motion.div>

                {/* Stats */}
                <motion.div {...anim(1)} className="grid grid-cols-4 gap-4">
                    {[
                        { label: "Pending",  value: pending.length,  color: "text-amber-600",  bg: "border-l-amber-400",   icon: "⏳" },
                        { label: "Upcoming", value: upcoming.length, color: "text-emerald-600", bg: "border-l-emerald-400",  icon: "📅" },
                        { label: "History",  value: history.length,  color: "text-indigo-600",  bg: "border-l-indigo-400",  icon: "📋" },
                        { label: "Total",    value: sessions.length, color: "text-slate-700",   bg: "border-l-slate-400",   icon: "🔢" },
                    ].map(stat => (
                        <Card key={stat.label} className={`border-l-4 ${stat.bg} shadow-sm`}>
                            <CardContent className="p-4">
                                <p className="text-[10px] uppercase text-slate-400 font-black tracking-[0.15em]">{stat.icon} {stat.label}</p>
                                <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </motion.div>

                <Tabs defaultValue="pending" className="mt-2">
                    <TabsList className="bg-slate-100 p-1 rounded-2xl">
                        <TabsTrigger value="pending" className="rounded-xl font-bold">⏳ Pending ({pending.length})</TabsTrigger>
                        <TabsTrigger value="upcoming" className="rounded-xl font-bold">📅 Upcoming ({upcoming.length})</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-xl font-bold">📋 History ({history.length})</TabsTrigger>
                        <TabsTrigger value="leaves" className="rounded-xl font-bold">🟡 My Leaves</TabsTrigger>
                    </TabsList>

                    {[
                        { key: "pending",  list: pending,  label: "pending" },
                        { key: "upcoming", list: upcoming, label: "upcoming" },
                        { key: "history",  list: history,  label: "history",  isHistory: true },
                    ].map(tab => (
                        <TabsContent key={tab.key} value={tab.key} className="mt-4">
                            {sessionsLoading ? (
                                <div className="flex items-center gap-3 text-slate-400 font-bold p-10 justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin" /> Loading sessions…
                                </div>
                            ) : tab.list.length === 0 ? (
                                <Card className="border-slate-100 shadow-sm rounded-2xl">
                                    <CardContent className="p-16 text-center">
                                        <Calendar className="h-14 w-14 mx-auto mb-4 text-slate-200" />
                                        <p className="text-slate-500 font-black text-lg">No {tab.label} sessions</p>
                                        <p className="text-slate-400 font-bold text-sm mt-1">Everything is up to date.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {tab.list.map((s, i) => (
                                        <motion.div key={s.id} {...anim(i)}>
                                            <SessionCard s={s} isHistory={tab.isHistory} />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    ))}

                    {/* Leaves Tab */}
                    <TabsContent value="leaves" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>My Unavailability</CardTitle>
                                <CardDescription>Dates / hours you've marked as unavailable. Students cannot book during these times.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {leavesLoading ? (
                                    <div className="flex items-center gap-2 text-muted-foreground p-4">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                                    </div>
                                ) : leaves.length === 0 ? (
                                    <p className="text-muted-foreground text-sm py-6 text-center">No unavailability marked.</p>
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {leaves.map(l => (
                                            <li key={l.id} className="flex items-center justify-between py-3 gap-4">
                                                <div>
                                                    <p className="font-semibold text-sm">
                                                        {new Date(l.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {l.from_time ? `${l.from_time} – ${l.to_time}` : "Whole Day"}
                                                        {l.reason ? ` · ${l.reason}` : ""}
                                                    </p>
                                                </div>
                                                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteLeave(l.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Respond Dialog */}
            <Dialog open={!!respondTarget} onOpenChange={v => {
                if (!v) {
                    setRespondTarget(null);
                    setMeetingLink("");
                    setRescheduleDate("");
                    setRescheduleTime("");
                    setRescheduleMessage("");
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {isRespondingToReschedule
                                ? <span className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-blue-500" /> Review Reschedule Request</span>
                                : respondTarget?.status === "Approved" ? "Cancel Session" : "Respond to Session Request"
                            }
                        </DialogTitle>
                        {respondTarget && (
                            <DialogDescription>
                                <strong>{respondTarget.student_name}</strong> ({respondTarget.student_id}) — session on{" "}
                                <strong>{new Date(respondTarget.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</strong>{" "}
                                at <strong>{FMT_TIME(respondTarget.time_slot)}</strong>
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {/* Show reschedule request details if present */}
                    {respondTarget && isRescheduleRequest(respondTarget.notes) && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 space-y-1">
                            <p className="font-semibold flex items-center gap-1.5"><RefreshCw className="h-4 w-4" /> Student Reschedule Request:</p>
                            {respondTarget.notes.split('\n').filter(Boolean).map((line, i) => (
                                <p key={i} className="text-blue-700 text-xs">{line}</p>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3 py-1">
                        {/* Reschedule fields for mentor to propose new time */}
                        {isRespondingToReschedule && (
                            <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Propose New Time (optional)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">New Date</Label>
                                        <Input
                                            type="date"
                                            value={rescheduleDate}
                                            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                                            onChange={e => setRescheduleDate(e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">New Time</Label>
                                        <Input
                                            type="time"
                                            value={rescheduleTime}
                                            onChange={e => setRescheduleTime(e.target.value)}
                                            className="h-9 text-sm"
                                            min="09:00"
                                            max="19:00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs">Message to Student</Label>
                                    <Input
                                        placeholder="e.g. I'm available on the new date/time..."
                                        value={rescheduleMessage}
                                        onChange={e => setRescheduleMessage(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {respondTarget?.session_type === "Online" && respondTarget.status === "Pending" && (
                            <div>
                                <Label className="text-xs">Meeting Link (optional for online sessions)</Label>
                                <Input
                                    placeholder="https://meet.google.com/..."
                                    value={meetingLink}
                                    onChange={e => setMeetingLink(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => setRespondTarget(null)} disabled={responding}>
                            Close
                        </Button>

                        {respondTarget?.status === "Pending" && !isRespondingToReschedule && (
                            <>
                                <Button variant="destructive" onClick={() => handleRespond("reject")} disabled={responding}>
                                    {responding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                    Reject
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleRespond("approve")} disabled={responding}>
                                    {responding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                    Approve
                                </Button>
                            </>
                        )}

                        {isRespondingToReschedule && (
                            <>
                                <Button variant="destructive" onClick={() => handleRespond("reject")} disabled={responding}>
                                    {responding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                    Reject Request
                                </Button>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleRespond("reschedule")} disabled={responding}>
                                    {responding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                                    Confirm Reschedule
                                </Button>
                            </>
                        )}

                        {respondTarget?.status === "Approved" && !isRespondingToReschedule && (
                            <Button variant="destructive" onClick={() => handleRespond("cancel")} disabled={responding}>
                                {responding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                Cancel Session
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!noteTarget} onOpenChange={v => {
                if (!v) {
                    setNoteTarget(null);
                    setPrivateNoteContent("");
                    setPrivateNoteType("session");
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Private Mentor Note</DialogTitle>
                        {noteTarget && (
                            <DialogDescription>
                                <strong>{noteTarget.student_name}</strong> ({noteTarget.student_id}) on{" "}
                                <strong>{new Date(noteTarget.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>{" "}
                                at <strong>{FMT_TIME(noteTarget.time_slot)}</strong>. This note stays private to the mentor until the student is moved into alumni.
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        <div>
                            <Label className="text-xs">Note Type</Label>
                            <Select value={privateNoteType} onValueChange={setPrivateNoteType}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="session">Session Record</SelectItem>
                                    <SelectItem value="private">Private Follow-up</SelectItem>
                                    <SelectItem value="abnormality">Abnormality</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Confidential Note</Label>
                            <Textarea
                                value={privateNoteContent}
                                onChange={(e) => setPrivateNoteContent(e.target.value)}
                                placeholder="Record the mentoring session, abnormality, or mentor-only follow-up details..."
                                className="mt-1 min-h-[140px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNoteTarget(null)} disabled={savingPrivateNote}>
                            Close
                        </Button>
                        <Button className="bg-mentor hover:bg-mentor/90 text-white" onClick={handleSavePrivateNote} disabled={savingPrivateNote}>
                            {savingPrivateNote ? "Saving..." : "Save Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!attendanceTarget} onOpenChange={v => {
                if (!v) {
                    setAttendanceTarget(null);
                    setAbsenceReason("");
                    setAttendanceStatus("Attended");
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {attendanceStatus === "Attended" ? "Mark Attendance Present" : "Mark Attendance Absent"}
                        </DialogTitle>
                        {attendanceTarget && (
                            <DialogDescription>
                                <strong>{attendanceTarget.student_name}</strong> ({attendanceTarget.student_id}) on{" "}
                                <strong>{new Date(attendanceTarget.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>{" "}
                                at <strong>{FMT_TIME(attendanceTarget.time_slot)}</strong>
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        {attendanceStatus === "Absent" ? (
                            <div>
                                <Label className="text-xs">Reason for Absence</Label>
                                <Textarea
                                    value={absenceReason}
                                    onChange={(e) => setAbsenceReason(e.target.value)}
                                    placeholder="Enter why the student was absent..."
                                    className="mt-1 min-h-[120px]"
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                This will mark the session as attended and move it into the past meetings history.
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAttendanceTarget(null)} disabled={savingAttendance}>
                            Close
                        </Button>
                        <Button
                            className={attendanceStatus === "Attended" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                            variant={attendanceStatus === "Absent" ? "destructive" : "default"}
                            onClick={handleSubmitAttendance}
                            disabled={savingAttendance}
                        >
                            {savingAttendance ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {attendanceStatus === "Attended" ? "Confirm Present" : "Confirm Absent"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
