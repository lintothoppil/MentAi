import { useState, FormEvent } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {    Users, School, BookOpen, Upload, ArrowLeft, GraduationCap, Plus, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateBatchOptions } from "@/utils/batchLogic";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TimetableEntry {
    day: string;
    period: number;
    time_slot?: string;
    subject: string;
    handler?: string;
}

const AdminTimetablesPage = () => {
    // Navigation State
    const [viewMode, setViewMode] = useState<'dept' | 'batch' | 'timetable'>('dept');
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [extraYears, setExtraYears] = useState(0);
    const [shiftStart, setShiftStart] = useState(0);
    const [lastArchivedBatch, setLastArchivedBatch] = useState<string | null>(null);

    // Data State
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const navItems = [
        { label: "Overview",   icon: <School className="h-4 w-4" />,        path: "/dashboard/admin" },
        { label: "Teachers",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/teachers" },
        { label: "Students",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/students" },
        { label: "Courses",    icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses" },
        { label: "Batches",    icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/batches" },
        { label: "Alumni",     icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
        { label: "Timetables", icon: <BookOpen className="h-4 w-4" />,      path: "/dashboard/admin/timetables", isActive: true },
        { label: "Attendance", icon: <CheckCircle2 className="h-4 w-4" />,  path: "/dashboard/admin/attendance" },
        { label: "Mentorship", icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/mentorship" },
    ];

    // Mock Departments
    const departments = [
        'Department of Computer Applications',
        'Computer Science and Engineering (CSE)',
        'Mechanical Engineering (ME)',
        'Civil Engineering (CE)',
        'Electrical and Electronics Engineering (EEE)',
        'Electronics and Communication Engineering (ECE)',
        'Electronics and Computer Engineering (ECM)',
        'Department of Business Administration',
        'Basic Sciences & Humanities'
    ];

    const fetchTimetable = async (dept: string, batch: string) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/timetable/view?department=${dept}&batch=${batch}`);
            const data = await response.json();
            if (data.success) {
                setTimetable(data.data);
            } else {
                setTimetable([]);
            }
        } catch (error) {
            console.error("Error fetching timetable:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedDept || !selectedBatch) return;

        const formData = new FormData(e.currentTarget);
        formData.append('department', selectedDept);
        formData.append('batch', selectedBatch);

        setUploading(true);
        try {
            const response = await fetch("http://localhost:5000/api/admin/timetable/upload", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                fetchTimetable(selectedDept, selectedBatch); // Refresh view
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    // Helper to call backend archive API
    const archiveBatch = async (batch: string) => {
        if (!selectedDept) return;
        try {
            const response = await fetch(`http://localhost:5000/api/admin/batch/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: selectedDept, batch })
            });
            const data = await response.json();
            if (data.success) toast.success(data.message);
            else toast.error(data.message);
        } catch (e) {
            toast.error("Failed to archive batch");
        }
    };

    // Helper to call backend unarchive API
    const unarchiveBatch = async (batch: string) => {
        if (!selectedDept) return;
        try {
            const response = await fetch(`http://localhost:5000/api/admin/batch/unarchive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: selectedDept, batch })
            });
            const data = await response.json();
            if (data.success) toast.success(data.message);
            else toast.error(data.message);
        } catch (e) {
            toast.error("Failed to unarchive batch");
        }
    };

    const handleAdvanceYear = async () => {
        if (!selectedDept) return;
        // Get current oldest batch to archive
        const currentOptions = generateBatchOptions(selectedDept, extraYears, shiftStart);
        const oldestBatch = currentOptions[0]; // The first one in list

        if (oldestBatch) {
            await archiveBatch(oldestBatch);
            setLastArchivedBatch(oldestBatch);
        }

        // Shift window: Drop oldest, Add newest
        setShiftStart(prev => prev + 1);
        setExtraYears(prev => prev + 1);
        toast.info("Academic Year Advanced. New batch added, oldest moved to Alumni.");
    };

    const handleUndoAdvance = async () => {
        if (shiftStart > 0 && lastArchivedBatch) {
            await unarchiveBatch(lastArchivedBatch);
            setShiftStart(prev => prev - 1);
            setExtraYears(prev => prev - 1);
            setLastArchivedBatch(null); // Limit undo to 1 step for simplicity
            toast.info("Undo successful. Batch restored.");
        }
    };

    const handleSimpleAddBatch = () => {
        setExtraYears(prev => prev + 1);
        toast.info("New batch added to list.");
    };

    // --- RENDERERS ---

    const renderDeptSelection = () => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
                <Card
                    key={dept}
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
                    onClick={() => { setSelectedDept(dept); setViewMode('batch'); }}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{dept}</CardTitle>
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Manage Timetables</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    const [selectedCourse, setSelectedCourse] = useState<'MCA' | 'IMCA' | null>(null);

    const renderBatchSelection = () => {
        // Special intermediate step for Dept of Computer Applications
        if (selectedDept === 'Department of Computer Applications' && !selectedCourse) {
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => { setSelectedDept(null); setViewMode('dept'); }}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
                        </Button>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold">Computer Applications</h2>
                        <p className="text-muted-foreground">Select a Course to view batches.</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
                            onClick={() => setSelectedCourse('MCA')}
                        >
                            <CardHeader>
                                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">MCA</CardTitle>
                                <CardDescription>Master of Computer Applications (2 Years)</CardDescription>
                            </CardHeader>
                        </Card>
                        <Card
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
                            onClick={() => setSelectedCourse('IMCA')}
                        >
                            <CardHeader>
                                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">IMCA</CardTitle>
                                <CardDescription>Integrated MCA (5 Years)</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            );
        }

        let batchOptions = selectedDept ? generateBatchOptions(selectedDept, extraYears, shiftStart) : [];

        // Filter by selected course if applicable
        if (selectedCourse) {
            batchOptions = batchOptions.filter(b => b.startsWith(selectedCourse));
        }

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => {
                        if (selectedCourse) setSelectedCourse(null);
                        else { setSelectedDept(null); setViewMode('dept'); }
                    }}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> {selectedCourse ? 'Back to Courses' : 'Back to Departments'}
                    </Button>

                    <div className="flex gap-2">
                        {/* Undo Button */}
                        {shiftStart > 0 && lastArchivedBatch && (
                            <Button variant="ghost" size="sm" onClick={handleUndoAdvance} className="text-muted-foreground">
                                <RotateCcw className="mr-2 h-4 w-4" /> Undo Shift
                            </Button>
                        )}

                        {/* Simple Add Check */}
                        <Button variant="outline" size="sm" onClick={handleSimpleAddBatch}>
                            <Plus className="mr-2 h-4 w-4" /> Add Next
                        </Button>

                        {/* Advance Year Dialog */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="default">
                                    Advance Academic Year
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Start New Academic Year?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will:
                                        <ul className="list-disc list-inside mt-2">
                                            <li>Add the next incoming batch.</li>
                                            <li>Archive the oldest batch by moving students to Alumni.</li>
                                        </ul>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleAdvanceYear}>Confirm Advance</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold">
                        {selectedDept} {selectedCourse ? `- ${selectedCourse}` : ''}
                    </h2>
                    <p className="text-muted-foreground">Select Batch</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {batchOptions.length > 0 ? batchOptions.map((batch) => (
                        <Button
                            key={batch}
                            variant="secondary"
                            className="h-24 text-lg font-semibold hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20"
                            onClick={() => { setSelectedBatch(batch); setViewMode('timetable'); fetchTimetable(selectedDept!, batch); }}
                        >
                            {batch}
                        </Button>
                    )) : (
                        <div className="col-span-full text-muted-foreground">No active batches available for this course.</div>
                    )}
                </div>
            </div>
        );
    };

    const renderTimetableView = () => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const periods = [1, 2, 3, 4, 5, 6, 7];

        const getEntry = (day: string, period: number) => {
            return timetable.find(t => t.day.toLowerCase() === day.toLowerCase() && t.period === period);
        };

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => { setSelectedBatch(null); setViewMode('batch'); }}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batches
                    </Button>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold">{selectedDept} - {selectedBatch}</h2>
                        <p className="text-muted-foreground text-sm">Timetable Management</p>
                    </div>
                </div>

                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload Timetable</CardTitle>
                        <CardDescription>Upload a CSV file with columns: Day, Period, Subject, Handler, Time (optional).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpload} className="flex gap-4 items-end">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="timetable_file">Timetable File (CSV/Excel)</Label>
                                <Input id="timetable_file" name="file" type="file" required accept=".csv, .xlsx, .xls" />
                            </div>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? <NotebookLoader size="sm" className="mr-2 text-current" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <NotebookLoader size="lg" className="text-primary" />
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-4 border">Day / Period</th>
                                        {periods.map(p => <th key={p} className="p-4 border text-center">Period {p}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {days.map(day => (
                                        <tr key={day} className="border-b hover:bg-muted/10">
                                            <td className="p-4 font-bold border-r bg-muted/20">{day}</td>
                                            {periods.map(period => {
                                                const entry = getEntry(day, period);
                                                return (
                                                    <td key={period} className="p-2 border text-center min-w-[120px]">
                                                        {entry ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-semibold text-primary">{entry.subject}</span>
                                                                {entry.handler && <span className="text-xs text-muted-foreground">{entry.handler}</span>}
                                                                {entry.time_slot && <span className="text-[10px] text-muted-foreground/50">{entry.time_slot}</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/20">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    return (
        <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
            <div className="space-y-6">
                {!selectedDept && (
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Timetables</h2>
                        <p className="text-muted-foreground">Select a department to manage schedules.</p>
                    </div>
                )}

                {viewMode === 'dept' && renderDeptSelection()}
                {viewMode === 'batch' && renderBatchSelection()}
                {viewMode === 'timetable' && renderTimetableView()}
            </div>
        </DashboardLayout>
    );
};

export default AdminTimetablesPage;
