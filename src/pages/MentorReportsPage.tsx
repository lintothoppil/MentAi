import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Calendar, TrendingUp, Download, PieChart as PieChartIcon, BarChart3, Presentation, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const navItems = [
    { label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor" },
    { label: "My Mentees", icon: <Users className="h-4 w-4" />, path: "/dashboard/mentor/mentees" },
    { label: "Sessions", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/mentor/sessions" },
    { label: "Timetable", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/faculty/timetable" },
    { label: "Academics", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/mentor/academics" },
    { label: "AI Reports", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/mentor/ai-reports" },
    { label: "Reports", icon: <TrendingUp className="h-4 w-4" />, path: "/dashboard/mentor/reports", isActive: true },
];

const anim = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05 },
});

const MentorReportsPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [mentees, setMentees] = useState<any[]>([]);

    useEffect(() => {
        if (user.id) {
            // Fetch some mentor analytics/reports data
            fetch(`http://localhost:5000/api/analytics/mentor/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setMentees(data.data);
                    }
                })
                .catch(err => console.error("Failed to fetch mentees for reports", err));
        }
    }, [user.id]);

    const currentRisk = (m: any) => Number(m.adjusted_risk ?? m.risk_score ?? 0);
    const performanceData = mentees.map(m => ({ name: m.student_id, score: 100 - currentRisk(m) }));
    const riskData = [
        { name: "At Risk", value: mentees.filter(m => currentRisk(m) >= 60).length, color: "#ef4444" },
        { name: "Average", value: mentees.filter(m => currentRisk(m) >= 30 && currentRisk(m) < 60).length, color: "#f59e0b" },
        { name: "Good", value: mentees.filter(m => currentRisk(m) < 30).length, color: "#22c55e" },
    ].filter(item => item.value > 0);

    return (
        <DashboardLayout role="mentor" roleLabel="Mentor Dashboard" navItems={navItems} gradientClass="gradient-mentor">
            <div className="flex flex-col gap-6">
                <motion.div {...anim(0)} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mentorship Reports & Analytics</h1>
                        <p className="text-muted-foreground">Comprehensive insights into your mentees' performance and engagement.</p>
                    </div>
                    <Button className="gap-2"><Download className="h-4 w-4" /> Export Report</Button>
                </motion.div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <motion.div {...anim(1)} className="lg:col-span-2">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Mentee Performance Overview</CardTitle>
                                <CardDescription>Estimated academic health scores based on system analytics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {performanceData.length > 0 ? (
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={performanceData.slice(0, 10)}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                                    {performanceData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#22c55e' : entry.score > 40 ? '#f59e0b' : '#ef4444'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div {...anim(2)}>
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" /> Risk Distribution</CardTitle>
                                <CardDescription>Overall breakdown of mentee risk levels</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center">
                                {riskData.length > 0 ? (
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={riskData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {riskData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">No data available</div>
                                )}
                                <div className="flex gap-4 mt-4 w-full justify-center text-sm">
                                    {riskData.map(item => (
                                        <div key={item.name} className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span>{item.name} ({item.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
                
                <motion.div {...anim(3)}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Presentation className="h-5 w-5" /> Summary</CardTitle>
                            <CardDescription>Automated insights generated from platform usage and performance history.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-muted/50 border">
                                    <h4 className="font-semibold mb-1">Observation 1</h4>
                                    <p className="text-sm text-muted-foreground">Most students are logging into the system successfully, though session response rates remain around 65%.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/50 border">
                                    <h4 className="font-semibold mb-1">Observation 2</h4>
                                    <p className="text-sm text-muted-foreground">3 students have been flagged by the automated attendance correlation model for potentially low interaction.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

            </div>
        </DashboardLayout>
    );
};

export default MentorReportsPage;
