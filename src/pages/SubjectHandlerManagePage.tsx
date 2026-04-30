import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, BookOpen, CalendarDays, FileSpreadsheet, Save, Upload, LayoutDashboard, Brain } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { normalizeRole } from "@/lib/authSession";

const BASE = "http://localhost:5000";

type AcademicLimits = {
  internal_assessment_score: number;
  practical_lab_score: number;
};

type SubjectRow = {
  subject_code: string;
  department: string;
  batch: string;
  faculty_id?: number;
  faculty_name?: string;
  academic_limits?: AcademicLimits;
};
type StudentRow = {
  admission_number: string;
  full_name: string;
  email: string;
  batch: string;
  branch: string;
  total_classes: number;
  attendance_pct: number;
  attendance_warning: boolean;
};

type AcademicRow = {
  student_id: string;
  student_name: string;
  internal_assessment_score: number | null;
  assignment_submitted: boolean;
  practical_lab_score: number | null;
};

type AuditRow = {
  id: number;
  subject_code: string;
  action: string;
  entity: string;
  student_id: string | null;
  details: string | null;
  created_at: string;
};

type HandlerMessageRow = {
  id: number;
  student_id: string;
  student_name: string;
  subject: string;
  category: string;
  message: string;
  attachment_path: string | null;
  sender_role: "student" | "handler";
  status: string;
  created_at: string;
};

type PlaygroundNoteRow = {
  id: number;
  title: string;
  description: string | null;
  subject_code: string;
  scope: string;
  target_student_id: string | null;
  department: string | null;
  batch: string | null;
  download_url: string | null;
  created_at: string;
};

type AttendanceStatus = "Present" | "Absent" | "Late";
type Tab = "marks" | "attendance" | "academic" | "audit" | "messages" | "playground";

const navItems = [
  { label: "Overview", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/subject-handler" },
  { label: "Faculty Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/faculty" },
  { label: "Manage Subject Data", icon: <FileSpreadsheet className="h-4 w-4" />, path: "/dashboard/subject-handler/manage", isActive: true },
  { label: "AI Performance Analysis", icon: <Brain className="h-4 w-4" />, path: "/dashboard/subject-handler/ai-analysis" },
  { label: "Mentor Dashboard", icon: <CalendarDays className="h-4 w-4" />, path: "/dashboard/mentor" },
];

const emptyManualMark = {
  student_id: "",
  exam_type: "Quiz",
  marks_obtained: "",
  max_marks: "100",
};

const DEFAULT_ACADEMIC_LIMITS: AcademicLimits = {
  internal_assessment_score: 100,
  practical_lab_score: 100,
};

export default function SubjectHandlerManagePage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const handlerId = Number(user?.id || 0);
  const role = normalizeRole(user?.role || user?.designation || "");
  const isSubjectHandler = user?.is_subject_handler || role === "subject-handler";

  useEffect(() => {
    if (!isSubjectHandler) {
      toast.error("Access restricted to Subject Handlers only");
      navigate("/dashboard/mentor", { replace: true });
    }
  }, [navigate, isSubjectHandler]);

  if (!isSubjectHandler) {
    return <Navigate to="/dashboard/mentor" replace />;
  }

  const [tab, setTab] = useState<Tab>("marks");
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<
    Array<{ student_id: string; total_classes: number; attendance_percent: number; warning: boolean }>
  >([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [academicRows, setAcademicRows] = useState<AcademicRow[]>([]);
  const [academicLimits, setAcademicLimits] = useState<AcademicLimits>(DEFAULT_ACADEMIC_LIMITS);
  const [messages, setMessages] = useState<HandlerMessageRow[]>([]);
  const [replyStudentId, setReplyStudentId] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [playgroundNotes, setPlaygroundNotes] = useState<PlaygroundNoteRow[]>([]);
  const [playgroundTitle, setPlaygroundTitle] = useState("");
  const [playgroundDescription, setPlaygroundDescription] = useState("");
  const [playgroundScope, setPlaygroundScope] = useState<"class" | "student">("class");
  const [playgroundStudentId, setPlaygroundStudentId] = useState("");
  const [playgroundFile, setPlaygroundFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [marksFile, setMarksFile] = useState<File | null>(null);
  const [manualMarks, setManualMarks] = useState<Array<{ student_id: string; exam_type: string; marks_obtained: string; max_marks: string }>>([
    { ...emptyManualMark },
  ]);

  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [attendanceStartDate, setAttendanceStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [attendanceEndDate, setAttendanceEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [useDateRange, setUseDateRange] = useState(false);
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Record<string, AttendanceStatus>>({});

  const canOperate = handlerId > 0 && !!selectedSubject?.subject_code;

  const tabLabel = useMemo(
    () => ({
      marks: "Upload Marks",
      attendance: "Upload Attendance",
      academic: "Academic Data Entry",
      audit: "Change Logs",
      messages: "Messages",
      playground: "Playground",
    }),
    []
  );

  const subjectScopeParams = (subject: SubjectRow) =>
    new URLSearchParams({
      handler_id: String(handlerId),
      subject_code: subject.subject_code,
      department: subject.department || "",
      batch: subject.batch || "",
    });

  const subjectScopePayload = (subject: SubjectRow) => ({
    handler_id: handlerId,
    subject_code: subject.subject_code,
    department: subject.department || "",
    batch: subject.batch || "",
  });

  const loadSubjects = async () => {
    if (!handlerId) return;
    const res = await fetch(`${BASE}/api/handler/my-subjects/${handlerId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load subjects");
    setSubjects(data.data || []);
    if (!selectedSubject && data.data?.length) setSelectedSubject(data.data[0]);
  };

  const loadStudents = async (subject: SubjectRow) => {
    const res = await fetch(`${BASE}/api/handler/students?${subjectScopeParams(subject).toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load students");
    setStudents(data.data || []);
    const initStatus: Record<string, AttendanceStatus> = {};
    (data.data || []).forEach((s: StudentRow) => {
      initStatus[s.admission_number] = "Present";
    });
    setAttendanceStatusMap(initStatus);
  };

  const loadAttendanceSummary = async (subject: SubjectRow) => {
    const res = await fetch(`${BASE}/api/handler/attendance/summary?${subjectScopeParams(subject).toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load attendance summary");
    setAttendanceSummary(data.data || []);
  };

  const loadAcademicGrid = async (subject: SubjectRow) => {
    const res = await fetch(`${BASE}/api/handler/academic-grid?${subjectScopeParams(subject).toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load academic data");
    setAcademicRows(data.data || []);
    setAcademicLimits(data.meta?.academic_limits || subject.academic_limits || DEFAULT_ACADEMIC_LIMITS);
  };

  const loadAuditLogs = async (subject: SubjectRow) => {
    const res = await fetch(`${BASE}/api/handler/audit-logs?${subjectScopeParams(subject).toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load logs");
    setAuditLogs(data.data || []);
  };

  const loadMessages = async () => {
    const res = await fetch(`${BASE}/api/handler/messages/${handlerId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load messages");
    setMessages(data.data || []);
  };

  const loadPlaygroundNotes = async () => {
    const res = await fetch(`${BASE}/api/handler/playground/${handlerId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load playground notes");
    setPlaygroundNotes(data.data || []);
  };

  const refreshAll = async () => {
    if (!selectedSubject?.subject_code) return;
    setLoading(true);
    try {
      await Promise.all([
        loadStudents(selectedSubject),
        loadAttendanceSummary(selectedSubject),
        loadAcademicGrid(selectedSubject),
        loadAuditLogs(selectedSubject),
        loadMessages(),
        loadPlaygroundNotes(),
      ]);
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects().catch((e) => toast.error(e.message || "Failed to load subjects"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlerId]);

  useEffect(() => {
    if (!selectedSubject?.subject_code) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject?.subject_code]);

  const uploadMarksByFile = async () => {
    if (!canOperate || !marksFile || !selectedSubject) return;
    const fd = new FormData();
    fd.append("file", marksFile);
    fd.append("handler_id", String(handlerId));
    fd.append("subject_code", selectedSubject.subject_code);
    fd.append("department", selectedSubject.department || "");
    fd.append("batch", selectedSubject.batch || "");
    const res = await fetch(`${BASE}/api/handler/marks/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Marks upload failed");
    toast.success(`Marks processed: ${data.updated || 0}`);
    if (data.errors?.length) toast.warning(`${data.errors.length} row(s) skipped`);
    setMarksFile(null);
    await refreshAll();
  };

  const uploadManualMarks = async () => {
    if (!canOperate || !selectedSubject) return;
    const rows = manualMarks
      .filter((r) => r.student_id.trim() && r.marks_obtained.trim())
      .map((r) => ({
        student_id: r.student_id.trim().toUpperCase(),
        exam_type: r.exam_type,
        marks_obtained: Number(r.marks_obtained),
        max_marks: Number(r.max_marks || 100),
      }));

    if (!rows.length) {
      toast.error("Add at least one manual mark row");
      return;
    }

    const bad = rows.find((r) => Number.isNaN(r.marks_obtained) || Number.isNaN(r.max_marks) || r.marks_obtained < 0 || r.marks_obtained > r.max_marks);
    if (bad) {
      toast.error("Marks must be between 0 and max_marks");
      return;
    }

    const res = await fetch(`${BASE}/api/handler/marks/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subjectScopePayload(selectedSubject),
        rows,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Manual marks upload failed");
    toast.success(`Marks saved: ${data.updated || 0}`);
    if (data.errors?.length) toast.warning(`${data.errors.length} row(s) skipped`);
    setManualMarks([{ ...emptyManualMark }]);
    await refreshAll();
  };

  const uploadAttendance = async () => {
    if (!canOperate || !selectedSubject) return;
    const entries = students.map((s) => ({
      student_id: s.admission_number,
      status: attendanceStatusMap[s.admission_number] || "Present",
    }));
    const payload: Record<string, any> = {
      ...subjectScopePayload(selectedSubject),
      entries,
    };
    if (useDateRange) {
      payload.start_date = attendanceStartDate;
      payload.end_date = attendanceEndDate;
    } else {
      payload.date = attendanceDate;
    }
    const res = await fetch(`${BASE}/api/handler/attendance/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Attendance upload failed");
    toast.success(`Attendance saved: ${data.updated || 0} record(s)`);
    if (data.errors?.length) toast.warning(`${data.errors.length} row(s) skipped`);
    await refreshAll();
  };

  const saveAcademicGrid = async () => {
    if (!canOperate || !selectedSubject) return;
    const invalidRow = academicRows.find((row) => {
      const internal = row.internal_assessment_score;
      const practical = row.practical_lab_score;
      return (
        (internal !== null && (internal < 0 || internal > academicLimits.internal_assessment_score)) ||
        (practical !== null && (practical < 0 || practical > academicLimits.practical_lab_score))
      );
    });

    if (invalidRow) {
      toast.error(
        `Check marks for ${invalidRow.student_id}. Internal must be 0-${academicLimits.internal_assessment_score} and practical must be 0-${academicLimits.practical_lab_score}.`
      );
      return;
    }

    const res = await fetch(`${BASE}/api/handler/academic-grid/bulk-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subjectScopePayload(selectedSubject),
        entries: academicRows.map((r) => ({
          student_id: r.student_id,
          internal_assessment_score: r.internal_assessment_score,
          assignment_submitted: r.assignment_submitted,
          practical_lab_score: r.practical_lab_score,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Academic update failed");
    toast.success(`Academic rows saved: ${data.updated || 0}`);
    if (data.errors?.length) toast.warning(`${data.errors.length} row(s) skipped`);
    await refreshAll();
  };

  const setManualMarkValue = (index: number, key: "student_id" | "exam_type" | "marks_obtained" | "max_marks", value: string) => {
    setManualMarks((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  const setAcademicValue = (index: number, key: keyof AcademicRow, value: any) => {
    setAcademicRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  const sendReply = async () => {
    if (!replyStudentId.trim() || !replyMessage.trim()) {
      toast.error("Student and message are required");
      return;
    }
    const res = await fetch(`${BASE}/api/handler/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handler_id: handlerId,
        student_id: replyStudentId.trim().toUpperCase(),
        subject: replySubject.trim() || selectedSubject?.subject_code || "General",
        category: "Academic",
        message: replyMessage.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to send reply");
    toast.success("Reply sent to student");
    setReplyMessage("");
    await loadMessages();
  };

  const uploadPlaygroundNote = async () => {
    if (!selectedSubject || !playgroundTitle.trim() || !playgroundFile) {
      toast.error("Title and note file are required");
      return;
    }
    if (playgroundScope === "student" && !playgroundStudentId.trim()) {
      toast.error("Select a student for dedicated notes");
      return;
    }
    const fd = new FormData();
    fd.append("handler_id", String(handlerId));
    fd.append("subject_code", selectedSubject.subject_code);
    fd.append("title", playgroundTitle.trim());
    fd.append("description", playgroundDescription.trim());
    fd.append("scope", playgroundScope);
    fd.append("department", selectedSubject.department || "");
    fd.append("batch", selectedSubject.batch || "");
    if (playgroundScope === "student") fd.append("target_student_id", playgroundStudentId.trim().toUpperCase());
    fd.append("file", playgroundFile);
    const res = await fetch(`${BASE}/api/handler/playground/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to upload playground note");
    const mentorAlerted = Boolean(data.data?.mentor_alerted);
    toast.success(
      mentorAlerted
        ? "Playground note shared and mentor alerted for personalized notes."
        : "Playground note shared",
    );
    setPlaygroundTitle("");
    setPlaygroundDescription("");
    setPlaygroundFile(null);
    setPlaygroundStudentId("");
    setPlaygroundScope("class");
    await loadPlaygroundNotes();
  };

  return (
    <DashboardLayout role="subject-handler" roleLabel="Subject Handler" navItems={navItems} gradientClass="bg-gradient-to-br from-sky-100 to-cyan-50">
      <div className="space-y-6">
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle>Subject Handler Dashboard</CardTitle>
            <CardDescription>Upload marks, attendance, and academic updates only for your assigned subject allocation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {subjects.length === 0 && <span className="text-sm text-muted-foreground">No subject allocation found.</span>}
              {subjects.map((s) => {
                const active = selectedSubject?.subject_code === s.subject_code && selectedSubject?.batch === s.batch;
                return (
                  <button
                    key={`${s.subject_code}-${s.batch}-${s.department}`}
                    onClick={() => setSelectedSubject(s)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold border ${active ? "bg-cyan-700 text-white border-cyan-700" : "bg-white border-slate-300 text-slate-700"}`}
                  >
                    {s.subject_code} <span className="opacity-80">({s.batch || s.department})</span>
                  </button>
                );
              })}
            </div>
            {selectedSubject && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div><span className="font-semibold">Allocated subject:</span> {selectedSubject.subject_code}</div>
                <div><span className="font-semibold">Batch:</span> {selectedSubject.batch || "-"}</div>
                <div><span className="font-semibold">Department:</span> {selectedSubject.department || "-"}</div>
                <div><span className="font-semibold">Assigned faculty:</span> {selectedSubject.faculty_name || user?.name || "Current handler"}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(tabLabel) as Tab[]).map((t) => (
                <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
                  {tabLabel[t]}
                </Button>
              ))}
              <Button variant="outline" onClick={refreshAll} disabled={!selectedSubject || loading}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {tab === "marks" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload Marks File</CardTitle>
                <CardDescription>CSV or Excel with columns: student_id, exam_type, marks_obtained, max_marks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setMarksFile(e.target.files?.[0] || null)} />
                <Button onClick={() => uploadMarksByFile().catch((e) => toast.error(e.message || "Upload failed"))} disabled={!canOperate || !marksFile}>
                  Upload Marks
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle>Manual Marks Entry</CardTitle>
                <CardDescription>For quick edits without uploading a file.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {manualMarks.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-3" placeholder="Student ID" value={row.student_id} onChange={(e) => setManualMarkValue(idx, "student_id", e.target.value)} />
                    <select
                      className="col-span-3 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={row.exam_type}
                      onChange={(e) => setManualMarkValue(idx, "exam_type", e.target.value)}
                    >
                      <option>Quiz</option>
                      <option>Assignment</option>
                      <option>MidSem</option>
                    </select>
                    <Input className="col-span-2" type="number" placeholder="Marks" value={row.marks_obtained} onChange={(e) => setManualMarkValue(idx, "marks_obtained", e.target.value)} />
                    <Input className="col-span-2" type="number" placeholder="Max" value={row.max_marks} onChange={(e) => setManualMarkValue(idx, "max_marks", e.target.value)} />
                    <Button className="col-span-2" variant="outline" onClick={() => setManualMarks((prev) => prev.filter((_, i) => i !== idx))} disabled={manualMarks.length === 1}>
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setManualMarks((prev) => [...prev, { ...emptyManualMark }])}>Add Row</Button>
                  <Button onClick={() => uploadManualMarks().catch((e) => toast.error(e.message || "Save failed"))} disabled={!canOperate}>Save Manual Marks</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "attendance" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Attendance Upload</CardTitle>
                <CardDescription>Upload by date or date range with status Present / Absent / Late.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <input id="range" type="checkbox" checked={useDateRange} onChange={(e) => setUseDateRange(e.target.checked)} />
                  <label htmlFor="range" className="text-sm">Use date range</label>
                </div>
                {useDateRange ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={attendanceStartDate} onChange={(e) => setAttendanceStartDate(e.target.value)} />
                    <Input type="date" value={attendanceEndDate} onChange={(e) => setAttendanceEndDate(e.target.value)} />
                  </div>
                ) : (
                  <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                )}
                <div className="max-h-64 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 text-left">Student</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.admission_number} className="border-t">
                          <td className="p-2">{s.full_name} ({s.admission_number})</td>
                          <td className="p-2">
                            <select
                              className="rounded-md border border-input bg-background px-2 py-1"
                              value={attendanceStatusMap[s.admission_number] || "Present"}
                              onChange={(e) => setAttendanceStatusMap((prev) => ({ ...prev, [s.admission_number]: e.target.value as AttendanceStatus }))}
                            >
                              <option>Present</option>
                              <option>Absent</option>
                              <option>Late</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={() => uploadAttendance().catch((e) => toast.error(e.message || "Attendance upload failed"))} disabled={!canOperate || students.length === 0}>
                  Save Attendance
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
                <CardDescription>Warns automatically when attendance is below 75%.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left">Student ID</th>
                      <th className="p-2 text-left">Total Classes</th>
                      <th className="p-2 text-left">Attendance %</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSummary.map((row) => (
                      <tr key={row.student_id} className="border-t">
                        <td className="p-2">{row.student_id}</td>
                        <td className="p-2">{row.total_classes}</td>
                        <td className="p-2">{row.attendance_percent.toFixed(2)}</td>
                        <td className="p-2">
                          {row.warning ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <AlertCircle className="h-3 w-3 mr-1" /> Below 75%
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Safe</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "academic" && (
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Save className="h-4 w-4" /> Academic Data Entry Grid</CardTitle>
              <CardDescription>Internal assessment, assignment submission, and practical/lab performance for the selected allocated subject with bulk save.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 md:grid-cols-2">
                <div><span className="font-semibold">Subject:</span> {selectedSubject?.subject_code || "-"}</div>
                <div><span className="font-semibold">Assigned faculty:</span> {selectedSubject?.faculty_name || user?.name || "-"}</div>
                <div><span className="font-semibold">Internal assessment out of:</span> {academicLimits.internal_assessment_score}</div>
                <div><span className="font-semibold">Practical/Lab out of:</span> {academicLimits.practical_lab_score}</div>
              </div>
              <div className="max-h-[500px] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left">Student</th>
                      <th className="p-2 text-left">Internal Assessment</th>
                      <th className="p-2 text-left">Assignment Submitted</th>
                      <th className="p-2 text-left">Practical/Lab Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {academicRows.map((row, idx) => (
                      <tr key={row.student_id} className="border-t">
                        <td className="p-2">{row.student_name} ({row.student_id})</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            max={academicLimits.internal_assessment_score}
                            value={row.internal_assessment_score ?? ""}
                            onChange={(e) => setAcademicValue(idx, "internal_assessment_score", e.target.value === "" ? null : Number(e.target.value))}
                            placeholder={`Out of ${academicLimits.internal_assessment_score}`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={row.assignment_submitted}
                            onChange={(e) => setAcademicValue(idx, "assignment_submitted", e.target.checked)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            max={academicLimits.practical_lab_score}
                            value={row.practical_lab_score ?? ""}
                            onChange={(e) => setAcademicValue(idx, "practical_lab_score", e.target.value === "" ? null : Number(e.target.value))}
                            placeholder={`Out of ${academicLimits.practical_lab_score}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={() => saveAcademicGrid().catch((e) => toast.error(e.message || "Academic save failed"))} disabled={!canOperate || academicRows.length === 0}>
                Save All Academic Updates
              </Button>
            </CardContent>
          </Card>
        )}

        {tab === "audit" && (
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Every change is logged with who, what, and when.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">When</th>
                    <th className="p-2 text-left">Entity</th>
                    <th className="p-2 text-left">Action</th>
                    <th className="p-2 text-left">Student</th>
                    <th className="p-2 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="p-2">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-2">{log.entity}</td>
                      <td className="p-2">{log.action}</td>
                      <td className="p-2">{log.student_id || "-"}</td>
                      <td className="p-2">{log.details || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {tab === "messages" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle>Reply to Students</CardTitle>
                <CardDescription>Direct communication channel between subject handler and students.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={replyStudentId}
                  onChange={(e) => setReplyStudentId(e.target.value)}
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.admission_number} value={s.admission_number}>
                      {s.full_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
                <Input placeholder="Subject" value={replySubject} onChange={(e) => setReplySubject(e.target.value)} />
                <Input
                  placeholder="Type your reply"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
                <Button onClick={() => sendReply().catch((e) => toast.error(e.message || "Reply failed"))} disabled={!replyStudentId}>
                  Send Reply
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle>Recent Conversations</CardTitle>
                <CardDescription>Latest direct messages from students and your replies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[480px] overflow-auto">
                {messages.length === 0 && <div className="text-sm text-muted-foreground">No direct messages yet.</div>}
                {messages.map((msg) => (
                  <div key={msg.id} className={`rounded-md border p-3 ${msg.sender_role === "handler" ? "bg-cyan-50" : "bg-white"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{msg.student_name} ({msg.student_id})</div>
                      <Badge>{msg.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{msg.subject} · {new Date(msg.created_at).toLocaleString()}</div>
                    <div className="mt-2 text-sm">{msg.message}</div>
                    {msg.attachment_path && (
                      <a href={`${BASE}/static/${msg.attachment_path}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-cyan-700 underline">
                        Open attachment
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "playground" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle>Share Notes to Playground</CardTitle>
                <CardDescription>Share notes to the whole class or to one dedicated student only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Note title" value={playgroundTitle} onChange={(e) => setPlaygroundTitle(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={playgroundDescription} onChange={(e) => setPlaygroundDescription(e.target.value)} />
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={playgroundScope}
                  onChange={(e) => setPlaygroundScope(e.target.value as "class" | "student")}
                >
                  <option value="class">Entire class</option>
                  <option value="student">Dedicated student</option>
                </select>
                {playgroundScope === "student" && (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={playgroundStudentId}
                      onChange={(e) => setPlaygroundStudentId(e.target.value)}
                    >
                      <option value="">Select student...</option>
                      {students.map((s) => (
                        <option key={s.admission_number} value={s.admission_number}>
                          {s.full_name} ({s.admission_number})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Only one student can receive a dedicated Playground note at a time. Very weak students will also trigger a mentor follow-up alert for personalized notes.
                    </p>
                  </div>
                )}
                <Input type="file" onChange={(e) => setPlaygroundFile(e.target.files?.[0] || null)} />
                <Button onClick={() => uploadPlaygroundNote().catch((e) => toast.error(e.message || "Upload failed"))}>
                  Share to Playground
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle>Shared Playground Notes</CardTitle>
                <CardDescription>Notes already shared by this handler.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[480px] overflow-auto">
                {playgroundNotes.length === 0 && <div className="text-sm text-muted-foreground">No playground notes shared yet.</div>}
                {playgroundNotes.map((note) => (
                  <div key={note.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{note.title}</div>
                      <Badge>{note.scope === "student" ? "Dedicated" : "Class"}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{note.subject_code} · {new Date(note.created_at).toLocaleString()}</div>
                    {note.description && <div className="mt-2 text-sm">{note.description}</div>}
                    {note.download_url && (
                      <a href={`${BASE}${note.download_url}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-cyan-700 underline">
                        Open note
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
