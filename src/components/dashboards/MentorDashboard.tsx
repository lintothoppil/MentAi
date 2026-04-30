import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { hasRole } from "@/lib/authSession";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BASE = "http://localhost:5000";

const mentorNavItems = [
  { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor", isActive: true },
  { label: "Faculty Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/faculty" },
  { label: "My Mentees", icon: <Users className="h-4 w-4" />, path: "/dashboard/mentor/mentees" },
  { label: "Sessions", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/mentor/sessions" },
  { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty/timetable" },
  { label: "Academics", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/mentor/academics" },
  { label: "AI Reports", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/mentor/ai-reports" },
  { label: "Reports", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/mentor/reports" },
];

type StudentRow = {
  student_id: string;
  student_name: string;
  department: string;
  batch: string;
  attendance_percent: number;
  risk_score: number;
  risk_level: "High" | "Medium" | "Low";
  pending_interventions: number;
};

type AlertRow = {
  id: number;
  student_id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

type RiskResponse = {
  student_id: string;
  overall_risk_score: number;
  overall_risk_level: "High" | "Medium" | "Low";
  ai_explanation: string;
  subject_risks: Array<{
    subject_code: string;
    risk_score: number;
    risk_level: "High" | "Medium" | "Low";
    attendance_percent: number;
    avg_marks: number;
    explanation: string;
  }>;
};

type SessionRow = {
  id: number;
  date: string;
  time_slot: string;
  duration: number;
  mode: string;
  topic: string;
  status: string;
  student_id: string;
  student_name: string;
  notes: string;
  meeting_link?: string;
};

type InterventionRow = {
  id: number;
  student_id: string;
  mentor_id: number;
  intervention_type: string;
  notes: string;
  date: string;
  risk_snapshot: number;
  created_at: string;
};

type MarkRow = {
  subject_code: string;
  internal1: number | null;
  internal2: number | null;
  internal3: number | null;
};

type AttendanceRow = {
  subject_code?: string;
  subject_name?: string;
  percentage?: number;
};

type ChatRow = {
  id: number;
  student_id: string;
  mentor_id: number;
  message: string;
  sender_role: "mentor" | "student";
  sent_at: string;
  is_read: boolean;
};

type ImpactResponse = {
  intervention_id: number;
  student_id: string;
  before: {
    marks_avg: number;
    attendance_percent: number;
    risk_score: number;
  };
  after: {
    marks_avg: number;
    attendance_percent: number;
    risk_score: number;
  };
  risk_delta: number;
};

type CertificateRow = {
  id: number;
  activity_name: string;
  category: string;
  date_of_event: string | null;
  file_path: string | null;
  download_url: string | null;
  share_with_mentor: boolean;
  uploaded_at: string | null;
};

type ReportResponse = {
  summary: {
    total_students_assigned: number;
    high_risk_students: number;
    sessions_held_this_month: number;
    intervention_success_rate: number;
  };
  students_progress: Array<{
    student_id: string;
    student_name: string;
    initial_risk: number;
    current_risk: number;
    attendance_change: number;
    marks_change: number;
    last_intervention_date: string | null;
    improvement_score: number;
  }>;
};

const riskBadgeClass = (level: string) => {
  if (level === "High") return "bg-red-100 text-red-700 border-red-200";
  if (level === "Medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
};

const statusBadgeClass = (status: string) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "completed") return "bg-emerald-600 text-white border-emerald-700";
  if (s === "pending") return "bg-amber-100 text-amber-700 border-amber-200";
  if (s === "rejected") return "bg-red-100 text-red-700 border-red-200";
  if (s === "cancelled" || s === "canceled") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

const sessionStartTs = (dateStr: string, timeSlot: string) => {
  const t = String(timeSlot || "00:00").split("-")[0].trim(); // supports "10:00" or "10:00-10:30"
  const [hhRaw, mmRaw] = t.split(":");
  const hh = Number(hhRaw || 0);
  const mm = Number(mmRaw || 0);
  return new Date(`${dateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`).getTime();
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
};

export default function MentorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const mentorId = Number(user?.id || 0);
  const isSubjectHandler = hasRole(user, "subject-handler");
  const navItems = [
    ...mentorNavItems,
    ...(isSubjectHandler ? [{ label: "Subject Handler", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/subject-handler/manage" }] : []),
  ];

  const [tab, setTab] = useState<"monitoring" | "sessions" | "interventions" | "communication" | "reports">("monitoring");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskResponse | null>(null);
  const [selectedMarks, setSelectedMarks] = useState<MarkRow[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRow[]>([]);
  const [selectedInterventions, setSelectedInterventions] = useState<InterventionRow[]>([]);
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    student_id: "",
    date: new Date().toISOString().split("T")[0],
    time_slot: "10:00",
    duration: 30,
    mode: "Offline",
    topic: "",
    notes: "",
  });

  const [interventionForm, setInterventionForm] = useState({
    student_id: "",
    intervention_type: "Academic",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [chatStudentId, setChatStudentId] = useState("");
  const [chatRows, setChatRows] = useState<ChatRow[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) => s.student_name.toLowerCase().includes(term) || s.student_id.toLowerCase().includes(term));
  }, [students, search]);

  const fetchStudents = async () => {
    const res = await fetch(`${BASE}/api/mentor/students?mentor_id=${mentorId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load mentor students");
    setStudents(data.data || []);
  };

  const fetchAlerts = async () => {
    const res = await fetch(`${BASE}/api/alerts/mentor/${mentorId}?unread=true`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load alerts");
    setAlerts(data.data || []);
  };

  const fetchSessions = async () => {
    const res = await fetch(`${BASE}/api/sessions/mentor/${mentorId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load sessions");
    setSessions(data.data || []);
  };

  const fetchReport = async () => {
    const res = await fetch(`${BASE}/api/reports/mentor/${mentorId}?period=month`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load report");
    setReport(data.data || null);
  };

  const fetchUnread = async () => {
    const res = await fetch(`${BASE}/api/chat/unread-count?mentor_id=${mentorId}`);
    const data = await res.json();
    if (res.ok && data.success) {
      setUnreadCount(data.data?.unread_count || 0);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStudents(), fetchAlerts(), fetchSessions(), fetchReport(), fetchUnread()]);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to refresh mentor dashboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mentorId) return;
    refreshAll();
    const timer = setInterval(() => {
      fetchAlerts().catch(() => undefined);
      fetchUnread().catch(() => undefined);
    }, 25000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId]);

  const openStudentProfile = async (student: StudentRow) => {
    try {
      setSelectedStudent(student);
      const [riskRes, marksRes, attendanceRes, interventionsRes] = await Promise.all([
        fetch(`${BASE}/api/risk/student/${student.student_id}`),
        fetch(`${BASE}/mentor/mentees/${student.student_id}/marks`),
        fetch(`${BASE}/mentor/mentees/${student.student_id}/attendance`),
        fetch(`${BASE}/api/interventions/student/${student.student_id}`),
      ]);
      const riskData = await riskRes.json();
      const marksData = await marksRes.json();
      const attendanceData = await attendanceRes.json();
      const interventionsData = await interventionsRes.json();
      if (riskRes.ok && riskData.success) setSelectedRisk(riskData.data);
      else setSelectedRisk(null);

      setSelectedMarks(marksData.data || []);
      setSelectedAttendance(attendanceData.data || []);
      setSelectedInterventions(interventionsData.data || []);
      setInterventionForm((prev) => ({ ...prev, student_id: student.student_id }));
      setChatStudentId(student.student_id);
      setImpact(null);
      setStudentDialogOpen(true);
    } catch {
      toast.error("Failed to open student profile");
    }
  };

  const markAlertRead = async (id: number) => {
    const res = await fetch(`${BASE}/api/alerts/mark-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: id }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to mark alert read");
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const createSession = async () => {
    if (!sessionForm.student_id || !sessionForm.topic.trim()) {
      toast.error("Student and topic are required");
      return;
    }
    const res = await fetch(`${BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentor_id: mentorId,
        ...sessionForm,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to schedule session");
    toast.success("Session scheduled");
    await fetchSessions();
  };

  const updateSessionStatus = async (sessionId: number, action: "approve" | "reject" | "cancel" | "complete") => {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to update session");
    await fetchSessions();
  };

  const createIntervention = async () => {
    if (!interventionForm.student_id || !interventionForm.notes.trim()) {
      toast.error("Student and notes are required");
      return;
    }
    const res = await fetch(`${BASE}/api/interventions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentor_id: mentorId,
        ...interventionForm,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to create intervention");
    toast.success("Intervention recorded");
    const iv = await fetch(`${BASE}/api/interventions/student/${interventionForm.student_id}`);
    const ivData = await iv.json();
    if (iv.ok && ivData.success) setSelectedInterventions(ivData.data || []);
  };

  const viewImpact = async (interventionId: number) => {
    const res = await fetch(`${BASE}/api/interventions/impact/${interventionId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load intervention impact");
    setImpact(data.data);
  };

  const loadChat = async () => {
    if (!chatStudentId.trim()) return;
    const res = await fetch(`${BASE}/api/chat/${chatStudentId.trim().toUpperCase()}?mentor_id=${mentorId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load chat");
    setChatRows(data.data || []);
  };

  const sendChat = async () => {
    if (!chatStudentId.trim() || !chatMessage.trim()) {
      toast.error("Student and message are required");
      return;
    }
    const res = await fetch(`${BASE}/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: chatStudentId.trim().toUpperCase(),
        mentor_id: mentorId,
        message: chatMessage,
        sender_role: "mentor",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to send message");
    setChatMessage("");
    await loadChat();
  };

  const marksTrendData = useMemo(() => {
    const map: Record<string, { subject: string; internal1: number | null; internal2: number | null; internal3: number | null }> = {};
    (selectedMarks || []).forEach((m) => {
      const code = m.subject_code || "NA";
      if (!map[code]) map[code] = { subject: code, internal1: null, internal2: null, internal3: null };
      map[code].internal1 = m.internal1;
      map[code].internal2 = m.internal2;
      map[code].internal3 = m.internal3;
    });
    return Object.values(map);
  }, [selectedMarks]);

  const attendanceTrendData = useMemo(() => {
    return (selectedAttendance || []).map((a) => ({
      subject: a.subject_code || a.subject_name || "NA",
      attendance: Number(a.percentage || 0),
    }));
  }, [selectedAttendance]);

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    const rows = (sessions || []).filter((s) => {
      const st = String(s.status || "").toLowerCase();
      if (st !== "pending" && st !== "approved") return false;
      return sessionStartTs(s.date, s.time_slot) >= now;
    });
    rows.sort((a, b) => sessionStartTs(a.date, a.time_slot) - sessionStartTs(b.date, b.time_slot));
    return rows;
  }, [sessions]);

  const historySessions = useMemo(() => {
    const now = Date.now();
    const rows = (sessions || []).filter((s) => {
      const st = String(s.status || "").toLowerCase();
      if (["completed", "rejected", "cancelled", "canceled"].includes(st)) return true;
      if ((st === "approved" || st === "pending") && sessionStartTs(s.date, s.time_slot) < now) return true;
      return false;
    });
    rows.sort((a, b) => sessionStartTs(b.date, b.time_slot) - sessionStartTs(a.date, a.time_slot));
    return rows;
  }, [sessions]);

  return (
    <DashboardLayout role="mentor" roleLabel="Mentor Dashboard" navItems={navItems} gradientClass="gradient-mentor">
      <div className="space-y-6">
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle>Mentor Dashboard Module</CardTitle>
            <CardDescription>Monitoring, AI risk, sessions, interventions, communication, and reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Total Students</div><div className="text-xl font-bold">{report?.summary.total_students_assigned ?? students.length}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">High Risk</div><div className="text-xl font-bold text-red-600">{report?.summary.high_risk_students ?? students.filter(s => s.risk_level === "High").length}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Sessions This Month</div><div className="text-xl font-bold">{report?.summary.sessions_held_this_month ?? 0}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Intervention Success</div><div className="text-xl font-bold">{report?.summary.intervention_success_rate ?? 0}%</div></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={tab === "monitoring" ? "default" : "outline"} onClick={() => setTab("monitoring")}>Student Monitoring</Button>
              <Button variant={tab === "sessions" ? "default" : "outline"} onClick={() => setTab("sessions")}>Sessions</Button>
              <Button variant={tab === "interventions" ? "default" : "outline"} onClick={() => setTab("interventions")}>Interventions</Button>
              <Button variant={tab === "communication" ? "default" : "outline"} onClick={() => setTab("communication")}>Communication {unreadCount > 0 ? `(${unreadCount})` : ""}</Button>
              <Button variant={tab === "reports" ? "default" : "outline"} onClick={() => setTab("reports")}>Reports</Button>
              <Button variant="outline" onClick={() => window.location.href = "/dashboard/mentor/ai-reports"}>🤖 AI Reports</Button>
              <Button variant="outline" onClick={refreshAll} disabled={loading}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        {tab === "monitoring" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 border border-slate-200">
              <CardHeader>
                <CardTitle>Assigned Students</CardTitle>
                <CardDescription>Name, ID, risk, attendance, and pending interventions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Search student name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="max-h-[450px] overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 text-left">Student</th>
                        <th className="p-2 text-left">Risk</th>
                        <th className="p-2 text-left">Attendance</th>
                        <th className="p-2 text-left">Pending</th>
                        <th className="p-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s) => (
                        <tr key={s.student_id} className="border-t">
                          <td className="p-2">{s.student_name}<div className="text-xs text-muted-foreground">{s.student_id}</div></td>
                          <td className="p-2"><Badge className={riskBadgeClass(s.risk_level)}>{s.risk_level} ({s.risk_score})</Badge></td>
                          <td className="p-2">{s.attendance_percent}%</td>
                          <td className="p-2">{s.pending_interventions}</td>
                          <td className="p-2"><Button size="sm" variant="outline" onClick={() => openStudentProfile(s)}>View Profile</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> At-Risk Alerts</CardTitle>
                <CardDescription>Unread mentor alerts and quick acknowledge.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-auto">
                {alerts.length === 0 && <div className="text-sm text-muted-foreground">No unread alerts.</div>}
                {alerts.map((a) => (
                  <div key={a.id} className="rounded-md border p-3">
                    <div className="text-xs font-semibold text-slate-600">{a.type}</div>
                    <div className="text-sm font-medium">{a.student_id}</div>
                    <div className="text-sm">{a.message}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                      <Button size="sm" variant="ghost" onClick={() => markAlertRead(a.id).catch((e) => toast.error(e.message || "Failed"))}>Mark Read</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "sessions" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardHeader><CardTitle>Schedule Session</CardTitle><CardDescription>Prevents mentor/student double booking.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Student</div>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={sessionForm.student_id}
                    onChange={(e) => setSessionForm((p) => ({ ...p, student_id: e.target.value }))}
                  >
                    <option value="">Select mentee...</option>
                    {students.map((s) => (
                      <option key={s.student_id} value={s.student_id}>
                        {s.student_name} ({s.student_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={sessionForm.date} onChange={(e) => setSessionForm((p) => ({ ...p, date: e.target.value }))} />
                  <Input type="time" value={sessionForm.time_slot} onChange={(e) => setSessionForm((p) => ({ ...p, time_slot: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="rounded-md border px-3 py-2 text-sm" value={sessionForm.duration} onChange={(e) => setSessionForm((p) => ({ ...p, duration: Number(e.target.value) }))}>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                  </select>
                  <select className="rounded-md border px-3 py-2 text-sm" value={sessionForm.mode} onChange={(e) => setSessionForm((p) => ({ ...p, mode: e.target.value }))}>
                    <option>Online</option>
                    <option>Offline</option>
                  </select>
                </div>
                {String(sessionForm.mode || "").toLowerCase() === "online" && (
                  <div className="text-xs text-muted-foreground">
                    Online sessions auto-create a Google Meet link and notify the student with an easy join link.
                  </div>
                )}
                <Input placeholder="Topic" value={sessionForm.topic} onChange={(e) => setSessionForm((p) => ({ ...p, topic: e.target.value }))} />
                <Textarea placeholder="Notes" value={sessionForm.notes} onChange={(e) => setSessionForm((p) => ({ ...p, notes: e.target.value }))} />
                <Button onClick={() => createSession().catch((e) => toast.error(e.message || "Failed to schedule"))}>Create Session</Button>
              </CardContent>
            </Card>

              <div className="space-y-4">
                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle>Upcoming Sessions</CardTitle>
                    <CardDescription>Pending and approved sessions that are coming up soon.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[240px] overflow-auto">
                    {upcomingSessions.length === 0 && <div className="text-sm text-muted-foreground">No upcoming sessions.</div>}
                    {upcomingSessions.map((s) => (
                      <div key={s.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{s.student_name} ({s.student_id})</div>
                            <div className="text-sm text-muted-foreground">{s.date} {s.time_slot} • {s.mode} • {s.topic}</div>
                          </div>
                          <Badge className={statusBadgeClass(s.status)}>{s.status}</Badge>
                        </div>
                        {String(s.mode || "").toLowerCase() === "online" && s.meeting_link && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(s.meeting_link as string, "_blank", "noopener,noreferrer")}
                            >
                              Join Google Meet
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(String(s.meeting_link));
                                  toast.success("Meet link copied");
                                } catch {
                                  toast.error("Failed to copy link");
                                }
                              }}
                            >
                            Copy Link
                          </Button>
                        </div>
                        )}
                        {String(s.status || "").toLowerCase() === "pending" && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateSessionStatus(s.id, "approve").catch((e) => toast.error(e.message || "Failed"))}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => updateSessionStatus(s.id, "reject").catch((e) => toast.error(e.message || "Failed"))}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle>Session History</CardTitle>
                    <CardDescription>Completed sessions show in green. Rejected sessions show in red with no extra buttons.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[240px] overflow-auto">
                    {historySessions.length === 0 && <div className="text-sm text-muted-foreground">No session history yet.</div>}
                    {historySessions.map((s) => {
                      const st = String(s.status || "").toLowerCase();
                      const hasPassed = sessionStartTs(s.date, s.time_slot) < Date.now();
                      const showComplete = st === "approved" && hasPassed;
                      const showApproveReject = st === "pending";
                      return (
                        <div key={s.id} className="rounded-md border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{s.student_name} ({s.student_id})</div>
                              <div className="text-sm text-muted-foreground">{s.date} {s.time_slot} • {s.mode} • {s.topic}</div>
                            </div>
                            <Badge className={statusBadgeClass(s.status)}>{s.status}</Badge>
                          </div>
                          {String(s.mode || "").toLowerCase() === "online" && s.meeting_link && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(s.meeting_link as string, "_blank", "noopener,noreferrer")}
                              >
                                Join Google Meet
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(String(s.meeting_link));
                                    toast.success("Meet link copied");
                                  } catch {
                                    toast.error("Failed to copy link");
                                  }
                                }}
                              >
                                Copy Link
                              </Button>
                            </div>
                          )}
                          {showApproveReject && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateSessionStatus(s.id, "approve").catch((e) => toast.error(e.message || "Failed"))}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => updateSessionStatus(s.id, "reject").catch((e) => toast.error(e.message || "Failed"))}>
                                Reject
                              </Button>
                            </div>
                          )}
                          {showComplete && (
                            <div className="mt-2">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateSessionStatus(s.id, "complete").catch((e) => toast.error(e.message || "Failed"))}>
                                Complete
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
          </div>
        )}

        {tab === "interventions" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardHeader><CardTitle>Record Intervention</CardTitle><CardDescription>Academic, Counseling, Remedial, Parent meeting.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={interventionForm.student_id}
                  onChange={(e) => setInterventionForm((p) => ({ ...p, student_id: e.target.value }))}
                >
                  <option value="">Select mentee...</option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.student_name} ({s.student_id})
                    </option>
                  ))}
                </select>
                <select className="rounded-md border px-3 py-2 text-sm" value={interventionForm.intervention_type} onChange={(e) => setInterventionForm((p) => ({ ...p, intervention_type: e.target.value }))}>
                  <option>Academic</option>
                  <option>Counseling</option>
                  <option>Remedial</option>
                  <option>Parent meeting</option>
                </select>
                <Input type="date" value={interventionForm.date} onChange={(e) => setInterventionForm((p) => ({ ...p, date: e.target.value }))} />
                <Textarea placeholder="Notes & recommendations" value={interventionForm.notes} onChange={(e) => setInterventionForm((p) => ({ ...p, notes: e.target.value }))} />
                <Button onClick={() => createIntervention().catch((e) => toast.error(e.message || "Failed"))}>Save Intervention</Button>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader><CardTitle>Intervention Tracking</CardTitle><CardDescription>Check pre/post impact and risk change.</CardDescription></CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-auto">
                {selectedInterventions.length === 0 && <div className="text-sm text-muted-foreground">Open a student profile or add by student ID.</div>}
                {selectedInterventions.map((iv) => (
                  <div key={iv.id} className="rounded-md border p-3">
                    <div className="font-semibold">{iv.student_id} • {iv.intervention_type}</div>
                    <div className="text-sm text-muted-foreground">{iv.date}</div>
                    <div className="text-sm mt-1">{iv.notes}</div>
                    <Button className="mt-2" size="sm" variant="outline" onClick={() => viewImpact(iv.id).catch((e) => toast.error(e.message || "Failed to load impact"))}>View Impact</Button>
                  </div>
                ))}
                {impact && (
                  <div className="rounded-md border bg-slate-50 p-3 text-sm">
                    <div className="font-semibold">Before vs After</div>
                    <div>Marks: {impact.before.marks_avg} → {impact.after.marks_avg}</div>
                    <div>Attendance: {impact.before.attendance_percent}% → {impact.after.attendance_percent}%</div>
                    <div>Risk: {impact.before.risk_score} → {impact.after.risk_score} ({impact.risk_delta})</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "communication" && (
          <Card className="border border-slate-200">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Chat / Guidance Messages</CardTitle><CardDescription>Student-wise mentoring chat and quick guidance messages.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-md border px-3 py-2 text-sm bg-background"
                  value={chatStudentId}
                  onChange={(e) => setChatStudentId(e.target.value)}
                >
                  <option value="">Select mentee...</option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.student_name} ({s.student_id})
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => loadChat().catch((e) => toast.error(e.message || "Failed"))}>Load Chat</Button>
              </div>
              <div className="max-h-[300px] overflow-auto rounded-md border p-2 space-y-2">
                {chatRows.map((m) => (
                  <div key={m.id} className={`rounded-md p-2 text-sm ${m.sender_role === "mentor" ? "bg-cyan-50" : "bg-slate-100"}`}>
                    <div className="text-xs text-muted-foreground">{m.sender_role} • {new Date(m.sent_at).toLocaleString()}</div>
                    <div>{m.message}</div>
                  </div>
                ))}
              </div>
              <Textarea placeholder="Type guidance message..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => sendChat().catch((e) => toast.error(e.message || "Failed"))}>Send</Button>
                <Button variant="outline" onClick={() => setChatMessage("Reminder: Assignment due Friday")}>Template: Assignment Reminder</Button>
                <Button variant="outline" onClick={() => setChatMessage("Workshop on study skills this week.")}>Template: Study Workshop</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "reports" && (
          <Card className="border border-slate-200">
            <CardHeader><CardTitle>Mentoring Reports</CardTitle><CardDescription>Risk movement, marks change, and intervention progress.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="h-72 rounded-md border p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report?.students_progress || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="student_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="initial_risk" fill="#f59e0b" name="Initial Risk" />
                      <Bar dataKey="current_risk" fill="#06b6d4" name="Current Risk" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-72 rounded-md border p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report?.students_progress || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="student_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="marks_change" stroke="#16a34a" name="Marks Change" />
                      <Line type="monotone" dataKey="improvement_score" stroke="#7c3aed" name="Improvement Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="max-h-[340px] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left">Student</th>
                      <th className="p-2 text-left">Initial → Current Risk</th>
                      <th className="p-2 text-left">Marks Change</th>
                      <th className="p-2 text-left">Last Intervention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.students_progress || []).map((r) => (
                      <tr key={r.student_id} className="border-t">
                        <td className="p-2">{r.student_name} ({r.student_id})</td>
                        <td className="p-2">{r.initial_risk} → {r.current_risk}</td>
                        <td className="p-2">{r.marks_change}</td>
                        <td className="p-2">{r.last_intervention_date ? new Date(r.last_intervention_date).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.student_name} ({selectedStudent?.student_id})</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>AI Risk View</CardTitle><CardDescription>{selectedRisk?.ai_explanation || "No AI explanation available"}</CardDescription></CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-auto">
                <div className="text-sm"><span className="font-semibold">Overall:</span> {selectedRisk?.overall_risk_level} ({selectedRisk?.overall_risk_score})</div>
                {(selectedRisk?.subject_risks || []).map((s) => (
                  <div key={s.subject_code} className="rounded-md border p-2">
                    <div className="font-semibold">{s.subject_code}</div>
                    <div className="text-xs">{s.risk_level} ({s.risk_score}) • Attendance {s.attendance_percent}% • Avg {s.avg_marks}</div>
                    <div className="text-xs text-muted-foreground">{s.explanation}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Attendance Trend (Subject-wise)</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="attendance" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Marks Trend (Last Internals)</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marksTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="internal1" stroke="#0284c7" />
                    <Line type="monotone" dataKey="internal2" stroke="#0ea5e9" />
                    <Line type="monotone" dataKey="internal3" stroke="#22c55e" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
