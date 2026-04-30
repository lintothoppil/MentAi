import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
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
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const navItems = [
  { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
  { label: "Academics", icon: <BarChart3 className="h-4 w-4" />, path: "/dashboard/student/academics", isActive: true },
  { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
  { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/timetable" },
  { label: "Mentoring", icon: <Users className="h-4 w-4" />, path: "/dashboard/student/mentoring" },
  { label: "Requests", icon: <FileText className="h-4 w-4" />, path: "/dashboard/student/requests" },
  { label: "Certificates", icon: <Upload className="h-4 w-4" />, path: "/dashboard/student/certificates" },
  { label: "Notifications", icon: <Bell className="h-4 w-4" />, path: "/dashboard/student/notifications" },
];

const anim = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.07 },
});

const CARD_LABEL = "text-[10px] uppercase tracking-[0.1em] font-black text-muted-foreground mb-1";

const averageNonNull = (values: any[]): number | null => {
  const nums = values
    .map((value) => (value == null || value === "" ? null : Number(value)))
    .filter((value): value is number => value != null && !Number.isNaN(value));
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
};

const normalizeScore = (value: any): number | null => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return numeric <= 50 ? numeric * 2 : numeric;
};

const normalizeInternalScore = (marksRow: any): number | null => {
  const avgInternal = averageNonNull([
    normalizeScore(marksRow.internal1),
    normalizeScore(marksRow.internal2),
    normalizeScore(marksRow.internal3),
  ]);
  return avgInternal == null ? null : avgInternal;
};

const getCombinedScore = (marksRow: any): number | null => {
  const university = marksRow.university_mark == null || marksRow.university_mark === "" ? null : Number(marksRow.university_mark);
  const internal = normalizeInternalScore(marksRow);
  if (university != null && !Number.isNaN(university) && internal != null) return Number(((university * 0.7) + (internal * 0.3)).toFixed(1));
  if (university != null && !Number.isNaN(university)) return Number(university.toFixed(1));
  if (internal != null) return Number(internal.toFixed(1));
  return null;
};

const getGradePoint = (markOrGrade: any): number | null => {
  if (markOrGrade === null || markOrGrade === undefined || markOrGrade === "") return null;
  const num = parseFloat(String(markOrGrade));
  if (!Number.isNaN(num)) {
    if (num >= 90) return 10;
    if (num >= 80) return 9;
    if (num >= 70) return 8;
    if (num >= 60) return 7;
    if (num >= 50) return 6;
    if (num >= 45) return 5;
    if (num >= 40) return 4;
    return 0;
  }
  const g = String(markOrGrade).toUpperCase().trim();
  const mapping: Record<string, number> = { S: 10, O: 10, "A+": 9, A: 8.5, "B+": 8, B: 7.5, "C+": 7, C: 6.5, D: 6, P: 5.5, F: 0, FE: 0 };
  return mapping[g] !== undefined ? mapping[g] : null;
};

const calculateApproxGPA = (marksArray: any[]): string => {
  const scores = marksArray
    .map((mark) => getCombinedScore(mark))
    .filter((value): value is number => value != null && !Number.isNaN(value));
  if (!scores.length) return "—";
  const avgScore = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return (avgScore / 10).toFixed(2);
};

const calculateCurrentSemester = (batchStr: string): number => {
  if (!batchStr) return 1;
  const match = batchStr.match(/(\d{4})\s*-\s*(\d{4})/) || batchStr.match(/(\d{4})/);
  if (!match) return 1;
  const startYear = parseInt(match[1], 10);
  const endYear = match[2] ? parseInt(match[2], 10) : startYear + 2;
  const maxSem = (endYear - startYear) * 2;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const academicYearsCompleted = year - startYear - (month < 8 ? 1 : 0);
  const isEvenSem = month < 8;
  const sem = academicYearsCompleted * 2 + (isEvenSem ? 2 : 1);
  return Math.min(maxSem, Math.max(1, sem));
};

const PROGRESSION_LINES = [
  { key: "progressionScore", label: "Progression", color: "#111827" },
  { key: "attendance", label: "Attendance", color: "#0891b2" },
  { key: "university", label: "University", color: "#ea580c" },
  { key: "combined", label: "Combined", color: "#64748b" },
] as const;

function SemesterProgressionGraph({ data }: { data: any[] }) {
  const width = 980;
  const height = 320;
  const padLeft = 54;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 42;

  if (!data.length) {
    return (
      <div className="flex h-[22rem] items-center justify-center rounded-[1.8rem] border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
        No semester progression data is available yet.
      </div>
    );
  }

  const graphWidth = width - padLeft - padRight;
  const graphHeight = height - padTop - padBottom;
  const xForIndex = (index: number) => padLeft + (data.length === 1 ? graphWidth / 2 : (index * graphWidth) / (data.length - 1));
  const yForValue = (value: number) => padTop + graphHeight - (Math.max(0, Math.min(100, value)) / 100) * graphHeight;

  const buildPath = (key: string) => {
    let path = "";
    data.forEach((entry, index) => {
      const value = entry[key];
      if (value == null || Number.isNaN(Number(value))) return;
      const x = xForIndex(index);
      const y = yForValue(Number(value));
      path += path ? ` L ${x} ${y}` : `M ${x} ${y}`;
    });
    return path;
  };

  return (
    <div className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[22rem] w-full">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = yForValue(tick);
          return (
            <g key={tick}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={padLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#64748b">{tick}</text>
            </g>
          );
        })}

        {data.map((entry, index) => {
          const x = xForIndex(index);
          return (
            <g key={entry.semesterNumber}>
              <line x1={x} x2={x} y1={padTop} y2={height - padBottom} stroke="#f1f5f9" />
              <text x={x} y={height - 14} textAnchor="middle" fontSize="12" fontWeight="800" fill="#475569">{entry.semester}</text>
            </g>
          );
        })}

        {PROGRESSION_LINES.map((line) => {
          const path = buildPath(line.key);
          return path ? <path key={line.key} d={path} fill="none" stroke={line.color} strokeWidth={line.key === "progressionScore" ? 4 : 2.5} strokeLinecap="round" strokeLinejoin="round" /> : null;
        })}

        {PROGRESSION_LINES.map((line) =>
          data.map((entry, index) => {
            const value = entry[line.key];
            if (value == null || Number.isNaN(Number(value))) return null;
            return (
              <circle
                key={`${line.key}-${entry.semesterNumber}`}
                cx={xForIndex(index)}
                cy={yForValue(Number(value))}
                r={line.key === "progressionScore" ? 5.5 : 4}
                fill={line.color}
                stroke="#ffffff"
                strokeWidth="2"
              />
            );
          }),
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3">
        {PROGRESSION_LINES.map((line) => (
          <div key={line.key} className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
            {line.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentAcademicsPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admNo = user.admission_number || "";

  const [academics, setAcademics] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [marks, setMarks] = useState<any[]>([]);
  const [semesterProgression, setSemesterProgression] = useState<any[]>([]);
  const [currentProgressionSemester, setCurrentProgressionSemester] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<number | "All">("All");
  const [progressionView, setProgressionView] = useState<"selected" | "upto" | "previous" | "full">("full");
  const [progressionSemester, setProgressionSemester] = useState<number | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSemester, setPdfSemester] = useState("1");
  const [uploading, setUploading] = useState(false);
  const [extractResult, setExtractResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMarks = () => {
    fetch(`http://localhost:5000/api/student/marks/${admNo}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMarks(Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!admNo) return;
    setLoading(true);

    fetch(`http://localhost:5000/api/student/detail/${admNo}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAcademics(d.data.academics);
          if (d.data.batch) setPdfSemester(String(calculateCurrentSemester(d.data.batch)));
        }
      })
      .catch(() => {});

    fetch(`http://localhost:5000/api/analytics/student/${admNo}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAnalytics(d.data);
      })
      .catch(() => {});

    fetch(`http://localhost:5000/api/student/semester-progression/${admNo}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSemesterProgression(Array.isArray(d.data?.semesters) ? d.data.semesters : []);
          setCurrentProgressionSemester(d.data?.current_semester ?? null);
        }
      })
      .catch(() => {});

    fetchMarks();
  }, [admNo]);

  const uploadMarksheet = async (force = false) => {
    if (!pdfFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", pdfFile);
    fd.append("student_id", admNo);
    fd.append("semester", pdfSemester);
    if (force) fd.append("force_replace", "true");

    try {
      const res = await fetch("http://localhost:5000/api/student/marksheet/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!data.success && data.needs_confirmation) {
        if (window.confirm("All previous records for this semester will be replaced. Do you want to continue?")) {
          setUploading(false);
          return uploadMarksheet(true);
        }
      } else if (data.success) {
        setExtractResult(data);
        toast.success(data.message || "Marks extracted successfully");
        fetchMarks();
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    }

    setUploading(false);
  };

  const downloadResult = (semester: number) => {
    const semesterMarks = marks.filter((mark) => Number(mark.semester) === Number(semester));
    const allVerified = semesterMarks.length > 0 && semesterMarks.every((mark) => mark.is_verified);
    if (!allVerified) {
      toast.error("Result sheet is locked until your mentor verifies all marks for that semester.");
      return;
    }
    window.open(`http://localhost:5000/api/student/marksheet/download/${admNo}/${semester}`, "_blank");
  };

  const progressionSemesterNumbers = semesterProgression.map((entry) => Number(entry.semester)).filter((semester) => !Number.isNaN(semester));
  const semesters = [...new Set([...marks.map((mark) => Number(mark.semester)).filter((semester) => !Number.isNaN(semester)), ...progressionSemesterNumbers])].sort((a, b) => a - b);
  const activeMarks = selectedSemester === "All" ? marks : marks.filter((mark) => Number(mark.semester) === Number(selectedSemester));
  const semesterCards = selectedSemester === "All" ? semesters : [selectedSemester as number];

  useEffect(() => {
    if (!semesters.length) {
      setProgressionSemester(null);
      return;
    }

    setProgressionSemester((current) => {
      if (current != null && semesters.includes(current)) return current;
      if (currentProgressionSemester != null && semesters.includes(currentProgressionSemester)) return currentProgressionSemester;
      return semesters[semesters.length - 1];
    });
  }, [marks, currentProgressionSemester, semesterProgression.length]);

  useEffect(() => {
    if (!semesters.length) return;
    if (selectedSemester !== "All") return;
    if (currentProgressionSemester != null && semesters.includes(currentProgressionSemester)) {
      setSelectedSemester(currentProgressionSemester);
      return;
    }
    setSelectedSemester(semesters[semesters.length - 1]);
  }, [semesters, currentProgressionSemester, selectedSemester]);

  const semesterTrendData = semesterProgression.map((entry) => ({
    semester: `Sem ${entry.semester}`,
    semesterNumber: Number(entry.semester),
    internal1: entry.internal1_avg != null ? Number(entry.internal1_avg) : null,
    internal2: entry.internal2_avg != null ? Number(entry.internal2_avg) : null,
    internal3: entry.internal3_avg != null ? Number(entry.internal3_avg) : null,
    attendance: entry.attendance_avg != null ? Number(entry.attendance_avg) : null,
    university: entry.university_avg != null ? Number(entry.university_avg) : null,
    combined: entry.combined_avg != null ? Number(entry.combined_avg) : null,
    progressionScore: entry.progression_score != null ? Number(entry.progression_score) : null,
    delta: entry.combined_delta != null ? Number(entry.combined_delta) : null,
    subjectCount: entry.subject_count ?? 0,
    subjects: Array.isArray(entry.subjects) ? entry.subjects : [],
  }));

  const selectedSemesterNumber = selectedSemester === "All" ? null : Number(selectedSemester);
  const progressionSemesterNumber = progressionSemester != null ? Number(progressionSemester) : null;
  const previousSemesterNumber = progressionSemesterNumber != null ? semesters.filter((semester) => semester < progressionSemesterNumber).slice(-1)[0] ?? null : null;
  const progressionTrendData = (() => {
    if (!semesterTrendData.length) return [];
    if (progressionView === "full") return semesterTrendData;
    if (progressionSemesterNumber == null) return [];
    if (progressionView === "selected") {
      return semesterTrendData.filter((entry) => entry.semesterNumber === progressionSemesterNumber);
    }
    if (progressionView === "upto") {
      return semesterTrendData.filter((entry) => entry.semesterNumber <= progressionSemesterNumber);
    }
    if (progressionView === "previous") {
      return semesterTrendData.filter((entry) => entry.semesterNumber === previousSemesterNumber || entry.semesterNumber === progressionSemesterNumber);
    }
    return semesterTrendData;
  })();

  const progressionDescription = (() => {
    if (progressionView === "full") {
      return "Full-course line graph for all available semesters.";
    }
    if (progressionSemesterNumber == null) {
      return "Choose a semester target to view its progression line graph.";
    }
    if (progressionView === "selected") {
      return `Focused line view for Semester ${progressionSemesterNumber}.`;
    }
    if (progressionView === "upto") {
      return `Line graph from Semester 1 up to Semester ${progressionSemesterNumber}.`;
    }
    if (progressionView === "previous") {
      return previousSemesterNumber != null
        ? `Direct line comparison between Semester ${previousSemesterNumber} and Semester ${progressionSemesterNumber}.`
        : `No earlier semester is available before Semester ${progressionSemesterNumber}.`;
    }
    return "Full-course line graph for all available semesters.";
  })();

  const progressionSemesterDetails = progressionSemesterNumber != null
    ? semesterTrendData.find((entry) => entry.semesterNumber === progressionSemesterNumber)
    : null;
  const selectedSemesterProgression = selectedSemester !== "All"
    ? semesterTrendData.find((entry) => entry.semesterNumber === Number(selectedSemester))
    : null;

  const subjectComparisonData = activeMarks.map((mark) => {
    const internal1 = normalizeScore(mark.internal1);
    const internal2 = normalizeScore(mark.internal2);
    const internal3 = normalizeScore(mark.internal3);
    const internalAvg = normalizeInternalScore(mark);
    const university = mark.university_mark == null || mark.university_mark === "" ? null : Number(mark.university_mark);
    const combined = getCombinedScore(mark);
    const gap = internalAvg != null && university != null ? Number((university - internalAvg).toFixed(1)) : null;
    const title = mark.course_name || mark.display_name || mark.subject_code;

    return {
      subject: selectedSemester === "All" ? `S${mark.semester} ${title}` : title,
      shortSubject: title.length > 18 ? `${title.slice(0, 18)}…` : title,
      code: mark.subject_code,
      internal1: internal1 ?? 0,
      internal2: internal2 ?? 0,
      internal3: internal3 ?? 0,
      internalAvg: internalAvg ?? 0,
      university: university ?? 0,
      combined: combined ?? 0,
      gap,
      is_verified: mark.is_verified,
    };
  });

  const internalAvg = selectedSemesterProgression
    ? selectedSemesterProgression.internal3 ?? selectedSemesterProgression.internal2 ?? selectedSemesterProgression.internal1 ?? null
    : averageNonNull(activeMarks.map((mark) => normalizeInternalScore(mark)));
  const universityAvg = selectedSemesterProgression
    ? selectedSemesterProgression.university
    : averageNonNull(activeMarks.map((mark) => mark.university_mark));
  const combinedAvg = selectedSemesterProgression
    ? selectedSemesterProgression.combined ?? selectedSemesterProgression.progressionScore
    : averageNonNull(activeMarks.map((mark) => getCombinedScore(mark)));
  const verifiedCount = activeMarks.filter((mark) => mark.is_verified).length;
  const visibleSemesterSgpa = selectedSemester !== "All" ? academics?.semester_sgpa?.[selectedSemester] : null;
  const fallbackCgpa = academics?.cgpa != null && Number(academics.cgpa) > 0 ? Number(academics.cgpa).toFixed(2) : "—";
  const cgpaValue = activeMarks.length > 0
    ? calculateApproxGPA(activeMarks)
    : visibleSemesterSgpa != null && Number(visibleSemesterSgpa) > 0
      ? Number(visibleSemesterSgpa).toFixed(2)
      : fallbackCgpa;

  let backlogs = 0;
  activeMarks.forEach((mark) => {
    const val = mark.university_grade || mark.university_mark;
    const point = getGradePoint(val);
    if (point === 0) backlogs += 1;
  });

  const latestSemesterTrend = semesterTrendData.length > 0 ? semesterTrendData[semesterTrendData.length - 1] : null;
  const progressionValue = latestSemesterTrend?.delta ?? null;
  const progressionLabel = progressionValue == null
    ? "Need more semester data"
    : progressionValue > 0
      ? `Progression +${progressionValue}`
      : progressionValue < 0
        ? `Depreciation ${progressionValue}`
        : "Stable";

  const attendanceValue = analytics?.attendance_percentage != null ? `${analytics.attendance_percentage.toFixed(1)}%` : "—";
  const selectedSemesterVerified = selectedSemester !== "All"
    ? marks.filter((mark) => Number(mark.semester) === Number(selectedSemester)).every((mark) => mark.is_verified)
    : false;

  return (
    <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="bg-gradient-to-br from-amber-50 via-white to-cyan-50 dark:from-slate-900 dark:to-slate-950">
      <div className="space-y-8">
        <motion.div {...anim(0)} className="px-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Academic Performance</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
            Current semester data is shown first. Use the semester selector to open any previous semester only when you want to review older academic records.
          </p>
        </motion.div>

        <motion.div {...anim(1)} className="rounded-[2rem] border border-amber-100 bg-white/90 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            {currentProgressionSemester != null && (
              <Button
                variant="outline"
                className={`rounded-2xl font-black ${selectedSemester === currentProgressionSemester ? "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 hover:text-white" : "border-slate-200 text-slate-600"}`}
                onClick={() => setSelectedSemester(currentProgressionSemester)}
              >
                Current Semester
              </Button>
            )}
            <Button
              variant="outline"
              className={`rounded-2xl font-black ${selectedSemester === "All" ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-600"}`}
              onClick={() => setSelectedSemester("All")}
            >
              All Semesters
            </Button>
            {semesters.map((semester) => (
              <Button
                key={semester}
                variant="outline"
                className={`rounded-2xl font-black ${selectedSemester === semester ? "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 hover:text-white" : "border-slate-200 text-slate-600"}`}
                onClick={() => setSelectedSemester(semester)}
              >
                Semester {semester}
              </Button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: selectedSemester === "All" ? "Course GPA" : `Semester ${selectedSemester} GPA`,
              value: cgpaValue,
              icon: <GraduationCap className="h-5 w-5 text-slate-900" />,
              tone: "from-slate-100 to-slate-50",
            },
            {
              label: "Combined Average",
              value: combinedAvg != null ? combinedAvg.toFixed(1) : "—",
              icon: <BarChart3 className="h-5 w-5 text-cyan-700" />,
              tone: "from-cyan-100 to-white",
            },
            {
              label: "Internal Average",
              value: internalAvg != null ? internalAvg.toFixed(1) : "—",
              icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
              tone: "from-blue-100 to-white",
            },
            {
              label: "University Average",
              value: universityAvg != null ? universityAvg.toFixed(1) : "—",
              icon: <Award className="h-5 w-5 text-emerald-600" />,
              tone: "from-emerald-100 to-white",
            },
            {
              label: "Progression",
              value: progressionLabel,
              icon: progressionValue != null && progressionValue < 0 ? <TrendingDown className="h-5 w-5 text-rose-600" /> : <TrendingUp className="h-5 w-5 text-emerald-600" />,
              tone: progressionValue != null && progressionValue < 0 ? "from-rose-100 to-white" : "from-amber-100 to-white",
            },
          ].map((item, index) => (
            <motion.div key={item.label} {...anim(index + 2)}>
              <Card className={`overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br ${item.tone} shadow-[0_12px_32px_rgba(15,23,42,0.08)]`}>
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className={CARD_LABEL}>{item.label}</p>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">{item.icon}</div>
                  </div>
                  <p className="text-3xl font-black tracking-tight text-slate-900">{item.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div {...anim(7)}>
          <Card className="overflow-hidden rounded-[2.5rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(124,58,237,0.08)]">
            <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-8">
              <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                <Sparkles className="h-7 w-7 text-violet-600" />
                AI Marksheet Extractor
              </CardTitle>
              <CardDescription className="font-semibold">
                Upload your university marksheet PDF and save the semester result directly into your result sheet directory.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 p-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className={CARD_LABEL}>Semester</label>
                  <select
                    className="w-full rounded-2xl border border-violet-200 bg-violet-50/40 px-4 py-3 text-sm font-bold text-slate-800 outline-none"
                    value={pdfSemester}
                    onChange={(e) => setPdfSemester(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                      <option key={semester} value={semester}>
                        Semester {semester}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="cursor-pointer rounded-[2rem] border-2 border-dashed border-violet-200 bg-violet-50/30 p-10 text-center transition-colors hover:bg-violet-50"
                  onClick={() => fileRef.current?.click()}
                >
                  {pdfFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                      <p className="text-lg font-black text-slate-900">{pdfFile.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FileUp className="mx-auto h-12 w-12 text-violet-300" />
                      <p className="text-lg font-black text-violet-700">Click to upload PDF</p>
                      <p className="text-xs font-semibold text-slate-500">University marksheet PDF</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      setPdfFile(e.target.files?.[0] || null);
                      setExtractResult(null);
                    }}
                  />
                </div>

                {pdfFile && (
                  <div className="flex gap-3">
                    <Button className="flex-1 rounded-2xl bg-violet-600 font-black text-white hover:bg-violet-700" onClick={uploadMarksheet} disabled={uploading}>
                      {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" />Extract & Save Marks</>}
                    </Button>
                    <Button variant="outline" className="rounded-2xl border-slate-200" onClick={() => { setPdfFile(null); setExtractResult(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-violet-100 bg-slate-50/70 p-6">
                {!extractResult ? (
                  <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                    <Sparkles className="mb-3 h-10 w-10 text-violet-300" />
                    <p className="font-black text-slate-700">Extracted subjects will appear here</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">You will see exact course names once extraction finishes.</p>
                  </div>
                ) : extractResult.success ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      <p className="font-black text-emerald-700">Extracted {extractResult.extracted.length} subjects</p>
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {extractResult.extracted.map((entry: any, index: number) => (
                        <div key={`${entry.subj}-${index}`} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-900">{entry.course_name || entry.display_name || entry.subj}</p>
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{entry.subject_code || entry.subj}</p>
                            </div>
                            <Badge className="border-none bg-emerald-600 px-3 py-1 font-black text-white">{entry.mark ?? entry.grade ?? "—"}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="font-black text-rose-700">{extractResult.message}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
          <motion.div {...anim(8)} className="xl:col-span-3">
            <Card className="h-full overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-cyan-50 p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                      <TrendingUp className="h-7 w-7 text-cyan-600" />
                      Semester Progression
                    </CardTitle>
                    <CardDescription className="font-semibold">
                      {progressionDescription}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-3 lg:items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Progression Target</span>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 outline-none"
                        value={progressionSemesterNumber ?? ""}
                        onChange={(e) => setProgressionSemester(e.target.value ? Number(e.target.value) : null)}
                        disabled={!semesters.length}
                      >
                        {!semesters.length && <option value="">No semesters</option>}
                        {semesters.map((semester) => (
                          <option key={semester} value={semester}>
                            Semester {semester}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className={`rounded-2xl font-black ${progressionView === "full" ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-600"}`}
                      onClick={() => setProgressionView("full")}
                    >
                      Full Course
                    </Button>
                    <Button
                      variant="outline"
                      className={`rounded-2xl font-black ${progressionView === "upto" ? "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 hover:text-white" : "border-slate-200 text-slate-600"}`}
                      onClick={() => setProgressionView("upto")}
                      disabled={progressionSemesterNumber == null}
                    >
                      Up To Sem
                    </Button>
                    <Button
                      variant="outline"
                      className={`rounded-2xl font-black ${progressionView === "previous" ? "border-amber-600 bg-amber-600 text-white hover:bg-amber-700 hover:text-white" : "border-slate-200 text-slate-600"}`}
                      onClick={() => setProgressionView("previous")}
                      disabled={progressionSemesterNumber == null || previousSemesterNumber == null}
                    >
                      Previous vs Current
                    </Button>
                    <Button
                      variant="outline"
                      className={`rounded-2xl font-black ${progressionView === "selected" ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white" : "border-slate-200 text-slate-600"}`}
                      onClick={() => setProgressionView("selected")}
                      disabled={progressionSemesterNumber == null}
                    >
                      Selected Sem
                    </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-5">
                <SemesterProgressionGraph data={progressionTrendData} />
                {progressionTrendData.length === 0 && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    No semester progression data is available yet for the selected graph mode.
                  </div>
                )}

              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...anim(9)} className="xl:col-span-2">
            <Card className="h-full overflow-hidden rounded-[2.5rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_18px_50px_rgba(245,158,11,0.08)]">
              <CardHeader className="p-8 pb-5">
                <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                  <Award className="h-7 w-7 text-amber-600" />
                  Performance Readout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-8 pt-0">
                <div className="rounded-[1.8rem] border border-white bg-white/80 p-5 shadow-sm">
                  <p className={CARD_LABEL}>Selection</p>
                  <p className="text-2xl font-black text-slate-900">{selectedSemester === "All" ? "Whole Course" : `Semester ${selectedSemester}`}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[1.6rem] bg-slate-900 p-5 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Verified Subjects</p>
                    <p className="mt-2 text-3xl font-black">{verifiedCount}/{activeMarks.length}</p>
                  </div>
                  <div className="rounded-[1.6rem] bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Backlogs</p>
                    <p className={`mt-2 text-3xl font-black ${backlogs > 0 ? "text-rose-600" : "text-emerald-600"}`}>{backlogs}</p>
                  </div>
                </div>
                <div className="rounded-[1.8rem] border border-amber-100 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-900">Attendance Snapshot</p>
                    <p className="text-xl font-black text-amber-600">{attendanceValue}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {progressionValue == null
                      ? "Once multiple semesters are available, this card will show whether your academic momentum is improving or declining."
                      : progressionValue >= 0
                        ? "Your combined semester score is moving upward. Keep your strongest internal trend steady into the next university exam."
                        : "Recent semester output has dipped. Focus first on the subjects where internals are okay but university marks are dropping."}
                  </p>
                </div>
                <div className="rounded-[1.8rem] border border-cyan-100 bg-cyan-50/80 p-5">
                  <p className="font-black text-cyan-900">Current status</p>
                  <p className="mt-2 text-sm font-semibold text-cyan-900">
                    {combinedAvg == null
                      ? "No usable marks yet for analysis."
                      : combinedAvg >= 75
                        ? "Strong overall output. The goal now is preserving consistency semester by semester."
                        : combinedAvg >= 60
                          ? "Moderate performance. A stronger Internal 3 and university finish can move the semester well."
                          : "Support needed. Start with the lowest course this semester and repair fundamentals before the next exam."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div {...anim(10)}>
          <Card className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                    <BarChart3 className="h-7 w-7 text-emerald-600" />
                    Internal vs University Comparison
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Compare each course using Internal 1, Internal 2, Internal 3, internal average, university marks, and combined score.
                  </CardDescription>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                  {selectedSemester === "All" ? "Showing all course records across the program" : `Showing only Semester ${selectedSemester}`}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              <div className="h-[24rem] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectComparisonData} barCategoryGap="16%">
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="shortSubject" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} interval={0} angle={subjectComparisonData.length > 6 ? -18 : 0} textAnchor={subjectComparisonData.length > 6 ? "end" : "middle"} height={70} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius: 18, border: "1px solid #e2e8f0", boxShadow: "0 18px 40px rgba(15,23,42,0.08)" }} />
                    <Legend />
                    <Bar dataKey="internalAvg" fill="#2563eb" radius={[8, 8, 0, 0]} name="Internal Avg" />
                    <Bar dataKey="university" fill="#10b981" radius={[8, 8, 0, 0]} name="University" />
                    <Bar dataKey="combined" fill="#111827" radius={[8, 8, 0, 0]} name="Combined" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {subjectComparisonData.map((entry) => {
                  const trendState = entry.gap == null ? "pending" : entry.gap >= 0 ? "university-better" : "internal-better";
                  return (
                    <div key={`${entry.code}-${entry.subject}`} className="rounded-[1.8rem] border border-slate-100 bg-slate-50/70 p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-black text-slate-900">{entry.subject.replace(/^S\d+\s/, "")}</p>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{entry.code}</p>
                        </div>
                        <Badge className={`border-none px-3 py-1 font-black ${entry.is_verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {entry.is_verified ? "Verified" : "Awaiting Review"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[["Int 1", entry.internal1], ["Int 2", entry.internal2], ["Int 3", entry.internal3], ["University", entry.university]].map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-white p-3 text-center shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                            <p className="mt-1 text-xl font-black text-slate-900">{value != null ? Number(value).toFixed(1) : "—"}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            <span>Combined Score</span>
                            <span className="text-slate-900">{entry.combined != null ? entry.combined.toFixed(1) : "—"}</span>
                          </div>
                          <Progress value={entry.combined || 0} className="h-2.5 bg-slate-200" />
                        </div>
                        <p className={`text-sm font-semibold ${trendState === "pending" ? "text-slate-500" : trendState === "university-better" ? "text-emerald-700" : "text-amber-700"}`}>
                          {trendState === "pending"
                            ? "Waiting for both internal and university marks to compare progression."
                            : trendState === "university-better"
                              ? `University performance is ${entry.gap?.toFixed(1)} points above the internal average.`
                              : `Internal average is ${Math.abs(entry.gap || 0).toFixed(1)} points above the university mark.`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...anim(11)}>
          <Card className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-amber-50 p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                    <BookOpen className="h-7 w-7 text-slate-900" />
                    Result Sheet Directory
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Detailed semester-wise mark breakdowns with direct download for the selected semester.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {marks.length > 0 && marks.some((mark) => !mark.is_verified) && (
                    <Badge className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-black text-amber-700">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Mentor Review Required
                    </Badge>
                  )}
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none"
                    value={selectedSemester === "All" ? "All" : String(selectedSemester)}
                    onChange={(e) => setSelectedSemester(e.target.value === "All" ? "All" : Number(e.target.value))}
                  >
                    <option value="All">All Semesters</option>
                    {semesters.map((semester) => (
                      <option key={semester} value={semester}>
                        Semester {semester}
                      </option>
                    ))}
                  </select>
                  {selectedSemester !== "All" && (
                    <Button
                      className={`rounded-2xl font-black ${selectedSemesterVerified ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400 hover:bg-slate-100"}`}
                      onClick={() => downloadResult(Number(selectedSemester))}
                      disabled={!selectedSemesterVerified}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Semester {selectedSemester}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-16 font-bold text-slate-700">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Loading academic records...
                </div>
              ) : semesters.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-xl font-black text-slate-900">No result sheets found</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Upload a marksheet or wait for marks to be entered for your semesters.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {semesterCards.map((semester) => {
                    const semesterMarks = marks.filter((mark) => Number(mark.semester) === semester);
                    const isVerified = semesterMarks.length > 0 && semesterMarks.every((mark) => mark.is_verified);
                    return (
                      <div key={semester} className="space-y-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                          <Badge className="w-fit rounded-2xl border-none bg-slate-900 px-5 py-2 font-black uppercase tracking-[0.16em] text-white">
                            Semester {semester}
                          </Badge>
                          <div className="flex items-center gap-3">
                            <Badge className={`rounded-xl border px-3 py-1 font-black ${isVerified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                              {isVerified ? "Verified" : "Awaiting Review"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`rounded-xl font-black ${isVerified ? "border-slate-900 text-slate-900 hover:bg-slate-50" : "border-slate-200 text-slate-400 hover:bg-white"}`}
                              onClick={() => downloadResult(semester)}
                              disabled={!isVerified}
                            >
                              <Download className="mr-2 h-3.5 w-3.5" />
                              Download Result Sheet
                            </Button>
                          </div>
                          <div className="hidden h-px flex-1 bg-slate-200 md:block" />
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                          {semesterMarks.map((mark, index) => {
                            const internalValues = [normalizeScore(mark.internal1), normalizeScore(mark.internal2), normalizeScore(mark.internal3)].filter((value): value is number => value != null);
                            const internalAverage = internalValues.length ? internalValues.reduce((sum, value) => sum + value, 0) / internalValues.length : null;
                            const isFailed = getGradePoint(mark.university_grade || mark.university_mark) === 0;
                            return (
                              <div key={`${mark.subject_code}-${index}`} className={`rounded-[1.9rem] border p-6 shadow-sm ${isFailed ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-white"}`}>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className={`text-xl font-black ${isFailed ? "text-rose-900" : "text-slate-900"}`}>{mark.course_name || mark.display_name || mark.subject_code}</p>
                                    <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.16em] ${isFailed ? "text-rose-400" : "text-slate-400"}`}>{mark.subject_code}</p>
                                  </div>
                                  <div className="text-left sm:text-right">
                                    <p className={`text-3xl font-black ${isFailed ? "text-rose-600" : "text-emerald-600"}`}>{mark.university_mark != null ? Number(mark.university_mark).toFixed(1) : "—"}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isFailed ? "text-rose-400" : "text-slate-400"}`}>University</p>
                                  </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                                  {[["Internal 1", mark.internal1], ["Internal 2", mark.internal2], ["Internal 3", mark.internal3], ["Combined", getCombinedScore(mark)]].map(([label, value]) => (
                                    <div key={label} className={`rounded-2xl p-3 text-center ${isFailed ? "bg-rose-100/50" : "bg-slate-50"}`}>
                                      <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isFailed ? "text-rose-500" : "text-slate-400"}`}>{label}</p>
                                      <p className={`mt-1 text-lg font-black ${isFailed ? "text-rose-900" : "text-slate-900"}`}>{value != null && value !== "" ? Number(value).toFixed(1) : "—"}</p>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-5">
                                  <div className={`mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] ${isFailed ? "text-rose-500" : "text-slate-500"}`}>
                                    <span>Internal Average</span>
                                    <span className={isFailed ? "text-rose-900" : "text-slate-900"}>{internalAverage != null ? internalAverage.toFixed(1) : "—"}</span>
                                  </div>
                                  <Progress value={internalAverage || 0} className={`h-2.5 ${isFailed ? "bg-rose-200" : "bg-slate-200"}`} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-end">
                          <div className="rounded-[1.8rem] border border-cyan-100 bg-cyan-50 px-6 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-800">Semester GPA Approximation</p>
                            <p className="mt-1 text-3xl font-black text-cyan-900">{calculateApproxGPA(semesterMarks)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
