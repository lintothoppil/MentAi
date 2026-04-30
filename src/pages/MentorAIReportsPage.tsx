import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, Brain, Calendar, Download, FileText, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const BASE = "http://localhost:5000";

const navItems = [
  { label: "Overview", icon: <BarChart3 className="h-4 w-4" />, path: "/dashboard/mentor" },
  { label: "My Mentees", icon: <Users className="h-4 w-4" />, path: "/dashboard/mentor/mentees" },
  { label: "AI Reports", icon: <Brain className="h-4 w-4" />, path: "/dashboard/mentor/ai-reports", isActive: true },
];

const anim = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.05 },
});

type StudentData = {
  student_id: string;
  student_name: string;
  batch: string;
  department: string;
  attendance_percentage: number;
  risk_score: number;
  performance_trend: string;
  pending_remedial_classes: number;
  recommended_mentor_session?: boolean;
  latest_remedial_status?: string | null;
  latest_session_status?: string | null;
  personalized_note_alert_count?: number;
  progress_summary?: string[];
};

type Summary = {
  total_mentees: number;
  high_risk_count: number;
  students_needing_remedial: number;
  avg_attendance: number;
  avg_risk_score: number;
  common_interventions?: Array<{ label: string; value: number }>;
};

type AlertRow = {
  id: number;
  type?: string;
  message: string;
  is_read: boolean;
  created_at: string | null;
};

type StudentAnalysis = {
  ai_insights: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  mentor_action_items: string[];
  root_causes?: string[];
  risk_factors?: string[];
  subject_handler_plan?: string[];
  detailed_summary?: string;
};

type MonitorDetail = {
  student_id: string;
  student_name: string;
  attendance_percentage: number;
  risk_score: number;
  performance_trend: string;
  recommended_mentor_session: boolean;
  remedial_classes: Array<{
    id: number;
    title: string;
    subject_code: string;
    scheduled_date: string | null;
    time_slot: string;
    status: string;
    reason: string;
    feedback: string | null;
    attended: boolean;
    updated_at: string | null;
  }>;
  recent_sessions: Array<{
    id: number;
    date: string | null;
    time_slot: string;
    status: string;
    session_type: string;
    meeting_link?: string | null;
    notes?: string | null;
  }>;
  mentor_interventions: Array<{
    id: number;
    intervention_type: string;
    notes: string | null;
    week_start: string | null;
    risk_snapshot?: number | null;
    created_at: string | null;
  }>;
  remedial_actions: string[];
  personalized_note_alerts: Array<{
    id: number;
    message: string;
    created_at: string | null;
    is_read: boolean;
  }>;
  progress_summary: string[];
  recommended_actions: string[];
  latest_remedial_status?: string | null;
  latest_session_status?: string | null;
};

const emptySummary: Summary = {
  total_mentees: 0,
  high_risk_count: 0,
  students_needing_remedial: 0,
  avg_attendance: 0,
  avg_risk_score: 0,
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeAnalysis = (value: any): StudentAnalysis => ({
  ai_insights: String(value?.ai_insights || "No AI insights available yet."),
  strengths: toStringArray(value?.strengths),
  weaknesses: toStringArray(value?.weaknesses),
  recommendations: toStringArray(value?.recommendations),
  mentor_action_items: toStringArray(value?.mentor_action_items),
  root_causes: toStringArray(value?.root_causes),
  risk_factors: toStringArray(value?.risk_factors),
  subject_handler_plan: toStringArray(value?.subject_handler_plan),
  detailed_summary: String(value?.detailed_summary || ""),
});

export default function MentorAIReportsPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const mentorId = Number(user?.faculty_id || user?.id || 0);
  const reportRole = "mentor";

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [highRiskStudents, setHighRiskStudents] = useState<StudentData[]>([]);
  const [studentsNeedingRemedial, setStudentsNeedingRemedial] = useState<StudentData[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentAnalysis, setStudentAnalysis] = useState<StudentAnalysis | null>(null);
  const [monitorDetail, setMonitorDetail] = useState<MonitorDetail | null>(null);
  const [schedulingStudentId, setSchedulingStudentId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<"online" | "offline">("online");

  useEffect(() => {
    void loadReports();
  }, []);

  useEffect(() => {
    if (!mentorId) return;
    void loadAlerts();
  }, [mentorId]);

  const loadReports = async () => {
    if (!mentorId) return;

    setLoading(true);
    try {
      const query = new URLSearchParams({
        mentor_id: String(mentorId),
        user_role: reportRole,
      });
      const res = await fetch(`${BASE}/api/ai/mentor-reports?${query.toString()}`);
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (res.ok && data.success) {
        setStudents(data.data?.students || []);
        setHighRiskStudents(data.data?.high_risk_students || []);
        setStudentsNeedingRemedial(data.data?.students_needing_remedial || []);
        setSummary(data.data?.summary || emptySummary);
      } else {
        toast.error(data.message || "Failed to load reports");
      }
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetch(`${BASE}/api/alerts/mentor/${mentorId}?unread=true`);
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (res.ok && data.success) {
        setAlerts((data.data || []).filter((item: AlertRow) => !item.is_read));
      } else {
        setAlerts([]);
      }
    } catch {
      setAlerts([]);
    }
  };

  const analyzeStudent = async (studentId: string) => {
    try {
      const [analysisRes, monitorRes] = await Promise.all([
        fetch(`${BASE}/api/ai/performance-analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": reportRole,
          },
          body: JSON.stringify({
            student_id: studentId,
            mentor_id: mentorId,
            report_type: "individual",
            user_role: reportRole,
          }),
        }),
        fetch(`${BASE}/api/ai/mentor-student-monitor/${studentId}?mentor_id=${mentorId}&user_role=${reportRole}`, {
          headers: { "X-User-Role": reportRole },
        }),
      ]);

      const analysisRaw = await analysisRes.text();
      const analysisData = analysisRaw ? JSON.parse(analysisRaw) : {};
      const monitorRaw = await monitorRes.text();
      const monitorData = monitorRaw ? JSON.parse(monitorRaw) : {};

      if (analysisRes.ok && analysisData.success) {
        setStudentAnalysis(normalizeAnalysis(analysisData.data));
        setMonitorDetail(monitorRes.ok && monitorData.success ? monitorData.data : null);
        setSelectedStudent(studentId);
        toast.success("Student analysis completed");
      } else {
        toast.error(analysisData.message || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze student");
    }
  };

  const scheduleMentoringSession = async (studentId: string) => {
    if (!mentorId) return;
    setSchedulingStudentId(studentId);
    try {
      const today = new Date();
      let scheduled = false;

      for (let offset = 1; offset <= 14 && !scheduled; offset += 1) {
        const candidate = new Date(today);
        candidate.setDate(today.getDate() + offset);
        const date = candidate.toISOString().slice(0, 10);
        const slotsRes = await fetch(`${BASE}/api/session/available-slots?mentor_id=${mentorId}&date=${date}`);
        const slotsRaw = await slotsRes.text();
        const slotsData = slotsRaw ? JSON.parse(slotsRaw) : {};
        if (!slotsRes.ok || !slotsData.success) continue;

        const preferredSlot = (slotsData.data || []).find((slot: any) => slot.available);
        if (!preferredSlot) continue;

        const createRes = await fetch(`${BASE}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            mentor_id: mentorId,
            date,
            time_slot: preferredSlot.slot,
            duration: 30,
            mode: sessionMode,
            topic: "High risk mentoring review",
            notes: "Scheduled from mentor AI monitoring to review risk, remedial progress, and next actions.",
          }),
        });
        const createRaw = await createRes.text();
        const createData = createRaw ? JSON.parse(createRaw) : {};
        if (createRes.ok && createData.success) {
          scheduled = true;
          toast.success(`Nearest ${sessionMode} mentoring session scheduled on ${date} at ${preferredSlot.slot}`);
          if (selectedStudent === studentId) {
            await analyzeStudent(studentId);
          }
          await loadReports();
        }
      }

      if (!scheduled) {
        toast.error("No suitable mentoring slot was found in the next 14 days");
      }
    } catch {
      toast.error("Failed to schedule mentoring session");
    } finally {
      setSchedulingStudentId(null);
    }
  };

  const markAlertRead = async (alertId: number) => {
    try {
      const res = await fetch(`${BASE}/api/alerts/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (res.ok && data.success) {
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
        toast.success("Alert acknowledged");
      } else {
        toast.error(data.message || "Failed to acknowledge alert");
      }
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 60) return "text-red-600 bg-red-100 border-red-200";
    if (score >= 30) return "text-amber-600 bg-amber-100 border-amber-200";
    return "text-emerald-600 bg-emerald-100 border-emerald-200";
  };

  const getTrendIcon = (trend: string) => {
    switch (String(trend || "").toLowerCase()) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case "declining":
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 text-amber-600" />;
    }
  };

  const performanceData = students.slice(0, 10).map((student) => ({
    name: student.student_id,
    score: 100 - student.risk_score,
    attendance: student.attendance_percentage,
  }));

  const riskDistribution = [
    { name: "High Risk", value: highRiskStudents.length, color: "#ef4444" },
    { name: "Medium Risk", value: students.filter((student) => student.risk_score >= 30 && student.risk_score < 60).length, color: "#f59e0b" },
    { name: "Low Risk", value: students.filter((student) => student.risk_score < 30).length, color: "#22c55e" },
  ].filter((item) => item.value > 0);

  return (
    <DashboardLayout role="mentor" roleLabel="Mentor Dashboard" navItems={navItems} gradientClass="bg-gradient-to-br from-indigo-100 to-blue-50">
      <div className="space-y-6">
        <motion.div {...anim(0)} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Brain className="h-8 w-8 text-indigo-600" />
              AI-Powered Mentees Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive AI-driven insights into your mentees&apos; performance and risk assessment
            </p>
          </div>
          <Button
            onClick={() => {
              void loadReports();
              void loadAlerts();
            }}
            disabled={loading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {loading ? "Loading..." : "Refresh Reports"}
          </Button>
        </motion.div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Nearest session mode</label>
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={sessionMode}
            onChange={(e) => setSessionMode(e.target.value as "online" | "offline")}
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div {...anim(1)}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Mentees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.total_mentees}</div>
                <p className="text-xs text-muted-foreground mt-1">Active students</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...anim(2)}>
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600">High Risk Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{summary.high_risk_count}</div>
                <p className="text-xs text-muted-foreground mt-1">Need immediate attention</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...anim(3)}>
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-600">Remedial Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{summary.students_needing_remedial}</div>
                <p className="text-xs text-muted-foreground mt-1">Students with pending classes</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...anim(4)}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.avg_attendance.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Across all mentees</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div {...anim(5)} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Mentee Performance Overview
                </CardTitle>
                <CardDescription>Academic health scores (100 - risk score)</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: "transparent" }} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {performanceData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.score > 70 ? "#22c55e" : entry.score > 40 ? "#f59e0b" : "#ef4444"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...anim(6)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Risk Distribution</CardTitle>
                <CardDescription>Overall breakdown of mentee risk levels</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                {riskDistribution.length > 0 ? (
                  <>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={riskDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-4 w-full justify-center text-sm">
                      {riskDistribution.map((item) => (
                        <div key={item.name} className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {(summary.common_interventions || []).length > 0 && (
          <motion.div {...anim(6)}>
            <Card>
              <CardHeader>
                <CardTitle>Common Mentor Measures</CardTitle>
                <CardDescription>Most frequently used intervention types across your mentees.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(summary.common_interventions || []).map((item) => (
                  <div key={item.label} className="rounded-full border bg-white px-3 py-2 text-sm">
                    <span className="font-semibold">{item.label}</span> <span className="text-muted-foreground">({item.value})</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {highRiskStudents.length > 0 && (
          <motion.div {...anim(7)}>
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  High Risk Students - Immediate Action Required
                </CardTitle>
                <CardDescription>Students with risk score {"\u003e="} 60</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {highRiskStudents.map((student) => (
                    <div
                      key={student.student_id}
                      className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-white"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{student.student_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {student.student_id} · {student.batch}
                        </p>
                        <div className="flex gap-3 mt-2">
                          <span className="text-xs">
                            Attendance: <span className="font-semibold">{student.attendance_percentage}%</span>
                          </span>
                          <span className="text-xs">
                            Risk: <span className="font-semibold text-red-600">{student.risk_score}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => void analyzeStudent(student.student_id)}>
                          <Brain className="h-4 w-4 mr-1" />
                          Analyze
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void scheduleMentoringSession(student.student_id)} disabled={schedulingStudentId === student.student_id}>
                          <Calendar className="h-4 w-4 mr-1" />
                          {schedulingStudentId === student.student_id ? "Scheduling..." : "Schedule Meeting"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {studentsNeedingRemedial.length > 0 && (
          <motion.div {...anim(8)}>
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Calendar className="h-5 w-5" />
                  Students with Pending Remedial Classes
                </CardTitle>
                <CardDescription>Students who have remedial classes scheduled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentsNeedingRemedial.map((student) => (
                    <div
                      key={student.student_id}
                      className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-white"
                    >
                      <div>
                        <h3 className="font-semibold">{student.student_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {student.student_id} · {student.pending_remedial_classes} pending class(es)
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void analyzeStudent(student.student_id)}>
                        View Monitoring
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div {...anim(9)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Mentees Performance Summary
              </CardTitle>
              <CardDescription>Complete overview of all your mentees</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 text-left">Student ID</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Batch</th>
                        <th className="p-3 text-left">Attendance</th>
                        <th className="p-3 text-left">Risk Score</th>
                        <th className="p-3 text-left">Trend</th>
                        <th className="p-3 text-left">Remedial</th>
                        <th className="p-3 text-left">Monitoring</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.student_id} className="border-t hover:bg-slate-50">
                          <td className="p-3 font-mono text-xs">{student.student_id}</td>
                          <td className="p-3 font-semibold">{student.student_name}</td>
                          <td className="p-3">{student.batch}</td>
                          <td className="p-3">{student.attendance_percentage.toFixed(1)}%</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(student.risk_score)}`}>
                              {student.risk_score.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {getTrendIcon(student.performance_trend)}
                              <span className="capitalize">{student.performance_trend}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {student.pending_remedial_classes > 0 ? (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                                {student.pending_remedial_classes} pending
                              </span>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {student.personalized_note_alert_count ? (
                                <div className="text-xs text-rose-700 font-medium">
                                  {student.personalized_note_alert_count} personalized-note request(s)
                                </div>
                              ) : null}
                              {(student.progress_summary || []).map((item) => (
                                <div key={item} className="text-xs text-slate-600">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => void analyzeStudent(student.student_id)}>
                                <Brain className="h-4 w-4 mr-1" />
                                Analyze
                              </Button>
                              <Button
                                variant={student.recommended_mentor_session || String(student.performance_trend || "").toLowerCase() !== "stable" ? "destructive" : "secondary"}
                                size="sm"
                                onClick={() => void scheduleMentoringSession(student.student_id)}
                                disabled={schedulingStudentId === student.student_id}
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                {schedulingStudentId === student.student_id ? "Scheduling..." : "Meet"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  No mentee report data is available for this mentor yet.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...anim(10)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                At-Risk Alerts
              </CardTitle>
              <CardDescription>Unread mentor alerts and quick acknowledge.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No unread alerts.</div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border p-4 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold capitalize">{alert.type || "Notification"}</p>
                        <p className="text-sm text-slate-700">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.created_at ? new Date(alert.created_at).toLocaleString() : "Just now"}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void markAlertRead(alert.id)}>
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {studentAnalysis && selectedStudent && (
          <motion.div {...anim(11)}>
            <Card className="border-indigo-200 bg-indigo-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Brain className="h-5 w-5" />
                  AI Analysis - {selectedStudent}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-white border">
                  <h4 className="font-semibold mb-2">AI Insights</h4>
                  <p className="text-sm">{studentAnalysis.ai_insights}</p>
                  {studentAnalysis.detailed_summary ? (
                    <p className="text-sm text-slate-600 mt-3">{studentAnalysis.detailed_summary}</p>
                  ) : null}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                    <h4 className="font-semibold mb-2 text-emerald-700">Strengths</h4>
                    {studentAnalysis.strengths.length > 0 ? (
                      <ul className="space-y-1">
                        {studentAnalysis.strengths.map((strength, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-emerald-600">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No strengths were identified in the current dataset.</p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <h4 className="font-semibold mb-2 text-red-700">Weaknesses</h4>
                    {studentAnalysis.weaknesses.length > 0 ? (
                      <ul className="space-y-1">
                        {studentAnalysis.weaknesses.map((weakness, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-red-600">•</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No major weaknesses were detected right now.</p>
                    )}
                  </div>
                </div>

                {studentAnalysis.root_causes && studentAnalysis.root_causes.length > 0 && (
                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <h4 className="font-semibold mb-2 text-orange-700">Root Causes Of Weak Performance</h4>
                    <ul className="space-y-1">
                      {studentAnalysis.root_causes.map((item, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-orange-600">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {studentAnalysis.risk_factors && studentAnalysis.risk_factors.length > 0 && (
                  <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
                    <h4 className="font-semibold mb-2 text-rose-700">Risk Factors</h4>
                    <ul className="space-y-1">
                      {studentAnalysis.risk_factors.map((item, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-rose-600">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <h4 className="font-semibold mb-2 text-blue-700">Recommendations</h4>
                  {studentAnalysis.recommendations.length > 0 ? (
                    <ol className="space-y-1">
                      {studentAnalysis.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-blue-600 font-bold">{index + 1}.</span>
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recommendations are available yet for this student.</p>
                  )}
                </div>

                {studentAnalysis.mentor_action_items.length > 0 && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <h4 className="font-semibold mb-2 text-purple-700">Mentor Action Items</h4>
                    <ul className="space-y-1">
                      {studentAnalysis.mentor_action_items.map((item, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-purple-600">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {studentAnalysis.subject_handler_plan && studentAnalysis.subject_handler_plan.length > 0 && (
                  <div className="p-4 rounded-lg bg-cyan-50 border border-cyan-200">
                    <h4 className="font-semibold mb-2 text-cyan-700">Subject Handler Remedial Measures</h4>
                    <ul className="space-y-1">
                      {studentAnalysis.subject_handler_plan.map((item, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-cyan-600 font-semibold">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {monitorDetail && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <h4 className="font-semibold mb-2 text-amber-700">Live Progress Monitoring</h4>
                      <ul className="space-y-1">
                        {monitorDetail.progress_summary.map((item) => (
                          <li key={item} className="text-sm">{item}</li>
                        ))}
                      </ul>
                      {monitorDetail.recommended_actions.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-amber-800">Recommended next actions</p>
                          <ul className="space-y-1 mt-1">
                            {monitorDetail.recommended_actions.map((item) => (
                              <li key={item} className="text-sm">{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    <div className="p-4 rounded-lg bg-white border">
                      <h4 className="font-semibold mb-2">Subject Handler Personalized Support</h4>
                      {monitorDetail.personalized_note_alerts.length > 0 ? (
                        <div className="mb-3 space-y-2">
                          {monitorDetail.personalized_note_alerts.map((alert) => (
                            <div key={alert.id} className="rounded-md border bg-rose-50 px-3 py-2 text-sm text-rose-700">
                              {alert.message}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mb-3 text-sm text-muted-foreground">
                          Personalized academic support notes are now provided by the subject handler. Use this panel to monitor requests and follow up on mentoring when needed.
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant={monitorDetail.recommended_mentor_session || String(monitorDetail.performance_trend || "").toLowerCase() !== "stable" ? "destructive" : "secondary"}
                          onClick={() => void scheduleMentoringSession(selectedStudent)}
                          disabled={schedulingStudentId === selectedStudent}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          {schedulingStudentId === selectedStudent ? "Scheduling..." : "Schedule Mentoring Session"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {monitorDetail && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-white border">
                      <h4 className="font-semibold mb-2">Remedial Measures Monitoring</h4>
                      {monitorDetail.remedial_classes.length > 0 ? (
                        <div className="space-y-2">
                          {monitorDetail.remedial_classes.map((item) => (
                            <div key={item.id} className="rounded-md border px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium text-sm">{item.title}</div>
                                <span className="text-xs font-semibold capitalize">{item.status}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{item.subject_name || item.course_name || item.subject_code} · {item.scheduled_date || "No date"} · {item.time_slot}</div>
                              {item.reason ? <div className="mt-1 text-sm">{item.reason}</div> : null}
                              {item.feedback ? <div className="mt-1 text-xs text-slate-600">Feedback: {item.feedback}</div> : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">No remedial class has been scheduled yet.</p>
                          {monitorDetail.remedial_actions.length > 0 ? (
                            <div>
                              <p className="text-sm font-semibold">AI-generated remedial actions</p>
                              <ul className="mt-2 space-y-1">
                                {monitorDetail.remedial_actions.map((item, index) => (
                                  <li key={`${item}-${index}`} className="text-sm flex items-start gap-2">
                                    <span className="text-amber-700 font-semibold">{index + 1}.</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No AI remedial actions are available yet.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg bg-white border">
                      <h4 className="font-semibold mb-2">Mentoring Sessions And Follow-up</h4>
                      {monitorDetail.recent_sessions.length > 0 ? (
                        <div className="space-y-2">
                          {monitorDetail.recent_sessions.map((item) => (
                            <div key={item.id} className="rounded-md border px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium text-sm">{item.date || "No date"} · {item.time_slot}</div>
                                <span className="text-xs font-semibold">{item.status}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{item.session_type}</div>
                              {item.notes ? <div className="mt-1 text-sm">{item.notes}</div> : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">No mentoring sessions have been scheduled yet.</p>
                          <Button
                            variant={monitorDetail.recommended_mentor_session || String(monitorDetail.performance_trend || "").toLowerCase() !== "stable" ? "destructive" : "secondary"}
                            onClick={() => void scheduleMentoringSession(selectedStudent)}
                            disabled={schedulingStudentId === selectedStudent}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            {schedulingStudentId === selectedStudent ? "Scheduling..." : `Schedule Nearest ${sessionMode} Session`}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
