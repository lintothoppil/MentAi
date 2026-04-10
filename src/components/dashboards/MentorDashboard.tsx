import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Calendar, AlertTriangle, TrendingUp, CheckCircle, Mail, MoreHorizontal, Plus, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Alert as AlertUI, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor", isActive: true },
    { label: "My Mentees", icon: <Users className="h-4 w-4" />, path: "/dashboard/mentor/mentees" },
    { label: "Faculty Dashboard", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty" },
    { label: "Reports", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/mentor/reports" },
];

const menteePerformanceData = [
    { name: "Batch A", score: 85 },
    { name: "Batch B", score: 72 },
    { name: "Batch C", score: 90 },
    { name: "Batch D", score: 65 }, // Low
];

// Removed hardcoded mentees array

const anim = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.08 },
});

const MentorDashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [mentees, setMentees] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loggedInterventions, setLoggedInterventions] = useState<any>({});
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionActionLoading, setSessionActionLoading] = useState<number | null>(null);

    // Intervention Modal State
    const [interventionModalOpen, setInterventionModalOpen] = useState(false);
    const [selectedStudentForIntervention, setSelectedStudentForIntervention] = useState<any>(null);
    const [interventionType, setInterventionType] = useState<string>("");
    const [interventionNotes, setInterventionNotes] = useState<string>("");

    useEffect(() => {
        if (user.id) {
            fetch(`http://localhost:5000/api/analytics/mentor/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        // Sort by risk_score descending
                        const sorted = data.data.sort((a: any, b: any) => b.risk_score - a.risk_score);
                        setMentees(sorted);
                    }
                })
                .catch(err => console.error("Failed to fetch mentees", err));
        }
    }, [user.id]);

    useEffect(() => {
        if (user.id) {
            fetch(`http://localhost:5000/api/alerts/mentor/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setAlerts(data.data);
                    }
                })
                .catch(err => console.error("Failed to fetch mentor alerts", err));
        }
    }, [user.id]);

    const [plannerStats, setPlannerStats] = useState<any>({});
    useEffect(() => {
        if (user.id) {
            fetch(`http://localhost:5000/api/planner/mentor/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const statsMap: any = {};
                        data.data.forEach((s: any) => {
                            statsMap[s.student_id] = s;
                        });
                        setPlannerStats(statsMap);
                    }
                })
                .catch(err => console.error("Failed to fetch mentor planner stats", err));
        }
    }, [user.id]);

    useEffect(() => {
        if (user.id) {
            fetch(`http://localhost:5000/api/intervention/mentor/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setLoggedInterventions(data.data);
                    }
                })
                .catch(err => console.error("Failed to fetch logged interventions", err));
        }
    }, [user.id]);

    useEffect(() => {
        if (user.id) {
            fetch(`http://localhost:5000/api/session/mentor/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setSessions(data.data);
                    }
                })
                .catch(err => console.error("Failed to fetch mentor sessions", err));
        }
    }, [user.id]);

    const handleSessionAction = (sessionId: number, action: string, extraData: any = {}) => {
        setSessionActionLoading(sessionId);
        fetch(`http://localhost:5000/api/session/${sessionId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mentor_id: user.id, action, ...extraData })
        })
            .then(res => res.json())
            .then(resData => {
                if (resData.success) {
                    setSessions(prev => prev.map(s => {
                        if (s.id === sessionId) {
                            return { 
                                ...s, 
                                status: action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'cancel' ? 'Cancelled' : 'Rescheduled',
                                meeting_link: extraData.meeting_link !== undefined ? extraData.meeting_link : s.meeting_link
                            };
                        }
                        return s;
                    }));
                } else {
                    alert(resData.message);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setSessionActionLoading(null));
    };

    const handleLogIntervention = () => {
        if (!selectedStudentForIntervention || !interventionType) return;

        fetch('http://localhost:5000/api/intervention/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: selectedStudentForIntervention.student_id,
                mentor_id: user.id,
                intervention_type: interventionType,
                notes: interventionNotes
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setLoggedInterventions({ ...loggedInterventions, [selectedStudentForIntervention.student_id]: true });
                    setInterventionModalOpen(false);
                    setSelectedStudentForIntervention(null);
                    setInterventionType("");
                    setInterventionNotes("");
                } else {
                    alert(data.message);
                }
            })
            .catch(err => console.error("Error logging intervention", err));
    };

    return (
        <DashboardLayout role="mentor" roleLabel="Mentor Dashboard" navItems={navItems} gradientClass="gradient-mentor">
            <div className="flex flex-col gap-6">

                {/* Welcome Section */}
                <motion.div {...anim(0)}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name || "Mentor"}</h1>
                            <p className="text-muted-foreground">You have 3 upcoming sessions and 1 critical alert.</p>
                        </div>
                        <Button className="bg-mentor text-white hover:bg-mentor/90 gap-2">
                            <Plus className="h-4 w-4" /> Schedule Session
                        </Button>
                    </div>
                </motion.div>

                {/* Critical Alerts Section */}
                {alerts.length > 0 && (
                    <motion.div {...anim(1)}>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Critical Alerts Tracker</h3>
                        <div className="space-y-3 mb-6">
                            {alerts.map((alert, idx) => (
                                <AlertUI key={idx} variant={alert.type.includes('RISK') || alert.type.includes('LOW_') ? "destructive" : "default"} className="border-l-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle className="font-semibold">{alert.type.replace(/_/g, ' ')} - Student: {alert.student_id}</AlertTitle>
                                    <AlertDescription>
                                        {alert.message}
                                        <span className="block text-xs opacity-70 mt-1">{alert.created_at}</span>
                                    </AlertDescription>
                                </AlertUI>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: "Total Mentees", value: mentees.length.toString(), icon: Users, color: "text-blue-500" },
                        { label: "At Risk", value: "3", icon: AlertTriangle, color: "text-red-500" },
                        { label: "Avg Performance", value: "78%", icon: TrendingUp, color: "text-green-500" },
                        { label: "Pending Reviews", value: "5", icon: CheckCircle, color: "text-orange-500" },
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div key={i} {...anim(i + 1)}>
                                <Card>
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                            <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                                        </div>
                                        <div className={`h-12 w-12 rounded-full bg-secondary flex items-center justify-center ${stat.color}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 md:grid-cols-7">

                    {/* Mentees List */}
                    <motion.div className="md:col-span-4" {...anim(5)}>
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>My Mentees</CardTitle>
                                <CardDescription>Students assigned to your mentorship group</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {mentees.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground italic">No mentees assigned.</div>
                                    ) : (
                                        mentees.slice(0, 5).map((student) => (
                                            <div key={student.student_id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-mentor/30 hover:bg-mentor/5 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                                                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                                                            <AvatarFallback>{student.name.substring(0, 2)}</AvatarFallback>
                                                        </Avatar>
                                                        {(student.adjusted_risk || 0) >= 70 && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 shadow-sm bg-destructive rounded-full border-2 border-background" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight">{student.name}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{student.student_id}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="hidden sm:flex flex-col items-end">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className={`text-xl font-black tracking-tighter ${(student.adjusted_risk || 0) >= 70 ? 'text-destructive' : (student.adjusted_risk || 0) >= 40 ? 'text-orange-500' : 'text-green-600'}`}>
                                                                {(student.adjusted_risk || 0).toFixed(1)}%
                                                            </span>
                                                            <span className="text-[8px] text-muted-foreground font-bold uppercase">Risk</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 bg-muted/50 border-none font-medium">
                                                                {plannerStats[student.student_id]?.compliance || 0}% Compliance
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-mentor/10 group-hover:text-mentor">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem className="font-medium">View Profile</DropdownMenuItem>
                                                            <DropdownMenuItem>Message Student</DropdownMenuItem>
                                                            {(student.adjusted_risk || 0) >= 70 && (
                                                                <DropdownMenuItem
                                                                    className="text-destructive font-bold"
                                                                    onClick={() => {
                                                                        setSelectedStudentForIntervention(student);
                                                                        setInterventionModalOpen(true);
                                                                    }}
                                                                >
                                                                    Log Intervention
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {mentees.length > 5 && (
                                        <Button
                                            variant="ghost"
                                            className="w-full text-xs text-muted-foreground hover:text-mentor"
                                            onClick={() => navigate("/dashboard/mentor/mentees")}
                                        >
                                            View all {mentees.length} mentees
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Performance Chart & Actions */}
                    <div className="md:col-span-3 space-y-6">
                        <motion.div {...anim(6)}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Group Performance</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={menteePerformanceData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                                {menteePerformanceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.score < 70 ? '#ef4444' : '#0ea5e9'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div {...anim(7)}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-2">
                                    <Button variant="outline" className="justify-start gap-2 h-12">
                                        <Mail className="h-4 w-4 text-mentor" /> Send Bulk Announcement
                                    </Button>
                                    <Button variant="outline" className="justify-start gap-2 h-12">
                                        <Calendar className="h-4 w-4 text-mentor" /> Reschedule All Meetings
                                    </Button>
                                    <Button variant="outline" className="justify-start gap-2 h-12">
                                        <TrendingUp className="h-4 w-4 text-mentor" /> Generate Monthly Report
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Mentoring Sessions Section */}
                    <motion.div className="md:col-span-7" {...anim(8)}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-mentor" /> Mentoring Sessions</CardTitle>
                                <CardDescription>Manage incoming session requests and upcoming meetings</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {sessions.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No sessions found.</div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {sessions.map(session => (
                                            <div key={session.id} className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="font-bold text-base">{session.student_name}</div>
                                                            <div className="text-xs text-muted-foreground font-medium">{session.student_id}</div>
                                                        </div>
                                                        <Badge variant={session.status === 'Pending' ? 'secondary' : session.status === 'Approved' ? 'default' : 'destructive'} className={session.status === 'Approved' ? 'bg-green-500 hover:bg-green-600 font-bold' : 'font-bold'}>
                                                            {session.status}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-1 mt-2">
                                                        <div className="flex items-center text-sm text-foreground/80 gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" /> {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="flex items-center text-sm text-foreground/80 gap-2">
                                                            <Clock className="h-4 w-4 text-muted-foreground" /> {session.time_slot} ({session.session_type})
                                                        </div>
                                                    </div>

                                                    {session.notes && (
                                                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md mt-2 border max-h-24 overflow-y-auto">
                                                            {session.notes.split('\n').map((line: string, i: number) => <div key={i}>{line}</div>)}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                                                    {session.status === 'Pending' && (
                                                        <>
                                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => {
                                                                const link = session.session_type.toLowerCase() === 'online' ? prompt('Enter meeting link (optional):', session.meeting_link || '') || '' : '';
                                                                handleSessionAction(session.id, 'approve', { meeting_link: link });
                                                            }} disabled={sessionActionLoading === session.id}>
                                                                Approve
                                                            </Button>
                                                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleSessionAction(session.id, 'reject')} disabled={sessionActionLoading === session.id}>
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {session.status === 'Approved' && (
                                                        <>
                                                            {session.meeting_link && session.session_type.toLowerCase() === 'online' && (
                                                                <Button size="sm" className="bg-mentor text-white hover:bg-mentor/90 flex-1" onClick={() => window.open(session.meeting_link.startsWith('http') ? session.meeting_link : `https://${session.meeting_link}`, '_blank')}>Join</Button>
                                                            )}
                                                            {!session.meeting_link && session.session_type.toLowerCase() === 'online' && (
                                                                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => {
                                                                    const link = prompt('Enter meeting link:');
                                                                    if (link) handleSessionAction(session.id, 'approve', { meeting_link: link });
                                                                }} disabled={sessionActionLoading === session.id}>Add Link</Button>
                                                            )}
                                                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleSessionAction(session.id, 'cancel')} disabled={sessionActionLoading === session.id}>Cancel</Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default MentorDashboard;
