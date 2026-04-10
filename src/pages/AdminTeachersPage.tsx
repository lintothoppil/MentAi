import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, School, BookOpen, User, ArrowLeft, Trash2, Edit2, ChevronDown, CheckCircle, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface Teacher {
    id: number;
    name: string;
    username: string;
    designation: string;
    department: string;
    status: string;
}

const AdminTeachersPage = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState<string | null>(null);

    const navItems = [
        { label: "Overview", icon: <School className="h-4 w-4" />, path: "/dashboard/admin" },
        { label: "Teachers", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/teachers", isActive: true },
        { label: "Students", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/students" },
        { label: "Courses", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses" },
        { label: "Batches", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/batches" },
        { label: "Alumni", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
        { label: "Timetables", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/admin/timetables" },
        { label: "Attendance", icon: <CheckCircle className="h-4 w-4" />, path: "/dashboard/admin/attendance" },
        { label: "Mentorship", icon: <User className="h-4 w-4" />, path: "/dashboard/admin/mentorship" },
    ];

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/admin/teachers");
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            if (data.success) {
                setTeachers(data.data);
            } else {
                toast.error("Failed to load teachers");
            }
        } catch (error) {
            console.error("Error fetching teachers:", error);
            toast.error("Network error. Ensure server is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: number, newStatus: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/faculty/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setTeachers(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/faculty/${id}`, {
                method: "DELETE",
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setTeachers(prev => prev.filter(t => t.id !== id));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to delete faculty");
        }
    };

    // Define all canonical departments that should be available
    const allDepartments = [
        'Department of Computer Applications',
        'Computer Science and Engineering (CSE)',
        'Mechanical Engineering (ME)',
        'Civil Engineering (CE)',
        'Electrical and Electronics Engineering (EEE)',
        'Electronics and Communication Engineering (ECE)',
        'Department of Business Administration',
        'Basic Sciences & Humanities'
    ];

    // Initialize all departments with empty arrays
    const teachersByDept = allDepartments.reduce((acc, dept) => {
        acc[dept] = [];
        return acc;
    }, {} as Record<string, Teacher[]>);

    // Populate with actual teachers, applying normalization
    teachers.forEach(teacher => {
        let dept = teacher.department || "Unassigned";

        // Map MCA and IMCA to Department of Computer Applications
        if (dept === "MCA" || dept === "IMCA" || dept === "Computer Applications") {
            dept = "Department of Computer Applications";
        }

        // Normalize department names to match the backend canonical list
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

        if (!teachersByDept[dept]) {
            teachersByDept[dept] = [];
        }
        teachersByDept[dept].push(teacher);
    });

    // Sort function: HOD first, then others
    const sortTeachers = (list: Teacher[]) => {
        return list.sort((a, b) => {
            if (a.designation.toLowerCase().includes("hod")) return -1;
            if (b.designation.toLowerCase().includes("hod")) return 1;
            return a.name.localeCompare(b.name);
        });
    };

    // VIEW: Department List (Overview)
    const renderOverview = () => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.keys(teachersByDept).length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                    No teachers found. Please upload teacher data.
                </div>
            ) : (
                Object.keys(teachersByDept).sort().map((dept) => {
                    const count = teachersByDept[dept].length;
                    return (
                        <Card
                            key={dept}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                            onClick={() => setSelectedDept(dept)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xl font-bold">
                                    {dept === "Department of Computer Applications" ? "Computer Applications" : dept}
                                </CardTitle>
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{count}</div>
                                <p className="text-xs text-muted-foreground">Faculty Members</p>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );

    // VIEW: Detailed List (Selected Dept)
    const renderDetailView = () => {
        if (!selectedDept || !teachersByDept[selectedDept]) return null;

        // Special handling for Department of Computer Applications - show as one combined list
        if (selectedDept === "Department of Computer Applications") {
            const allComputerAppTeachers = teachers.filter(t =>
                t.department === 'MCA' ||
                t.department === 'IMCA' ||
                t.department === 'Computer Applications' ||
                t.department.includes('Computer Applications')
            );

            const sortedAllComputerAppTeachers = sortTeachers([...allComputerAppTeachers]);

            return (
                <div className="space-y-6">
                    <Button variant="outline" onClick={() => setSelectedDept(null)} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <School className="h-6 w-6 text-primary" />
                                Computer Applications Department
                            </CardTitle>
                            <CardDescription>All Computer Applications faculty members.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="divide-y divide-border">
                                {sortedAllComputerAppTeachers.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">No Computer Applications faculty members found.</div>
                                ) : (
                                    sortedAllComputerAppTeachers.map((teacher) => (
                                        <li key={teacher.id} className="py-4 flex flex-col md:flex-row md:items-center gap-4 justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${teacher.designation.toLowerCase().includes('hod') ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-base font-semibold flex items-center gap-2">
                                                        {teacher.name}
                                                        {teacher.designation.toLowerCase().includes('hod') && (
                                                            <Badge variant="default" className="text-[10px] h-5">HOD</Badge>
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{teacher.designation} • {teacher.username}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Status Dropdown */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" className={`h-8 border-dashed ${teacher.status === 'Live' ? 'text-green-600 border-green-200 bg-green-50' : teacher.status === 'Leave' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-gray-500'}`}>
                                                            {teacher.status}
                                                            <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(teacher.id, 'Live')}>
                                                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2" /> Live
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(teacher.id, 'Leave')}>
                                                            <div className="h-2 w-2 rounded-full bg-amber-500 mr-2" /> Leave
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(teacher.id, 'Inactive')}>
                                                            <div className="h-2 w-2 rounded-full bg-gray-500 mr-2" /> Inactive
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                {/* Delete Button */}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently delete the faculty member <strong>{teacher.name}</strong>. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(teacher.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // Standard rendering for other departments
        const deptTeachers = sortTeachers([...teachersByDept[selectedDept]]);

        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => setSelectedDept(null)} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <School className="h-6 w-6 text-primary" />
                            {(selectedDept === "Department of Computer Applications" ? "Computer Applications" : selectedDept)} Department
                        </CardTitle>
                        <CardDescription>Manage faculty members status and access.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="divide-y divide-border">
                            {deptTeachers.map((teacher) => (
                                <li key={teacher.id} className="py-4 flex flex-col md:flex-row md:items-center gap-4 justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${teacher.designation.toLowerCase().includes('hod') ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold flex items-center gap-2">
                                                {teacher.name}
                                                {teacher.designation.toLowerCase().includes('hod') && (
                                                    <Badge variant="default" className="text-[10px] h-5">HOD</Badge>
                                                )}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{teacher.designation} • {teacher.username}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Status Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className={`h-8 border-dashed ${teacher.status === 'Live' ? 'text-green-600 border-green-200 bg-green-50' : teacher.status === 'Leave' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-gray-500'}`}>
                                                    {teacher.status}
                                                    <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(teacher.id, 'Live')}>
                                                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2" /> Live
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(teacher.id, 'Leave')}>
                                                    <div className="h-2 w-2 rounded-full bg-amber-500 mr-2" /> Leave
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(teacher.id, 'Inactive')}>
                                                    <div className="h-2 w-2 rounded-full bg-gray-500 mr-2" /> Inactive
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Delete Button */}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the faculty member <strong>{teacher.name}</strong>. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(teacher.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
            <div className="space-y-6">
                {!selectedDept && (
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Teachers Directory</h2>
                        <p className="text-muted-foreground">Select a department to manage its faculty.</p>
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

export default AdminTeachersPage;
