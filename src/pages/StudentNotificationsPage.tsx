import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    LayoutDashboard, BarChart3, Calendar, FileText, Bell, Upload, Brain, Users,
    CheckCheck, AlertCircle, Info, BookOpen, Loader2, BellOff,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
    { label: "Academics", icon: <BarChart3 className="h-4 w-4" />, path: "/dashboard/student/academics" },
    { label: "AI Insights", icon: <Brain className="h-4 w-4" />, path: "/dashboard/student/insights" },
    { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/student/timetable" },
    { label: "Mentoring", icon: <Users className="h-4 w-4" />, path: "/dashboard/student/mentoring" },
    { label: "Requests", icon: <FileText className="h-4 w-4" />, path: "/dashboard/student/requests" },
    { label: "Certificates", icon: <Upload className="h-4 w-4" />, path: "/dashboard/student/certificates" },
    { label: "Notifications", icon: <Bell className="h-4 w-4" />, path: "/dashboard/student/notifications", isActive: true },
];

const anim = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06 } });

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; border: string; badge: string }> = {
    timetable:   { icon: Calendar,     color: "text-blue-500",   border: "border-l-blue-500",   badge: "bg-blue-100 text-blue-800 border-blue-200"   },
    alert:       { icon: AlertCircle,  color: "text-red-500",    border: "border-l-red-500",    badge: "bg-red-100 text-red-800 border-red-200"     },
    academic:    { icon: BookOpen,     color: "text-indigo-500", border: "border-l-indigo-500", badge: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    mentor:      { icon: Users,        color: "text-emerald-500", border: "border-l-emerald-500", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    certificate: { icon: Upload,       color: "text-amber-500",  border: "border-l-amber-500",  badge: "bg-amber-100 text-amber-800 border-amber-200"  },
    default:     { icon: Info,         color: "text-gray-500",   border: "border-l-gray-400",   badge: "bg-gray-100 text-gray-700 border-gray-200"   },
};

function fmtTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StudentNotificationsPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const admNo = user.admission_number || "";

    const [notifs, setNotifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);

    const fetchNotifs = () => {
        setLoading(true);
        fetch(`http://localhost:5000/api/student/notifications/${admNo}`)
            .then(r => r.json())
            .then(d => { if (d.success) setNotifs(d.data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (admNo) fetchNotifs(); }, [admNo]);

    const markRead = async (id: number) => {
        await fetch(`http://localhost:5000/api/student/notifications/${id}/read`, { method: "PATCH" });
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        setMarking(true);
        try {
            const res = await fetch(`http://localhost:5000/api/student/notifications/${admNo}/read-all`, { method: "PATCH" });
            const d = await res.json();
            if (d.success) { setNotifs(prev => prev.map(n => ({ ...n, is_read: true }))); toast.success("All marked as read"); }
        } catch { toast.error("Failed"); }
        finally { setMarking(false); }
    };

    const unreadCount = notifs.filter(n => !n.is_read).length;

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
            <div className="space-y-6">
                {/* Header */}
                <motion.div {...anim(0)} className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                            Notifications
                            {unreadCount > 0 && (
                                <Badge className="bg-red-500 text-white border-none font-black text-sm px-2.5 py-0.5">{unreadCount}</Badge>
                            )}
                        </h1>
                        <p className="text-slate-500 font-semibold mt-1">
                            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : "You're all caught up!"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" className="gap-2 font-bold" onClick={markAllRead} disabled={marking}>
                            {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                            Mark All Read
                        </Button>
                    )}
                </motion.div>

                {/* Notification List */}
                <motion.div {...anim(1)}>
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" /> Loading notifications…
                        </div>
                    ) : notifs.length === 0 ? (
                        <Card className="text-center py-20">
                            <CardContent className="flex flex-col items-center gap-4">
                                <BellOff className="h-14 w-14 text-gray-200" />
                                <div>
                                    <p className="text-lg font-black text-foreground">No notifications yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">You'll receive alerts about timetable updates, mentor messages, and academic changes here.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {notifs.map((n, i) => {
                                const typeKey = n.type?.toLowerCase() || "default";
                                const cfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.default;
                                const IconComp = cfg.icon;

                                return (
                                    <motion.div key={n.id} {...anim(i)}>
                                        <div
                                            className={`flex items-start gap-4 p-4 rounded-xl border border-slate-100 ${n.is_read ? 'bg-white opacity-60' : 'bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] border-l-4 ' + cfg.border}`}
                                            onClick={() => !n.is_read && markRead(n.id)}
                                        >
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${n.is_read ? 'bg-slate-50' : 'bg-white shadow-sm border border-slate-50'}`}>
                                                <IconComp className={`h-5 w-5 ${cfg.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-black leading-tight ${n.is_read ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</p>
                                                        <p className={`text-[13px] mt-0.5 ${n.is_read ? 'text-slate-400' : 'text-slate-600'} font-medium leading-relaxed`}>{n.message}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        <p className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">{n.created_at ? fmtTime(n.created_at) : "—"}</p>
                                                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-wider border ${cfg.badge}`}>
                                                            {n.type || "general"}
                                                        </Badge>
                                                        {!n.is_read && (
                                                            <div className="h-2.5 w-2.5 rounded-full bg-slate-800 shadow-sm" title="Unread" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
