import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, School, BookOpen, User, ArrowLeft, Trash2, Edit2, ChevronDown, CheckCircle2, GraduationCap, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { generateBatchOptions, getBatchFromAdmissionNumber } from "@/utils/batchLogic";
import { NotebookLoader } from "@/components/ui/NotebookLoader";

interface Student {
    admission_number: string;
    name: string;
    department: string;
    batch: string;
    status: string;
    mentor_id: number;
}

const AdminStudentsPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState<string | null>(null);

    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [extraYears, setExtraYears] = useState(0);

    // Filtered lists
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleBulkUpload = async () => {
        if (!uploadFile) {
            toast.error("Please select a CSV file first");
            return;
        }
        setUploading(true);
        const fd = new FormData();
        fd.append('file', uploadFile);
        
        try {
            const res = await fetch("http://localhost:5000/api/admin/students/bulk-upload", {
                method: "POST",
                body: fd
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Successfully uploaded ${data.data.success} students.`);
                setUploadResult(data.data);
                fetchStudents();
            } else {
                toast.error(data.message || "Failed to upload");
                if (data.data) setUploadResult(data.data);
            }
        } catch(e) {
            toast.error("Network upload error.");
        }
        setUploading(false);
    };

    const navItems = [
        { label: "Overview", icon: <School className="h-4 w-4" />, path: "/dashboard/admin" },
        { label: "Teachers", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/teachers" },
        { label: "Students", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/students", isActive: true },
        { label: "Courses", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses" },
        { label: "Batches", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/batches" },
        { label: "Alumni", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
        { label: "Timetables", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/admin/timetables" },
        { label: "Attendance", icon: <CheckCircle2 className="h-4 w-4" />, path: "/dashboard/admin/attendance" },
        { label: "Mentorship", icon: <User className="h-4 w-4" />, path: "/dashboard/admin/mentorship" },
    ];

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedDept) {
            // The mapping logic in the render cycle groups all students securely under their canonical names 
            // inside the studentsByDept dictionary.
            // We'll let the render cycle handle this.
            // But we keep this effect for backwards compatibility and easy state passing.
        }
    }, [selectedDept, selectedBatch, students]);

    const fetchStudents = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/admin/students");
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            if (data.success) {
                setStudents(data.data);
            } else {
                toast.error("Failed to load students");
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            toast.error("Network error.");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (admNo: string, newStatus: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/student/${admNo}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setStudents(prev => prev.map(s => s.admission_number === admNo ? { ...s, status: newStatus } : s));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleAddBatch = () => {
        setExtraYears(prev => prev + 1);
        toast.info("New batch year added to list");
    };

    const activeStudents = students.filter(s => s.status !== 'Passed Out');

    // Define all canonical departments that should be available
    const allDepartments = [
        'Department of Computer Applications',
        'Computer Science and Engineering (CSE)',
        'Mechanical Engineering (ME)',
        'Civil Engineering (CE)',
        'Electrical and Electronics Engineering (EEE)',
        'Electronics and Communication Engineering (ECE)',
        'Department of Business Administration'
    ];

    // Initialize all departments with empty arrays
    const studentsByDept = allDepartments.reduce((acc, dept) => {
        acc[dept] = [];
        return acc;
    }, {} as Record<string, Student[]>);

    // Populate with actual students, applying normalization
    activeStudents.forEach(student => {
        let dept = student.department || "Unassigned";

        // Map MCA and IMCA to Department of Computer Applications
        if (dept === "MCA" || dept === "IMCA" || dept === "Computer Applications") {
            dept = "Department of Computer Applications";
        }

        // Normalize department names
        const deptUpper = dept.toUpperCase();

        if (deptUpper.includes("COMPUTER SCIENCE") || deptUpper === "CSE" || deptUpper.includes("CSE-")) {
            dept = "Computer Science and Engineering (CSE)";
        } else if (deptUpper.includes("CIVIL") || deptUpper === "CE") {
            dept = "Civil Engineering (CE)";
        } else if (deptUpper.includes("MECHANICAL") || deptUpper === "ME") {
            dept = "Mechanical Engineering (ME)";
        } else if ((deptUpper.includes("ELECTRICAL") && !deptUpper.includes("ELECTRONICS")) || deptUpper === "EE" || deptUpper === "EEE" || (deptUpper.includes("ELECTRICAL") && deptUpper.includes("ELECTRONICS"))) {
            dept = "Electrical and Electronics Engineering (EEE)";
        } else if ((deptUpper.includes("ELECTRONICS") && deptUpper.includes("COMMUNICATION")) || deptUpper === "ECE" || deptUpper === "EC") {
            dept = "Electronics and Communication Engineering (ECE)";
        } else if (deptUpper.includes("BUSINESS") || deptUpper.includes("MBA") || deptUpper.includes("BBA") || deptUpper.includes("MANAGEMENT")) {
            dept = "Department of Business Administration";
        } else if (deptUpper.includes("COMPUTER APPLICATIONS") || deptUpper === "CA" || deptUpper === "MCA" || deptUpper === "IMCA") {
            dept = "Department of Computer Applications";
        } else if (deptUpper.includes("BASIC SCIENCES") || deptUpper.includes("HUMANITIES") || deptUpper === "BSH") {
            dept = "Basic Sciences & Humanities";
        }

        // Only add to department if it's not Basic Sciences & Humanities
        if (!(dept.toUpperCase().includes("BASIC SCIENCES") || dept.toUpperCase().includes("HUMANITIES"))) {
            if (!studentsByDept[dept]) {
                studentsByDept[dept] = [];
            }
            studentsByDept[dept].push(student);
        }
    });

    let batches: string[] = [];
    if (selectedDept) {
        let generatedBatches;
        let existingBatches;

        if (selectedDept === "Department of Computer Applications") {
            // For Department of Computer Applications, get batches from both MCA and IMCA
            generatedBatches = generateBatchOptions("MCA", extraYears); // Use MCA as base for batch generation
            const mcaBatches = activeStudents.filter(s => s.department === 'MCA').map(s => s.batch || getBatchFromAdmissionNumber(s.admission_number, s.department));
            const imcaBatches = activeStudents.filter(s => s.department === 'IMCA').map(s => s.batch || getBatchFromAdmissionNumber(s.admission_number, s.department));
            existingBatches = Array.from(new Set([...mcaBatches, ...imcaBatches])).filter(Boolean);
        } else {
            generatedBatches = generateBatchOptions(selectedDept, extraYears);
            existingBatches = Array.from(new Set(activeStudents.filter(s => s.department === selectedDept).map(s => s.batch || getBatchFromAdmissionNumber(s.admission_number, s.department)))).filter(Boolean);
        }

        batches = Array.from(new Set([...generatedBatches, ...existingBatches])).sort();
    }

    const renderOverview = () => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.keys(studentsByDept).length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                    No active students found. Check Alumni for passed out students.
                </div>
            ) : (
                Object.keys(studentsByDept).sort().map((dept) => {
                    const count = studentsByDept[dept].length;
                    return (
                        <Card
                            key={dept}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                            onClick={() => { setSelectedDept(dept); setSelectedBatch(null); }}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xl font-bold">
                                    {dept === "Department of Computer Applications" ? "Computer Applications" : dept}
                                </CardTitle>
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{count}</div>
                                <p className="text-xs text-muted-foreground">Active Students</p>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );

    const renderDetailView = () => {
        if (!selectedDept) return null;

        // Special handling for Department of Computer Applications - show MCA and IMCA as separate cards
        if (selectedDept === "Department of Computer Applications") {
            const caStudents = studentsByDept[selectedDept] || [];

            // Distinguish IMCA by checking admission number strings for "IMCA" or their explicitly raw department if stored
            const imcaStudents = caStudents.filter(s =>
                (s.admission_number || "").toUpperCase().includes('IMCA') ||
                (s.department || "").toUpperCase() === 'IMCA'
            );

            // MCA is anyone mapped to the Computer Applications department who ISN'T an IMCA student
            const mcaStudents = caStudents.filter(s => !imcaStudents.includes(s));

            // Apply batch filter if selected
            const filteredMcaStudents = selectedBatch && selectedBatch !== 'All'
                ? mcaStudents.filter(s => {
                    const batch = s.batch || getBatchFromAdmissionNumber(s.admission_number, s.department);
                    return batch === selectedBatch;
                })
                : mcaStudents;

            const filteredImcaStudents = selectedBatch && selectedBatch !== 'All'
                ? imcaStudents.filter(s => {
                    const batch = s.batch || getBatchFromAdmissionNumber(s.admission_number, s.department);
                    return batch === selectedBatch;
                })
                : imcaStudents;

            return (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <Button variant="outline" onClick={() => setSelectedDept(null)} className="w-fit">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
                        </Button>

                        <div className="flex items-center gap-2">
                            <Label>Filter Batch:</Label>
                            <div className="flex gap-2">
                                <Select value={selectedBatch || "All"} onValueChange={(val) => setSelectedBatch(val === "All" ? null : val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="All Batches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Batches</SelectItem>
                                        {batches.map(b => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" onClick={handleAddBatch} title="Add Next Batch Year">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* MCA/Computer Applications Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <School className="h-6 w-6 text-primary" />
                                    MCA/Comp Apps Students
                                    {selectedBatch && <Badge variant="outline" className="ml-2">{selectedBatch}</Badge>}
                                </CardTitle>
                                <CardDescription>Master of Computer Applications and Computer Applications students.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <ul className="divide-y divide-border">
                                        {filteredMcaStudents.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground">No MCA/Computer Applications students found matching filters.</div>
                                        ) : (
                                            filteredMcaStudents.map((student) => {
                                                const displayBatch = student.batch || getBatchFromAdmissionNumber(student.admission_number, student.department);
                                                return (
                                                    <li key={student.admission_number} className="p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between hover:bg-muted/20 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-semibold">{student.name}</p>
                                                                <div className="text-sm text-muted-foreground flex gap-2">
                                                                    <span>{student.admission_number}</span>
                                                                    <span>•</span>
                                                                    <span className={!student.batch ? "text-orange-500 font-medium" : ""}>
                                                                        Batch: {displayBatch} {!student.batch && "(Inferred)"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <Badge variant={student.status === 'Live' ? 'default' : student.status === 'Passed Out' ? 'secondary' : 'destructive'}>
                                                                {student.status}
                                                            </Badge>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Live')}>
                                                                        <div className="h-2 w-2 rounded-full bg-green-500 mr-2" /> Live
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Dropout')}>
                                                                        <div className="h-2 w-2 rounded-full bg-red-500 mr-2" /> Dropout
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Passed Out')}>
                                                                        <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" /> Passed Out
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* IMCA Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <School className="h-6 w-6 text-primary" />
                                    IMCA Students
                                    {selectedBatch && <Badge variant="outline" className="ml-2">{selectedBatch}</Badge>}
                                </CardTitle>
                                <CardDescription>Integrated Master of Computer Applications students.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <ul className="divide-y divide-border">
                                        {filteredImcaStudents.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground">No IMCA students found matching filters.</div>
                                        ) : (
                                            filteredImcaStudents.map((student) => {
                                                const displayBatch = student.batch || getBatchFromAdmissionNumber(student.admission_number, student.department);
                                                return (
                                                    <li key={student.admission_number} className="p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between hover:bg-muted/20 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-semibold">{student.name}</p>
                                                                <div className="text-sm text-muted-foreground flex gap-2">
                                                                    <span>{student.admission_number}</span>
                                                                    <span>•</span>
                                                                    <span className={!student.batch ? "text-orange-500 font-medium" : ""}>
                                                                        Batch: {displayBatch} {!student.batch && "(Inferred)"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <Badge variant={student.status === 'Live' ? 'default' : student.status === 'Passed Out' ? 'secondary' : 'destructive'}>
                                                                {student.status}
                                                            </Badge>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Live')}>
                                                                        <div className="h-2 w-2 rounded-full bg-green-500 mr-2" /> Live
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Dropout')}>
                                                                        <div className="h-2 w-2 rounded-full bg-red-500 mr-2" /> Dropout
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Passed Out')}>
                                                                        <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" /> Passed Out
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            );
        }

        // Standard rendering for other departments
        const deptStudents = studentsByDept[selectedDept] || [];
        const currentFiltered = selectedBatch && selectedBatch !== 'All'
            ? deptStudents.filter(s => {
                const batch = s.batch || getBatchFromAdmissionNumber(s.admission_number, s.department);
                return batch === selectedBatch;
            })
            : deptStudents;

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Button variant="outline" onClick={() => setSelectedDept(null)} className="w-fit">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
                    </Button>

                    <div className="flex items-center gap-2">
                        <Label>Filter Batch:</Label>
                        <div className="flex gap-2">
                            <Select value={selectedBatch || "All"} onValueChange={(val) => setSelectedBatch(val === "All" ? null : val)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Batches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Batches</SelectItem>
                                    {batches.map(b => (
                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={handleAddBatch} title="Add Next Batch Year">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <School className="h-6 w-6 text-primary" />
                            {(selectedDept === "Department of Computer Applications" ? "Computer Applications" : selectedDept)} Students
                            {selectedBatch && <Badge variant="outline" className="ml-2">{selectedBatch}</Badge>}
                        </CardTitle>
                        <CardDescription>Manage student status and details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <ul className="divide-y divide-border">
                                {currentFiltered.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">No active students found matching filters.</div>
                                ) : (
                                    currentFiltered.map((student) => {
                                        const displayBatch = student.batch || getBatchFromAdmissionNumber(student.admission_number, student.department);
                                        return (
                                            <li key={student.admission_number} className="p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between hover:bg-muted/20 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold">{student.name}</p>
                                                        <div className="text-sm text-muted-foreground flex gap-2">
                                                            <span>{student.admission_number}</span>
                                                            <span>•</span>
                                                            <span className={!student.batch ? "text-orange-500 font-medium" : ""}>
                                                                Batch: {displayBatch} {!student.batch && "(Inferred)"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Badge variant={student.status === 'Live' ? 'default' : student.status === 'Passed Out' ? 'secondary' : 'destructive'}>
                                                        {student.status}
                                                    </Badge>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Live')}>
                                                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" /> Live
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Dropout')}>
                                                                <div className="h-2 w-2 rounded-full bg-red-500 mr-2" /> Dropout
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.admission_number, 'Passed Out')}>
                                                                <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" /> Passed Out
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
            <div className="space-y-6">
                {!selectedDept && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                        <h2 className="text-3xl font-bold tracking-tight">Students Directory</h2>
                        <p className="text-muted-foreground">All students by department. Filter by batch to manage.</p>
                    </div>
                    <div>
                        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                        
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                                    <Upload className="h-4 w-4" /> Bulk Legacy Upload
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle>Bulk Upload Student Records</DialogTitle>
                                    <DialogDescription>
                                        Upload a CSV file containing legacy batches. The system will auto-calculate their Semesters and mark them as Alumni if they have passed out.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="rounded-xl bg-orange-50/50 border border-orange-200 p-4 font-mono text-xs overflow-x-auto">
                                        <p className="font-bold mb-2">Required CSV Headers:</p>
                                        student_name, roll_number, program, branch, batch_start_year, email
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Select CSV File</Button>
                                        <span className="text-sm font-semibold">{uploadFile ? uploadFile.name : 'No file selected'}</span>
                                    </div>
                                    
                                    {uploadResult && (
                                        <div className="mt-4 border rounded-xl p-4 bg-slate-50">
                                            <p className="font-bold mb-2 text-primary">Upload Summary:</p>
                                            <p className="text-sm text-green-600 font-bold">Successfully imported: {uploadResult.success}</p>
                                            <p className="text-sm text-red-500 font-bold">Failed rows: {uploadResult.failed}</p>
                                            
                                            {uploadResult.errors && uploadResult.errors.length > 0 && (
                                                <div className="mt-3 text-xs bg-red-50 text-red-800 p-3 rounded-lg max-h-32 overflow-y-auto font-mono">
                                                    {uploadResult.errors.map((e: string, idx: number) => <p key={idx}>{e}</p>)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleBulkUpload} disabled={!uploadFile || uploading}>
                                        {uploading ? 'Processing & Validating...' : 'Start Import'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <NotebookLoader size="lg" className="text-primary" />
                    </div>
                ) : (
                    selectedDept ? renderDetailView() : renderOverview()
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminStudentsPage;
