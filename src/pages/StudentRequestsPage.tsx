import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Upload,
  User2,
  Users,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const navItems = [
  { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
  { label: "Academics", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/academics" },
  { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
  { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/timetable" },
  { label: "Mentoring", icon: <Users className="h-4 w-4" />, path: "/dashboard/student/mentoring" },
  { label: "Requests", icon: <FileText className="h-4 w-4" />, path: "/dashboard/student/requests", isActive: true },
  { label: "Certificates", icon: <Upload className="h-4 w-4" />, path: "/dashboard/student/certificates" },
  { label: "Notifications", icon: <Bell className="h-4 w-4" />, path: "/dashboard/student/notifications" },
];

const anim = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.07 } });

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · " +
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function MentorChat({ admNo }: { admNo: string }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [mentor, setMentor] = useState<any>(null);
  const [noMentor, setNoMentor] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchChat = useCallback(() => {
    fetch(`http://localhost:5000/api/chat/mentor/${admNo}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMsgs(d.data || []);
          setMentor(d.mentor);
          setNoMentor(!!d.no_mentor);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [admNo]);

  useEffect(() => { fetchChat(); }, [fetchChat]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`http://localhost:5000/api/chat/mentor/${admNo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setText("");
        fetchChat();
      } else {
        toast.error(d.message || "Failed to send");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading chat…</div>;
  }

  if (noMentor || !mentor) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border px-6">
        <User2 className="h-12 w-12 text-amber-500 mb-2" />
        <h3 className="text-2xl font-black text-foreground">Mentor Assignment Pending</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Your direct mentor chat will open here as soon as a mentor is assigned to your profile.</p>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black" onClick={fetchChat}>Refresh Status</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 p-5 rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <div className="h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xl shrink-0">
          {mentor.name?.charAt(0)}
        </div>
        <div>
          <p className="font-black text-slate-800 text-lg">{mentor.name}</p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{mentor.designation} · Assigned Mentor</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto px-1 pb-2">
        {msgs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No messages yet. Start the conversation.</p>
          </div>
        ) : msgs.map((m) => (
          <div key={m.id} className={`flex ${m.sender_role === "student" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-md ${
              m.sender_role === "student"
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-slate-50 text-slate-800 rounded-bl-sm border border-slate-100"
            }`}>
              <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed">{m.message}</p>
              <p className={`text-[10px] mt-1.5 font-bold uppercase tracking-widest ${m.sender_role === "student" ? "text-indigo-200" : "text-slate-400"}`}>{fmtTime(m.sent_at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 items-end">
        <Textarea
          className="flex-1 resize-none min-h-[56px] max-h-32"
          placeholder="Type your message to your mentor…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button onClick={send} disabled={sending || !text.trim()} className="h-14 w-14 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}

function HandlerMessages({ admNo, dept }: { admNo: string; dept: string }) {
  const [handlers, setHandlers] = useState<any[]>([]);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [handlerId, setHandlerId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Academic");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback((selectedHandlerId?: string) => {
    setLoading(true);
    const qs = selectedHandlerId ? `?handler_id=${encodeURIComponent(selectedHandlerId)}` : "";
    fetch(`http://localhost:5000/api/messages/handler/${admNo}${qs}`)
      .then(r => r.json())
      .then(d => { if (d.success) setMsgs(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [admNo]);

  useEffect(() => {
    if (dept) {
      fetch(`http://localhost:5000/api/messages/handlers/${encodeURIComponent(dept)}`)
        .then(r => r.json())
        .then(d => { if (d.success) setHandlers(d.data || []); })
        .catch(() => {});
    }
    loadMessages();
  }, [admNo, dept, loadMessages]);

  const send = async () => {
    if (!handlerId) { toast.error("Please select a subject handler"); return; }
    if (!subject.trim()) { toast.error("Please enter a subject/title"); return; }
    setSending(true);
    try {
      const body = new FormData();
      body.append("handler_id", handlerId);
      body.append("subject", subject.trim());
      body.append("message", message.trim());
      body.append("category", category);
      if (file) body.append("file", file);

      const res = await fetch(`http://localhost:5000/api/messages/handler/${admNo}`, { method: "POST", body });
      const d = await res.json();
      if (d.success) {
        toast.success("Message sent to subject handler");
        setSubject("");
        setMessage("");
        setFile(null);
        loadMessages(handlerId);
      } else {
        toast.error(d.message || "Failed to send");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    open: "bg-amber-100 text-amber-800 border-amber-200",
    replied: "bg-emerald-100 text-emerald-800 border-emerald-200",
    closed: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" /> Direct Subject Handler Chat
          </CardTitle>
          <CardDescription>Pick a subject handler and continue the conversation directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Handler</Label>
              <Select value={handlerId} onValueChange={(value) => { setHandlerId(value); loadMessages(value); }}>
                <SelectTrigger><SelectValue placeholder="Select a handler" /></SelectTrigger>
                <SelectContent>
                  {handlers.map(h => (
                    <SelectItem key={h.id} value={String(h.id)}>{h.name} · {h.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Academic", "Lab", "Attendance", "Assignment", "Project", "Other"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-bold mb-1.5 block">Subject / Title <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Doubt in Unit 3 - DAA" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm font-bold mb-1.5 block">Message</Label>
            <Textarea placeholder="Describe your query or issue…" className="h-28 resize-none" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm font-bold mb-1.5 block">Attachment (PDF / Image, optional)</Label>
            <div
              className="border-2 border-dashed border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-5 w-5 text-blue-400 shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">
                {file ? file.name : "Click to attach a PDF or image file"}
              </span>
              {file && <Button size="sm" variant="ghost" className="text-red-400 p-1 h-auto" onClick={e => { e.stopPropagation(); setFile(null); }}><X className="h-4 w-4" /></Button>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black" onClick={send} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Message
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" /> Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : msgs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No messages yet for this handler.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {msgs.map(m => (
                <div key={m.id} className={`p-4 rounded-xl border ${m.sender_role === "student" ? "bg-blue-50/60 border-blue-100" : "bg-emerald-50/70 border-emerald-100"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-black text-sm text-foreground">{m.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.sender_role === "student" ? "You" : (m.handler_name || "Subject Handler")} · {m.raised_at ? new Date(m.raised_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <Badge className={`text-xs border shrink-0 ${STATUS_COLORS[m.status] || "bg-gray-100 text-gray-600"}`}>{m.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.message || m.description}</p>
                  {m.attachment_path && (
                    <a href={`http://localhost:5000/static/${m.attachment_path}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-2 font-bold">
                      <Paperclip className="h-3 w-3" /> View Attachment
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlaygroundArea({ admNo }: { admNo: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:5000/api/playground/${admNo}`)
      .then(r => r.json())
      .then(d => { if (d.success) setNotes(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [admNo]);

  return (
    <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 rounded-[2rem] overflow-hidden bg-white">
      <CardHeader className="pb-4 bg-slate-50/50">
        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-emerald-500" /> Playground
        </CardTitle>
        <CardDescription className="text-slate-500 font-bold">Dedicated area for notes shared to you or your whole class.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No playground notes shared yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-sm text-slate-800">{note.title}</p>
                    <Badge className="bg-white text-emerald-700 border border-emerald-200">{note.scope === "student" ? "Dedicated" : "Class"}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{note.subject_code} · Shared by {note.uploaded_by_name || "Subject Handler"}</p>
                  {note.description && <p className="text-sm text-slate-600 mt-2">{note.description}</p>}
                </div>
                {note.download_url && (
                  <a href={`http://localhost:5000${note.download_url}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="font-black">Open Note</Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentRequestsPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admNo = user.admission_number || "";
  const [dept, setDept] = useState(user.department || "");

  useEffect(() => {
    if (admNo) {
      fetch(`http://localhost:5000/api/student/detail/${admNo}`)
        .then(r => r.json())
        .then(d => { if (d.success && d.data) setDept(d.data.branch || user.department || ""); })
        .catch(() => {});
    }
  }, [admNo, user.department]);

  return (
    <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
      <div className="space-y-6">
        <motion.div {...anim(0)} className="px-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-800 drop-shadow-sm">Requests & Communication</h1>
          <p className="text-slate-500 font-semibold mt-1 text-sm max-w-xl">
            Direct mentor guidance, subject handler communication, and a shared playground for notes.
          </p>
        </motion.div>

        <motion.div {...anim(1)}>
          <Tabs defaultValue="mentor">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl mb-6">
              <TabsTrigger value="mentor" className="flex items-center gap-2 font-bold">
                <User2 className="h-4 w-4" /> Mentor Chat
              </TabsTrigger>
              <TabsTrigger value="handler" className="flex items-center gap-2 font-bold">
                <MessageSquare className="h-4 w-4" /> Subject Handlers
              </TabsTrigger>
              <TabsTrigger value="playground" className="flex items-center gap-2 font-bold">
                <BookOpen className="h-4 w-4" /> Playground
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mentor">
              <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="pb-4 bg-slate-50/50">
                  <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <User2 className="h-8 w-8 text-indigo-500" /> Professional Guidance
                  </CardTitle>
                  <CardDescription className="text-slate-500 font-bold">Encrypted direct channel for mentor interactions.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <MentorChat admNo={admNo} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="handler">
              <HandlerMessages admNo={admNo} dept={dept} />
            </TabsContent>

            <TabsContent value="playground">
              <PlaygroundArea admNo={admNo} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
