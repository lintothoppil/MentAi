import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
  BookOpen,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { normalizeRole } from "@/lib/authSession";

const BASE = "http://localhost:5000";

const navItems = [
  { label: "Overview", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/subject-handler" },
  { label: "Manage Subject Data", icon: <Users className="h-4 w-4" />, path: "/dashboard/subject-handler/manage" },
  { label: "AI Performance Analysis", icon: <Brain className="h-4 w-4" />, path: "/dashboard/subject-handler/ai-analysis", isActive: true },
];

type DistributionRow = {
  label: string;
  value: number;
};

type WeakStudent = {
  student_id: string;
  student_name: string;
  batch: string;
  department: string;
  subject_code: string;
  subject_avg_marks: number;
  subject_attendance_pct: number;
  failed_assessments: number;
  overall_risk: number;
  risk_band: string;
  performance_status: string;
  weak_areas: string[];
  recommended_remedial: string[];
};

type SubjectOverview = {
  subject_code: string;
  scope_label: string;
  total_students: number;
  analyzed_students: number;
  avg_marks: number;
  avg_attendance: number;
  status_distribution: DistributionRow[];
  stability_distribution: DistributionRow[];
  risk_distribution: DistributionRow[];
  weak_area_distribution: DistributionRow[];
  weak_students: WeakStudent[];
  faculty_recommendations: string[];
  remedial_methods: string[];
  graph_summary?: string[];
  ai_summary: string;
  source: string;
  api_key_status?: string;
};

type AnalysisResult = {
  performance_trend: string;
  risk_assessment: string;
  strengths: string[];
  weaknesses: string[];
  root_causes?: string[];
  risk_factors?: string[];
  root_cause_summary?: string;
  risk_summary?: string;
  subject_analysis?: Record<string, { marks_avg: number; attendance_pct: number; status: string; summary?: string }>;
  recommendations: string[];
  remedial_needed: boolean;
  remedial_subjects: string[];
  ai_insights: string;
  mentor_action_items: string[];
  subject_handler_plan?: string[];
  detailed_summary?: string;
  api_key_status?: string;
};

type SubjectAllocation = {
  subject_code: string;
  department?: string;
  batch?: string;
  faculty_name?: string;
};

const RISK_COLORS: Record<string, string> = {
  High: "#dc2626",
  Medium: "#f59e0b",
  Low: "#16a34a",
};

const STATUS_COLORS: Record<string, string> = {
  Improving: "#16a34a",
  Stable: "#2563eb",
  Declining: "#dc2626",
  "Non-stable": "#f59e0b",
};

export default function SubjectHandlerAIAnalysisPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const handlerId = Number(user?.id || 0);
  const activeRole = normalizeRole(user?.role || "subject-handler");

  const [subjects, setSubjects] = useState<SubjectAllocation[]>([]);
  const [students, setStudents] = useState<Array<{ admission_number: string; full_name?: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [overview, setOverview] = useState<SubjectOverview | null>(null);
  const [personalizedNote, setPersonalizedNote] = useState("");
  const [sendingPersonalizedNote, setSendingPersonalizedNote] = useState(false);

  const [showRemedialForm, setShowRemedialForm] = useState(false);
  const [remedialForm, setRemedialForm] = useState({
    title: "",
    description: "",
    scheduled_date: "",
    time_slot: "",
    duration_minutes: 60,
    mode: "online",
    meeting_link: "",
  });

  const selectedAllocation = useMemo(
    () => subjects.find((subject) => subject.subject_code === selectedSubject) || null,
    [subjects, selectedSubject],
  );

  const nonStableCount = useMemo(
    () => overview?.stability_distribution.find((item) => item.label === "Non-stable")?.value || 0,
    [overview],
  );

  useEffect(() => {
    loadSubjects();
  }, [handlerId]);

  useEffect(() => {
    if (!handlerId || !selectedSubject || !selectedAllocation) return;
    loadStudentsForSubject(selectedAllocation);
    loadSubjectOverview(selectedAllocation);
  }, [handlerId, selectedSubject, selectedAllocation]);

  const loadSubjects = async () => {
    try {
      const res = await fetch(`${BASE}/api/handler/my-subjects/${handlerId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const nextSubjects = data.data
          .map((subject: any) => ({
            subject_code: String(subject.subject_code || "").trim(),
            department: String(subject.department || "").trim(),
            batch: String(subject.batch || "").trim(),
            faculty_name: subject.faculty_name,
          }))
          .filter((subject: SubjectAllocation) => subject.subject_code);

        setSubjects(nextSubjects);
        if (nextSubjects.length > 0) {
          setSelectedSubject(nextSubjects[0].subject_code);
        }
      }
    } catch (error) {
      toast.error("Failed to load subject allocations");
    }
  };

  const loadStudentsForSubject = async (subject: SubjectAllocation) => {
    setStudentsLoading(true);
    try {
      const query = new URLSearchParams({
        handler_id: String(handlerId),
        subject_code: subject.subject_code,
        department: subject.department || "",
        batch: subject.batch || "",
      });
      const res = await fetch(`${BASE}/api/handler/students?${query.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStudents(data.data);
        setSelectedStudent((current) =>
          data.data.some((student: { admission_number: string }) => student.admission_number === current)
            ? current
            : data.data[0]?.admission_number || "",
        );
      } else {
        setStudents([]);
        setSelectedStudent("");
      }
    } catch (error) {
      setStudents([]);
      setSelectedStudent("");
      toast.error("Failed to load students for the selected subject");
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadSubjectOverview = async (subject: SubjectAllocation) => {
    setOverviewLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/subject-overview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": activeRole || "subject-handler",
        },
        body: JSON.stringify({
          handler_id: handlerId,
          subject_code: subject.subject_code,
          department: subject.department || "",
          batch: subject.batch || "",
          user_role: activeRole || "subject-handler",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOverview(data.data);
      } else {
        setOverview(null);
        toast.error(data.message || "Failed to load AI overview");
      }
    } catch (error) {
      setOverview(null);
      toast.error("Failed to load AI overview");
    } finally {
      setOverviewLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/performance-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": activeRole || "subject-handler",
        },
        body: JSON.stringify({
          student_id: selectedStudent,
          subject_code: selectedSubject || undefined,
          handler_id: handlerId,
          report_type: "individual",
          user_role: activeRole || "subject-handler",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAnalysis(data.data);
        toast.success("AI analysis completed successfully");
      } else {
        toast.error(data.message || "Analysis failed");
      }
    } catch (error) {
      toast.error("Failed to run analysis");
    } finally {
      setLoading(false);
    }
  };

  const scheduleRemedial = async () => {
    if (!remedialForm.title || !remedialForm.scheduled_date || !remedialForm.time_slot) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/remedial-classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Role": "subject-handler" },
        body: JSON.stringify({
          student_id: selectedStudent,
          subject_code: selectedSubject,
          handler_id: handlerId,
          ...remedialForm,
          reason: remedialReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Remedial class scheduled successfully");
        setShowRemedialForm(false);
      } else {
        toast.error(data.message || "Failed to schedule remedial class");
      }
    } catch (error) {
      toast.error("Failed to schedule remedial class");
    }
  };

  const sendPersonalizedNote = async () => {
    if (!selectedStudent || !selectedSubject || !personalizedNote.trim()) {
      toast.error("Select a student and enter a personalized subject handler note");
      return;
    }

    setSendingPersonalizedNote(true);
    try {
      const res = await fetch(`${BASE}/api/handler/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handler_id: handlerId,
          student_id: selectedStudent,
          subject: selectedSubject,
          category: "Academic Support",
          message: personalizedNote.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Personalized subject handler note sent");
        setPersonalizedNote("");
      } else {
        toast.error(data.message || "Failed to send personalized note");
      }
    } catch (error) {
      toast.error("Failed to send personalized note");
    } finally {
      setSendingPersonalizedNote(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    const key = risk in RISK_COLORS ? risk : "Low";
    return {
      backgroundColor: `${RISK_COLORS[key]}20`,
      color: RISK_COLORS[key],
      borderColor: `${RISK_COLORS[key]}40`,
    };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case "improving":
        return <TrendingUp className="h-5 w-5 text-emerald-600" />;
      case "declining":
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Target className="h-5 w-5 text-blue-600" />;
    }
  };

  const remedialReason = useMemo(() => {
    if (!analysis) return overview?.ai_summary || "AI recommended remedial support";

    const parts = [
      analysis.root_cause_summary,
      analysis.risk_summary,
      analysis.detailed_summary,
      analysis.ai_insights,
    ].filter(Boolean);

    return parts.join(" ").trim() || overview?.ai_summary || "AI recommended remedial support";
  }, [analysis, overview]);

  return (
    <DashboardLayout role="subject-handler" roleLabel="Subject Handler" navItems={navItems} gradientClass="bg-gradient-to-br from-violet-100 to-purple-50">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Brain className="h-8 w-8 text-violet-600" />
              AI Performance Analysis
            </h1>
            <p className="text-muted-foreground mt-1">
              Full AI-backed class analysis for weak students, weak areas, faculty recommendations, and remedial planning.
            </p>
          </div>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Select Subject & Student</CardTitle>
            <CardDescription>Choose a subject to analyze the full class, then drill into a student if needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setAnalysis(null);
                  }}
                >
                  <option value="">Select subject...</option>
                  {subjects.map((subject) => (
                    <option key={`${subject.subject_code}-${subject.department || ""}-${subject.batch || ""}`} value={subject.subject_code}>
                      {subject.subject_code}{subject.batch ? ` - ${subject.batch}` : ""}{subject.department ? ` - ${subject.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Student for Deep Analysis</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  disabled={!selectedSubject || studentsLoading}
                >
                  <option value="">{studentsLoading ? "Loading students..." : "Select student..."}</option>
                  {students.map((student) => (
                    <option key={student.admission_number} value={student.admission_number}>
                      {student.admission_number}{student.full_name ? ` - ${student.full_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={runAnalysis} disabled={loading || !selectedStudent}>
                {loading ? "Analyzing..." : "Run Student AI Analysis"}
              </Button>
              {overview && (
                <Badge variant="outline" className="px-3 py-2 capitalize">
                  Overview source: {overview.source}
                </Badge>
              )}
              {(analysis?.api_key_status || overview?.api_key_status) && (
                <Badge variant="outline" className="px-3 py-2 capitalize">
                  AI engine API key: {(analysis?.api_key_status || overview?.api_key_status) === "configured" ? "Configured" : "Missing"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {overviewLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Running AI class analysis...</CardContent>
          </Card>
        ) : overview ? (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Students Analyzed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{overview.analyzed_students}</div>
                  <p className="text-xs text-muted-foreground mt-1">{overview.scope_label}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Marks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{overview.avg_marks}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Subject-wise performance</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{overview.avg_attendance}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Attendance in this subject</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Non-Stable</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">{nonStableCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Improving + declining students</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid xl:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-violet-600" />
                    Status Breakdown
                  </CardTitle>
                  <CardDescription>Stable, improving, and declining students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.status_distribution}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <RechartsTooltip />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {overview.status_distribution.map((entry) => (
                            <Cell key={entry.label} fill={STATUS_COLORS[entry.label] || "#64748b"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Risk Distribution
                  </CardTitle>
                  <CardDescription>High, medium, and low risk students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={overview.risk_distribution} dataKey="value" nameKey="label" outerRadius={100} innerRadius={60}>
                          {overview.risk_distribution.map((entry) => (
                            <Cell key={entry.label} fill={RISK_COLORS[entry.label] || "#64748b"} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-600" />
                    Weak Areas
                  </CardTitle>
                  <CardDescription>Main areas where students need support</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.weak_area_distribution} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                        <YAxis dataKey="label" type="category" width={120} tickLine={false} axisLine={false} />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill="#dc2626" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-violet-600" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="leading-relaxed text-sm">{overview.ai_summary}</p>
                  {overview.graph_summary && overview.graph_summary.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Graph Summary</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {overview.graph_summary.map((item, index) => (
                          <li key={`${item}-${index}`} className="flex gap-2">
                            <span className="text-violet-600 font-semibold">{index + 1}.</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Faculty Recommendations</h4>
                    <ul className="space-y-2 text-sm">
                      {overview.faculty_recommendations.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-2">
                          <span className="text-blue-600 font-semibold">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-600" />
                    Recommended Remedial Methods
                  </CardTitle>
                  <CardDescription>Suggested faculty actions for this subject group</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {overview.remedial_methods.map((method, index) => (
                      <li key={`${method}-${index}`} className="rounded-lg border bg-amber-50/60 p-3">
                        {method}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-600" />
                  Weak Students To Prioritize
                </CardTitle>
                <CardDescription>Students most likely to need faculty intervention and remedial support</CardDescription>
              </CardHeader>
              <CardContent>
                {overview.weak_students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No immediate weak-student alerts for this subject.</p>
                ) : (
                  <div className="space-y-3">
                    {overview.weak_students.map((student) => (
                      <div key={student.student_id} className="rounded-xl border p-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{student.student_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {student.student_id} · {student.batch}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge style={getRiskBadge(student.risk_band)}>{student.risk_band}</Badge>
                            <Badge variant="outline" className="capitalize">{student.performance_status}</Badge>
                            <Badge variant="outline">Fails: {student.failed_assessments}</Badge>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm">
                          <div className="rounded-lg bg-muted/40 p-3">
                            <div className="text-muted-foreground">Marks</div>
                            <div className="text-lg font-semibold">{student.subject_avg_marks}%</div>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <div className="text-muted-foreground">Attendance</div>
                            <div className="text-lg font-semibold">{student.subject_attendance_pct}%</div>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <div className="text-muted-foreground">Overall Risk</div>
                            <div className="text-lg font-semibold">{student.overall_risk}</div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="font-medium mb-1">Weak Areas</div>
                            <div className="flex flex-wrap gap-2">
                              {student.weak_areas.map((area) => (
                                <Badge key={area} variant="outline" className="border-red-200 text-red-700 bg-red-50">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium mb-1">Recommended Faculty Action</div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {student.recommended_remedial.map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : selectedSubject ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No overview data found for this subject.</CardContent>
          </Card>
        ) : null}

        {analysis && (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {getTrendIcon(analysis.performance_trend)}
                    <span className="text-2xl font-bold capitalize">{analysis.performance_trend}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="text-lg px-4 py-2 capitalize" style={getRiskBadge(analysis.risk_assessment.charAt(0).toUpperCase() + analysis.risk_assessment.slice(1))}>
                    {analysis.risk_assessment}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Remedial Needed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {analysis.remedial_needed ? <AlertTriangle className="h-8 w-8 text-red-600" /> : <CheckCircle className="h-8 w-8 text-emerald-600" />}
                    <span className="text-2xl font-bold">{analysis.remedial_needed ? "Yes" : "No"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-violet-600" />
                  Individual AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base leading-relaxed">{analysis.ai_insights}</p>
                {analysis.detailed_summary && (
                  <div className="rounded-lg border bg-violet-50/60 p-4 text-sm leading-relaxed">
                    {analysis.detailed_summary}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardHeader>
                  <CardTitle className="text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm">- {strength}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm">- {weakness}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-orange-200 bg-orange-50/60">
                <CardHeader>
                  <CardTitle className="text-orange-700 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Root Cause Of Subject Failure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {(analysis.root_causes || []).map((item, index) => (
                      <li key={`${item}-${index}`}>- {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-rose-200 bg-rose-50/60">
                <CardHeader>
                  <CardTitle className="text-rose-700 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Risk And Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {(analysis.risk_factors || []).map((item, index) => (
                      <li key={`${item}-${index}`}>- {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Student Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {analysis.recommendations.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="font-semibold text-blue-600">{index + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-600" />
                  Subject Handler Recovery Plan
                </CardTitle>
                <CardDescription>Detailed next steps to bring the student back on track using the AI engine output.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(analysis.subject_handler_plan || []).map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="font-semibold text-sky-600">{index + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-sky-200 bg-sky-50/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-600" />
                  Personalized Subject Handler Note
                </CardTitle>
                <CardDescription>
                  Send a direct academic support note for this student from the subject handler.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={personalizedNote}
                  onChange={(e) => setPersonalizedNote(e.target.value)}
                  placeholder="Write a personalized subject handler note for this student..."
                  className="min-h-28"
                />
                <Button onClick={sendPersonalizedNote} disabled={sendingPersonalizedNote || !selectedStudent}>
                  {sendingPersonalizedNote ? "Sending..." : "Send Personalized Note"}
                </Button>
              </CardContent>
            </Card>

            {analysis.remedial_needed && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Calendar className="h-5 w-5" />
                    Schedule Remedial Class
                  </CardTitle>
                  <CardDescription>
                    AI recommends remedial classes for: {analysis.remedial_subjects.join(", ")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showRemedialForm ? (
                    <Button onClick={() => setShowRemedialForm(true)} className="w-full">
                      Schedule Remedial Class
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Title *</label>
                          <Input value={remedialForm.title} onChange={(e) => setRemedialForm({ ...remedialForm, title: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Date *</label>
                          <Input type="date" value={remedialForm.scheduled_date} onChange={(e) => setRemedialForm({ ...remedialForm, scheduled_date: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Time Slot *</label>
                          <Input value={remedialForm.time_slot} onChange={(e) => setRemedialForm({ ...remedialForm, time_slot: e.target.value })} placeholder="15:00-16:00" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
                          <Input type="number" value={remedialForm.duration_minutes} onChange={(e) => setRemedialForm({ ...remedialForm, duration_minutes: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Mode</label>
                          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={remedialForm.mode} onChange={(e) => setRemedialForm({ ...remedialForm, mode: e.target.value })}>
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Meeting Link</label>
                          <Input value={remedialForm.meeting_link} onChange={(e) => setRemedialForm({ ...remedialForm, meeting_link: e.target.value })} placeholder="https://meet.google.com/..." />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <Textarea value={remedialForm.description} onChange={(e) => setRemedialForm({ ...remedialForm, description: e.target.value })} />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={scheduleRemedial} className="flex-1">
                          <Video className="h-4 w-4 mr-2" />
                          Schedule Class
                        </Button>
                        <Button variant="outline" onClick={() => setShowRemedialForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
