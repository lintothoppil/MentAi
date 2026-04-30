import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle, XCircle, LayoutDashboard, Users, Calendar, TrendingUp, Search, GraduationCap, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";

const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor" },
    { label: "My Mentees", icon: <Users className="h-4 w-4" />, path: "/dashboard/mentor/mentees" },
    { label: "Faculty Dashboard", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty" },
    { label: "Academics", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/mentor/academics", isActive: true },
    { label: "AI Reports", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/mentor/ai-reports" },
    { label: "Reports", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/mentor/reports" },
];

const anim = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05 },
});

const MentorAcademicsPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [academicRecords, setAcademicRecords] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
    const [overview, setOverview] = useState<any>(null);

    useEffect(() => {
        if (user.id) {
            fetchRecords();
        }
    }, [user.id]);

    const fetchRecords = () => {
        fetch(`http://localhost:5000/api/mentor/marks/all/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setAcademicRecords(data.data);
                }
            })
            .catch(err => console.error("Failed to fetch academic marks", err));

        fetch(`http://localhost:5000/api/mentor/academics/overview/${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setOverview(data.data);
                }
            })
            .catch(err => console.error("Failed to fetch mentor academics overview", err));
    };

    const handleVerifyMarks = (student_id: string, semester: number, action: string) => {
        const actionId = `${student_id}-${semester}-${action}`;
        setLoadingAction(actionId);
        
        fetch('http://localhost:5000/api/mentor/marks/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id, semester, action })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                toast.success(data.message);
                if (action === 'accept') {
                    setAcademicRecords(prev => prev.map(m => m.student_id === student_id && Number(m.semester) === Number(semester) ? { ...m, is_verified: true } : m));
                } else {
                    setAcademicRecords(prev => prev.filter(m => m.student_id !== student_id || Number(m.semester) !== Number(semester)));
                }
            } else {
                toast.error(data.message);
            }
        })
        .catch(err => {
            console.error(err);
            toast.error("An error occurred adjusting marks.");
        })
        .finally(() => setLoadingAction(null));
    };

    const getGradePoint = (markOrGrade: any) => {
        if (typeof markOrGrade === 'number') return Math.min(10.0, (markOrGrade / 10) + 1);
        const g = String(markOrGrade).toUpperCase().trim();
        if (!isNaN(parseFloat(g))) return Math.min(10.0, (parseFloat(g) / 10) + 1);
        const mapping: Record<string, number> = {'S': 10, 'O': 10, 'A+': 9, 'A': 8.5, 'B+': 8, 'B': 7.5, 'C+': 7, 'C': 6.5, 'D': 6, 'P': 5.5, 'F': 0, 'FE': 0};
        return mapping[g] !== undefined ? mapping[g] : null;
    };

    const calculateSGPA = (marks: any[]) => {
        let totalPoints = 0;
        let totalCredits = 0;
        marks.forEach(m => {
            const gp = getGradePoint(m.university_mark !== null ? m.university_mark : m.university_grade);
            if (gp !== null) {
                totalPoints += gp * (m.credits || 1);
                totalCredits += (m.credits || 1);
            }
        });
        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    };

    const filteredRecords = academicRecords.filter(r => 
        r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const performanceData = (overview?.students || []).slice(0, 10).map((student: any) => ({
        name: student.student_name?.split(" ")[0] || student.student_id,
        progression: student.progression_score != null ? Number(student.progression_score.toFixed(1)) : null,
        combined: student.combined_avg != null ? Number(student.combined_avg.toFixed(1)) : null,
        attendance: student.attendance_avg != null ? Number(student.attendance_avg.toFixed(1)) : null,
    }));

    const semesterTrendData = (overview?.semester_trends || []).map((entry: any) => ({
        semester: `Sem ${entry.semester}`,
        progression: entry.progression_score != null ? Number(entry.progression_score.toFixed(1)) : null,
        combined: entry.combined_avg != null ? Number(entry.combined_avg.toFixed(1)) : null,
        attendance: entry.attendance_avg != null ? Number(entry.attendance_avg.toFixed(1)) : null,
        university: entry.university_avg != null ? Number(entry.university_avg.toFixed(1)) : null,
    }));

    const distributionData = [
        { name: "Verified", value: overview?.verified_records || 0, color: "#10b981" },
        { name: "Pending", value: overview?.pending_records || 0, color: "#f59e0b" },
    ];

    const toggleExpand = (id: string) => {
        setExpandedRecord(prev => prev === id ? null : id);
    };

    return (
        <DashboardLayout role="mentor" roleLabel="Mentor Dashboard" navItems={navItems} gradientClass="gradient-mentor">
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
                <motion.div {...anim(0)} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mentee Academic Records</h1>
                        <p className="text-muted-foreground">Review, authorize, and verify university exam results uploaded by your mentees.</p>
                    </div>
                </motion.div>

                <motion.div {...anim(1)} className="flex items-center space-x-2 bg-background p-1 border rounded-lg shadow-sm max-w-md">
                    <Search className="h-4 w-4 ml-2 text-muted-foreground" />
                    <Input
                        placeholder="Search by student name or admission number..."
                        className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </motion.div>

                {overview && (
                    <div className="grid gap-6 xl:grid-cols-5">
                        <motion.div {...anim(2)} className="xl:col-span-3">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Semester Trend Overview</CardTitle>
                                    <CardDescription>
                                        Overall mentee academic progression by semester.
                                        {semesterTrendData.length > 0 && (
                                            <span className="ml-2 text-xs font-semibold text-foreground/60">
                                                ({semesterTrendData.length} semester{semesterTrendData.length !== 1 ? 's' : ''} with actual data)
                                            </span>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {semesterTrendData.length === 0 ? (
                                        <div className="h-80 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <GraduationCap className="h-10 w-10 opacity-30" />
                                            <p className="text-sm">No semester data available yet.</p>
                                        </div>
                                    ) : (
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={semesterTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                                    <XAxis
                                                        dataKey="semester"
                                                        tick={{ fontSize: 12, fontWeight: 600 }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis
                                                        domain={[0, 100]}
                                                        tick={{ fontSize: 11 }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickFormatter={(v) => `${v}%`}
                                                        width={40}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                                                        formatter={(value: any, name: string) => [
                                                            value != null ? `${Number(value).toFixed(1)}%` : '—',
                                                            name
                                                        ]}
                                                        labelFormatter={(label) => `📚 ${label}`}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="progression"
                                                        stroke="#0F2A44"
                                                        strokeWidth={3}
                                                        name="Progression"
                                                        connectNulls={false}
                                                        dot={{ r: 5, fill: '#0F2A44', strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 7 }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="attendance"
                                                        stroke="#0891b2"
                                                        strokeWidth={2}
                                                        name="Attendance"
                                                        connectNulls={false}
                                                        dot={{ r: 4, fill: '#0891b2', strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 6 }}
                                                        strokeDasharray="5 3"
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="university"
                                                        stroke="#C9A227"
                                                        strokeWidth={2}
                                                        name="University Avg"
                                                        connectNulls={false}
                                                        dot={{ r: 4, fill: '#C9A227', strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="combined"
                                                        stroke="#64748b"
                                                        strokeWidth={1.5}
                                                        name="Combined"
                                                        connectNulls={false}
                                                        dot={false}
                                                        strokeDasharray="3 3"
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>


                        <motion.div {...anim(3)} className="xl:col-span-2 space-y-6">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle>Record Distribution</CardTitle>
                                    <CardDescription>Verified vs pending academic records.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                                                    {distributionData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {overview && (
                    <motion.div {...anim(4)}>
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Mentee Academic Comparison</CardTitle>
                                <CardDescription>Current academic position across your mentees.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={performanceData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="progression" fill="#111827" radius={[6, 6, 0, 0]} name="Progression" />
                                            <Bar dataKey="attendance" fill="#0891b2" radius={[6, 6, 0, 0]} name="Attendance" />
                                            <Bar dataKey="combined" fill="#64748b" radius={[6, 6, 0, 0]} name="Combined" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <div className="grid gap-6">
                    <AnimatePresence>
                        {filteredRecords.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center flex flex-col items-center border border-dashed rounded-xl bg-muted/30">
                                <GraduationCap className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-xl font-bold tracking-tight mb-1">No Academic Records</h3>
                                <p className="text-muted-foreground">None of your mentees have uploaded result sheets yet.</p>
                            </motion.div>
                        ) : (
                            filteredRecords.map((record, index) => {
                                const recordId = `${record.student_id}-${record.semester}`;
                                const isExpanded = expandedRecord === recordId;

                                return (
                                <motion.div 
                                    key={recordId} 
                                    {...anim(index + 2)}
                                    layout
                                >
                                    <Card className={`overflow-hidden shadow-sm transition-all duration-200 border-l-[6px] ${record.is_verified ? 'border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/10' : 'border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/20'}`}>
                                        <CardHeader 
                                            className="flex flex-row items-center justify-between pb-4 border-b bg-background/50 cursor-pointer hover:bg-muted/30 transition-colors"
                                            onClick={() => toggleExpand(recordId)}
                                        >
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{record.student_name}</CardTitle>
                                                    <Badge variant="outline" className="font-mono bg-background">{record.student_id}</Badge>
                                                    {record.is_verified ? (
                                                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 gap-1"><CheckCircle className="h-3 w-3" /> Verified</Badge>
                                                    ) : (
                                                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200 gap-1"><Clock className="h-3 w-3 text-orange-600" /> Pending Review</Badge>
                                                    )}
                                                </div>
                                                <CardDescription className="text-sm font-medium text-foreground/80">Semester {record.semester} Result Sheet</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {!record.is_verified && !isExpanded && (
                                                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 hidden sm:inline-block">Click to Review & Action</span>
                                                )}
                                                <Button size="icon" variant="ghost" className="rounded-full w-8 h-8 pointer-events-none">
                                                    <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                >
                                                    <CardContent className="p-0 border-b">
                                                        <div className="bg-background">
                                                            <Table>
                                                                <TableHeader className="bg-muted/50">
                                                                    <TableRow>
                                                                        <TableHead className="font-bold w-[60%]">Subject Code & Course</TableHead>
                                                                        <TableHead className="font-bold text-right pr-6">University Grade / Marks</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {record.marks.map((mark: any) => (
                                                                        <TableRow key={mark.id} className="hover:bg-muted/10 transition-colors">
                                                                            <TableCell className="text-sm border-r bg-muted/5 font-semibold text-foreground">
                                                                                {mark.course_name || mark.display_name || mark.subject_code}
                                                                                {(mark.course_name || mark.display_name) && <span className="ml-2 text-xs font-mono text-muted-foreground">({mark.subject_code})</span>}
                                                                            </TableCell>
                                                                            <TableCell className="text-right pr-6 font-bold text-base text-foreground">{mark.university_mark !== null ? mark.university_mark : mark.university_grade || "-"}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                                <TableFooter className="bg-muted/30">
                                                                    <TableRow>
                                                                        <TableCell className="font-bold text-right text-muted-foreground uppercase text-xs tracking-wider">Semester GPA (Approx)</TableCell>
                                                                        <TableCell className="text-right pr-6 font-black text-indigo-600 dark:text-indigo-400 text-lg">{calculateSGPA(record.marks)}</TableCell>
                                                                    </TableRow>
                                                                </TableFooter>
                                                            </Table>
                                                        </div>
                                                    </CardContent>
                                                    <div className="p-4 border-t bg-muted/10 flex items-center justify-between gap-4 flex-wrap">
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">Authorization Toggle</p>
                                                            <p className="text-xs text-muted-foreground hidden sm:block">Verify marks to allow download, or reject to delete and force re-upload.</p>
                                                        </div>
                                                        <div className="flex bg-muted/80 rounded-full p-1 border shadow-inner items-center">
                                                            <button 
                                                                className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 flex items-center gap-2 ${record.is_verified ? 'bg-emerald-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                                                                onClick={() => !record.is_verified && handleVerifyMarks(record.student_id, record.semester, 'accept')}
                                                                disabled={loadingAction !== null}
                                                            >
                                                                {loadingAction === `${record.student_id}-${record.semester}-accept` ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                                Verified
                                                            </button>
                                                            <button 
                                                                className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 flex items-center gap-2 ${!record.is_verified ? 'bg-orange-500 text-white shadow-md' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                                                onClick={() => {
                                                                    if (window.confirm("Rejecting will completely delete these marks from the system, forcing the student to re-upload. Are you sure?")) {
                                                                        handleVerifyMarks(record.student_id, record.semester, 'decline');
                                                                    }
                                                                }}
                                                                disabled={loadingAction !== null}
                                                            >
                                                                {loadingAction === `${record.student_id}-${record.semester}-decline` ? <Clock className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                                Rejected
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Card>
                                </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default MentorAcademicsPage;
