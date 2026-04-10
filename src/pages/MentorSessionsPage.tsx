import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, Users, Calendar, TrendingUp, Clock, CheckCircle,
    XCircle, AlertTriangle, Loader2, Video, MapPin, Plus, Trash2,
    RefreshCw, User, GraduationCap, Activity, Phone, Mail, ChevronDown, ChevronUp,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

    const handleRespond = async (action: "approve" | "reject" | "cancel" | "reschedule") => {
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
            const res = await fetch(`http://localhost:5000/api/session/${respondTarget.id}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const d = await res.json();
            if (d.success) {
                toast.success(d.message);
                setRespondTarget(null);
                setMeetingLink("");
                setRescheduleDate("");
                setRescheduleTime("");
                setRescheduleMessage("");
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

    const pending   = sessions.filter(s => s.status === "Pending");
    const upcoming  = sessions.filter(s => s.status === "Approved");
    const past      = sessions.filter(s => ["Rejected", "Cancelled"].includes(s.status));

    const SessionCard = ({ s }: { s: Session }) => {
        const d = new Date(s.date + "T00:00:00");
        const hasRescheduleReq = isRescheduleRequest(s.notes);

        return (
            <div className="p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Date Block */}
                    <div className="flex-none text-center w-16 bg-primary/5 rounded-lg p-2 border border-primary/10 shrink-0">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">{d.toLocaleDateString("en-IN", { month: "short" })}</p>
                        <p className="text-xl font-black text-primary">{d.getDate()}</p>
                        <p className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 items-center mb-1">
                            <span className="font-semibold text-sm">{FMT_TIME(s.time_slot)}</span>
                            <Badge variant="outline" className="text-xs">
                                {s.session_type === "Online" ? <Video className="h-3 w-3 mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                                {s.session_type}
                            </Badge>
                            {s.slot_type === "mentor" && <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">Evening</Badge>}
                            <Badge className={`text-xs border ${STATUS_COLORS[s.status] || ""}`}>{s.status}</Badge>
                            {hasRescheduleReq && (
                                <Badge className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
                                    <RefreshCw className="h-3 w-3 mr-1" /> Reschedule Requested
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm font-semibold">{s.student_name} <span className="text-xs font-mono text-muted-foreground">({s.student_id})</span></p>

                        {s.notes && (
                            <div className="mt-1">
                                {hasRescheduleReq ? (
                                    <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800 space-y-0.5">
                                        <p className="font-semibold flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Reschedule Request Details:</p>
                                        {s.notes.split('\n').filter(Boolean).map((line, i) => (
                                            <p key={i} className="text-blue-700">{line}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-muted-foreground">"{s.notes}"</p>
                                )}
                            </div>
                        )}

                        {/* Student Info Panel */}
                        <StudentInfoPanel studentId={s.student_id} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap shrink-0">
                        {s.status === "Pending" && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => setRespondTarget(s)}>
                                Respond
                            </Button>
                        )}
                        {s.status === "Approved" && (
                            <Button size="sm" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => setRespondTarget(s)}>
                                Cancel
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
                <motion.div {...anim(1)} className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Pending",  value: pending.length,  color: "text-yellow-600", bg: "border-l-yellow-400" },
                        { label: "Upcoming", value: upcoming.length, color: "text-green-600",  bg: "border-l-green-400"  },
                        { label: "Past",     value: past.length,     color: "text-gray-500",   bg: "border-l-gray-300"   },
                    ].map(stat => (
                        <Card key={stat.label} className={`border-l-4 ${stat.bg}`}>
                            <CardContent className="p-4">
                                <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{stat.label}</p>
                                <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </motion.div>

                <Tabs defaultValue="pending">
                    <TabsList>
                        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                        <TabsTrigger value="leaves">My Leaves</TabsTrigger>
                    </TabsList>

                    {[
                        { key: "pending",  list: pending  },
                        { key: "upcoming", list: upcoming },
                        { key: "past",     list: past     },
                    ].map(tab => (
                        <TabsContent key={tab.key} value={tab.key} className="mt-4">
                            {sessionsLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground p-6">
                                    <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                                </div>
                            ) : tab.list.length === 0 ? (
                                <Card>
                                    <CardContent className="p-12 text-center text-muted-foreground">
                                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        No {tab.key} sessions.
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {tab.list.map((s, i) => (
                                        <motion.div key={s.id} {...anim(i)}>
                                            <SessionCard s={s} />
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
        </DashboardLayout>
    );
}
