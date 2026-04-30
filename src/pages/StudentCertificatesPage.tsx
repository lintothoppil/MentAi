import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  FileText,
  Bell,
  Upload,
  Brain,
  Users,
  Award,
  Paperclip,
  X,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlusCircle,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const navItems = [
  { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
  { label: "Academics", icon: <BarChart3 className="h-4 w-4" />, path: "/dashboard/student/academics" },
  { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
  { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/timetable" },
  { label: "Mentoring", icon: <Users className="h-4 w-4" />, path: "/dashboard/student/mentoring" },
  { label: "Requests", icon: <FileText className="h-4 w-4" />, path: "/dashboard/student/requests" },
  { label: "Certificates", icon: <Upload className="h-4 w-4" />, path: "/dashboard/student/certificates", isActive: true },
  { label: "Notifications", icon: <Bell className="h-4 w-4" />, path: "/dashboard/student/notifications" },
];

const anim = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.07 } });

export default function StudentCertificatesPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admNo = user.admission_number || "";

  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [issuingOrg, setIssuingOrg] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/certificates/${admNo}`);
      const data = await res.json();
      if (data.success) setCerts(data.data || []);
      else toast.error(data.message || "Failed to load certificates");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admNo) fetchCerts();
  }, [admNo]);

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file to upload");
    if (!title.trim()) return toast.error("Please enter a title");

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("title", title.trim());
      body.append("issuing_org", issuingOrg.trim());
      if (issueDate) body.append("issue_date", issueDate);
      if (expiryDate) body.append("expiry_date", expiryDate);

      const res = await fetch(`http://localhost:5000/api/certificates/${admNo}`, { method: "POST", body });
      const data = await res.json();
      if (data.success) {
        toast.success("Certificate uploaded");
        setTitle("");
        setIssuingOrg("");
        setIssueDate("");
        setExpiryDate("");
        setFile(null);
        setShowForm(false);
        fetchCerts();
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this certificate?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/certificates/${admNo}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Certificate deleted");
        fetchCerts();
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  };

  const isImage = (path: string) => [".jpg", ".jpeg", ".png", ".webp"].some((ext) => path?.toLowerCase().endsWith(ext));

  return (
    <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
      <div className="space-y-6">
        <motion.div {...anim(0)} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">My Certificates</h1>
            <p className="text-muted-foreground mt-1">Upload and manage your private achievement, course, and event certificates.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black gap-2" onClick={() => setShowForm((v) => !v)}>
            <PlusCircle className="h-4 w-4" /> {showForm ? "Cancel" : "Upload Certificate"}
          </Button>
        </motion.div>

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-l-4 border-l-indigo-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-500" /> Upload New Certificate
                </CardTitle>
                <CardDescription>Supported formats: PDF, JPG, PNG (max 10MB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold mb-1.5 block">Title <span className="text-red-500">*</span></Label>
                    <Input placeholder="e.g. National Level Hackathon 2025" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-sm font-bold mb-1.5 block">Issuing Organization</Label>
                    <Input placeholder="e.g. IEEE / College / Company" value={issuingOrg} onChange={(e) => setIssuingOrg(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold mb-1.5 block">Issue Date (optional)</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-52" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold mb-1.5 block">Expiry Date (optional)</Label>
                    <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-52" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Certificate File <span className="text-red-500">*</span></Label>
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors text-center"
                    onClick={() => fileRef.current?.click()}
                  >
                    {file ? (
                      <>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="text-sm font-bold text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        <Button size="sm" variant="ghost" className="text-red-400 h-7" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                          <X className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-8 w-8 text-indigo-300" />
                        <p className="text-sm font-bold text-foreground">Click to upload or drag & drop</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, PNG supported</p>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-12" onClick={handleUpload} disabled={uploading}>
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-2" /> Upload Certificate</>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div {...anim(2)}>
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /> Loading certificates…
            </div>
          ) : certs.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent className="flex flex-col items-center gap-4">
                <Award className="h-14 w-14 text-indigo-200" />
                <div>
                  <p className="text-lg font-black text-foreground">No certificates uploaded yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Upload your achievements to keep them private and organized.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => setShowForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Upload Your First Certificate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certs.map((c, i) => (
                <motion.div key={c.id} {...anim(i)}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow border-none shadow-md group">
                    <div className="h-36 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center relative overflow-hidden">
                      {c.file_url && isImage(c.file_url) ? (
                        <img src={`http://localhost:5000/static/${c.file_url}`} alt={c.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Award className="h-12 w-12 text-indigo-400" />
                          <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Certificate File</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-black text-sm text-foreground leading-tight">{c.title || "Untitled Certificate"}</h3>
                      <p className="text-xs text-muted-foreground">{c.issuing_org || "Unknown issuer"}</p>
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        {c.issue_date && <div>Issued {new Date(c.issue_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>}
                        {c.expiry_date && <div>Expires {new Date(c.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2">
                        {c.download_url ? (
                          <a href={`http://localhost:5000${c.download_url}`} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                              <ExternalLink className="h-3 w-3" /> View
                            </Button>
                          </a>
                        ) : <span />}
                        <Button size="sm" variant="ghost" className="text-red-500 h-7 gap-1" onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}>
                          {deletingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
