import { useEffect, useMemo, useState } from "react";
import { BookOpen, Calendar, FileText, LayoutDashboard, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { hasRole, normalizeRole } from "@/lib/authSession";

const BASE = "http://localhost:5000";

type ClassRow = {
  department: string;
  batch: string;
  subject: string;
};

type StudentRow = {
  admission_number: string;
  full_name: string;
  email: string;
  batch: string;
  branch: string;
};

type NoteRow = {
  id: number;
  title: string;
  description: string | null;
  subject_code: string;
  scope: string;
  target_student_id: string | null;
  department: string | null;
  batch: string | null;
  download_url: string | null;
  created_at: string | null;
};

const toSubjectCode = (value: string) => {
  const cleaned = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "GENERAL";
};

export default function FacultyNotesPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const facultyId = Number(user?.id || 0);

  const role = normalizeRole(user?.role || user?.designation || "faculty");
  const isMentor = hasRole(user, "mentor");
  const isHandler = hasRole(user, "subject-handler");

  const overviewPath = role === "subject-handler" ? "/dashboard/subject-handler/manage" : `/dashboard/${role || "faculty"}`;

  const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: overviewPath },
    { label: "My Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty/timetable" },
    { label: "PDF Notes", icon: <FileText className="h-4 w-4" />, path: "/dashboard/faculty/notes", isActive: true },
    ...(isMentor ? [{ label: "Mentor Dashboard", icon: <Users className="h-4 w-4" />, path: "/dashboard/mentor" }] : []),
    ...(isHandler ? [{ label: "Subject Handler", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/subject-handler/manage" }] : []),
  ];

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const selectedClass = useMemo(() => classes.find((c) => `${c.department}||${c.batch}||${c.subject}` === selectedKey) || null, [classes, selectedKey]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [scope, setScope] = useState<"class" | "student">("class");
  const [targetStudentId, setTargetStudentId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const loadClasses = async () => {
    if (!facultyId) return;
    const res = await fetch(`${BASE}/api/faculty/classes/${facultyId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load classes");
    const rows: ClassRow[] = data.data || [];
    setClasses(rows);
    if (!selectedKey && rows.length) {
      setSelectedKey(`${rows[0].department}||${rows[0].batch}||${rows[0].subject}`);
    }
  };

  const loadStudents = async (dept: string, batch: string) => {
    const qp = new URLSearchParams({ department: dept, batch });
    const res = await fetch(`${BASE}/api/faculty/class-students?${qp.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load students");
    setStudents(data.data || []);
  };

  const loadNotes = async () => {
    if (!facultyId) return;
    const res = await fetch(`${BASE}/api/handler/playground/${facultyId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load notes");
    setNotes(data.data || []);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadClasses(), loadNotes()])
      .catch((e: any) => toast.error(e.message || "Failed to load notes page"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facultyId]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    loadStudents(selectedClass.department, selectedClass.batch)
      .catch((e: any) => toast.error(e.message || "Failed to load students"))
      .finally(() => setLoading(false));
  }, [selectedClass?.department, selectedClass?.batch]);

  useEffect(() => {
    if (scope === "class") setTargetStudentId("");
  }, [scope]);

  const submit = async () => {
    if (!facultyId) return toast.error("Faculty ID missing. Please login again.");
    if (!selectedClass) return toast.error("Select a class first.");
    if (!title.trim()) return toast.error("Title is required.");
    if (!file) return toast.error("Please choose a PDF file.");
    if (scope === "student" && !targetStudentId) return toast.error("Select a student for dedicated notes.");

    if (file.type && file.type !== "application/pdf") {
      toast.error("Only PDF files are supported.");
      return;
    }
    if (!String(file.name || "").toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported.");
      return;
    }

    const subjectCode = toSubjectCode(selectedClass.subject);
    const form = new FormData();
    form.append("faculty_id", String(facultyId));
    form.append("subject_code", subjectCode);
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("scope", scope);
    form.append("department", selectedClass.department);
    form.append("batch", selectedClass.batch);
    if (scope === "student") form.append("target_student_id", targetStudentId);
    form.append("file", file);

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/faculty/notes/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Upload failed");
      const mentorAlerted = Boolean(data.data?.mentor_alerted);
      toast.success(
        mentorAlerted
          ? "Shared note and alerted the mentor to add personalized support notes."
          : `Shared note to ${scope === "class" ? "class" : "student"}`,
      );
      setTitle("");
      setDescription("");
      setFile(null);
      await loadNotes();
    } catch (e: any) {
      toast.error(e.message || "Failed to share note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      role={role || "faculty"}
      roleLabel={`${(role || "faculty").charAt(0).toUpperCase() + (role || "faculty").slice(1)} Dashboard`}
      navItems={navItems}
      gradientClass="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-900"
    >
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Share PDF Notes
            </CardTitle>
            <CardDescription>Send PDF notes to the whole class or to one dedicated student only.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <Label>Class (Department • Batch • Subject)</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger>
                  <SelectValue placeholder={classes.length ? "Choose class" : "No classes found"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => {
                    const key = `${c.department}||${c.batch}||${c.subject}`;
                    return (
                      <SelectItem key={key} value={key}>
                        {c.department} • {c.batch} • {c.subject || "Subject"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedClass && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{selectedClass.department}</Badge>
                  <Badge variant="outline">{selectedClass.batch}</Badge>
                  <Badge variant="outline">{toSubjectCode(selectedClass.subject)}</Badge>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "class" | "student")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">All class</SelectItem>
                  <SelectItem value="student">Dedicated student</SelectItem>
                </SelectContent>
              </Select>

              {scope === "student" && (
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={targetStudentId} onValueChange={setTargetStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={students.length ? "Choose student" : "No students found"} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.admission_number} value={s.admission_number}>
                          {s.admission_number} • {s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Dedicated sharing is restricted to one student. If the selected student is academically very weak, the mentor will be alerted for personalized notes.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="note-title">Title</Label>
              <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Eg: Unit 3 Important Questions" />
            </div>

            <div className="space-y-3">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description for students" />
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label>PDF File</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-2">
                <Button onClick={submit} disabled={loading || !selectedClass} className="bg-indigo-600 hover:bg-indigo-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Share Note
                </Button>
                {loading && <span className="text-xs text-muted-foreground">Working…</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> My Shared Notes
            </CardTitle>
            <CardDescription>Notes you shared (class or dedicated students).</CardDescription>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes shared yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 rounded-xl border">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold truncate">{n.title}</p>
                        <Badge variant="outline">{String(n.subject_code || "GENERAL")}</Badge>
                        <Badge variant="secondary">{n.scope === "student" ? `Student: ${n.target_student_id}` : "Class"}</Badge>
                        {n.department && <Badge variant="outline">{n.department}</Badge>}
                        {n.batch && <Badge variant="outline">{n.batch}</Badge>}
                      </div>
                      {n.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.description}</p>}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url = n.download_url ? `${BASE}${n.download_url}` : "";
                          if (!url) return toast.error("No download URL for this note");
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                      >
                        View PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
