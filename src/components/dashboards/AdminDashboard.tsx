import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Upload, FileText, School, AlertCircle, CheckCircle, GraduationCap, Plus, Trash2, Download, Building } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AdminDashboard = () => {
    const [teacherFile, setTeacherFile] = useState<File | null>(null);
    const [studentFile, setStudentFile] = useState<File | null>(null);
    const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
    const [attendanceDate, setAttendanceDate] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; report?: string[] } | null>(null);
    const [stats, setStats] = useState({ totalStudents: 0, activeMentors: 0, departments: 0, totalCourses: 0 });
    const [departments, setDepartments] = useState<Array<{name: string, code: string, faculty_count: number, students_count: number}>>([]);
    const [newDepartment, setNewDepartment] = useState('');
    
    const handleAddDepartment = async () => {
        if (!newDepartment.trim()) {
            toast.error('Please enter a department name');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:5000/api/admin/departments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newDepartment.trim(),
                }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(result.message || 'Department added successfully');
                setNewDepartment('');
                
                // Refresh the departments list
                const newDept = {
                    name: result.data?.name || newDepartment.trim(),
                    code: result.data?.code || newDepartment.trim().substring(0, 3).toUpperCase(),
                    faculty_count: 0,
                    students_count: 0
                };
                const updatedDepts = [...departments, newDept];
                setDepartments(updatedDepts);
                
                // Update stats
                setStats(prev => ({
                    ...prev,
                    departments: prev.departments + 1
                }));
            } else {
                toast.error(result.message || 'Failed to add department');
            }
        } catch (error) {
            toast.error('Failed to add department: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };
    
    const handleRemoveDepartment = async (deptName: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/departments/${encodeURIComponent(deptName)}`, {
                method: 'DELETE',
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(result.message || 'Department removed successfully');
                
                // Update the departments list
                const updatedDepts = departments.filter(dept => dept.name !== deptName);
                setDepartments(updatedDepts);
                
                // Update stats
                setStats(prev => ({
                    ...prev,
                    departments: Math.max(0, prev.departments - 1)
                }));
            } else {
                toast.error(result.message || 'Failed to remove department');
            }
        } catch (error) {
            toast.error('Failed to remove department: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleDownloadTeacherSample = () => {
        // Create CSV content for teacher sample
        const csvContent = [
            ['username', 'password', 'name', 'designation', 'department'],
            ['cse_prof1', 'password123', 'Dr. John Smith', 'Professor', 'CSE'],
            ['cse_asso_prof1', 'password123', 'Dr. Jane Doe', 'Associate Professor', 'CSE'],
            ['me_prof1', 'password123', 'Dr. Robert Johnson', 'Professor', 'ME'],
            ['ce_prof1', 'password123', 'Dr. Emily Davis', 'Professor', 'CE']
        ].map(row => row.join(',')).join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'teacher_sample.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadStudentSample = () => {
        // Create CSV content for student sample
        const csvContent = [
            ['admission_number', 'name', 'roll_number', 'department', 'batch', 'email'],
            ['CSE2024001', 'John Doe', 'CSE001', 'CSE', '2024-2026', 'john.doe@example.com'],
            ['CSE2024002', 'Jane Smith', 'CSE002', 'CSE', '2024-2026', 'jane.smith@example.com'],
            ['ME2024001', 'Robert Johnson', 'ME001', 'ME', '2024-2026', 'robert.johnson@example.com'],
            ['CE2024001', 'Emily Davis', 'CE001', 'CE', '2024-2026', 'emily.davis@example.com']
        ].map(row => row.join(',')).join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'student_sample.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/admin/stats");
                const data = await response.json();
                if (data.success) {
                    setStats({
                        totalStudents: data.data.total_students || 0,
                        activeMentors: data.data.active_mentors || 0,
                        departments: data.data.departments || 0,
                        totalCourses: data.data.total_courses || 0
                    });
                    
                    // Fetch departments separately if needed
                    const deptResponse = await fetch("http://localhost:5000/api/admin/departments");
                    const deptData = await deptResponse.json();
                    if (deptData.success) {
                        setDepartments(deptData.data);
                    } else {
                        // Fallback to basic departments
                        setDepartments([
                            { name: 'Computer Science & Engineering', code: 'CSE', faculty_count: 2, students_count: 15 },
                            { name: 'Mechanical Engineering', code: 'ME', faculty_count: 0, students_count: 0 },
                            { name: 'Civil Engineering', code: 'CE', faculty_count: 0, students_count: 0 },
                            { name: 'Electrical Engineering', code: 'EE', faculty_count: 0, students_count: 0 },
                            { name: 'Electronics & Communication', code: 'ECE', faculty_count: 0, students_count: 0 },
                            { name: 'Computer Applications', code: 'CA', faculty_count: 0, students_count: 0 },
                            { name: 'Basic Sciences & Humanities', code: 'BSH', faculty_count: 1, students_count: 0 }
                        ]);
                    }
                } else {
                    // Fallback in case the API doesn't return expected data
                    setStats({
                        totalStudents: 0,
                        activeMentors: 0,
                        departments: 0,
                        totalCourses: 0
                    });
                    setDepartments([
                        { name: 'Computer Science & Engineering', faculty_count: 2, students_count: 15 },
                        { name: 'Mechanical Engineering', faculty_count: 0, students_count: 0 },
                        { name: 'Civil Engineering', faculty_count: 0, students_count: 0 },
                        { name: 'Electrical Engineering', faculty_count: 0, students_count: 0 },
                        { name: 'Electronics & Communication', faculty_count: 0, students_count: 0 },
                        { name: 'Computer Applications', faculty_count: 0, students_count: 0 },
                        { name: 'Basic Sciences & Humanities', faculty_count: 1, students_count: 0 }
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch admin stats:", error);
                // Set default values in case of error
                setStats({
                    totalStudents: 0,
                    activeMentors: 0,
                    departments: 0,
                    totalCourses: 0
                });
                setDepartments([
                    { name: 'Computer Science & Engineering', code: 'CSE', faculty_count: 2, students_count: 15 },
                    { name: 'Mechanical Engineering', code: 'ME', faculty_count: 0, students_count: 0 },
                    { name: 'Civil Engineering', code: 'CE', faculty_count: 0, students_count: 0 },
                    { name: 'Electrical Engineering', code: 'EE', faculty_count: 0, students_count: 0 },
                    { name: 'Electronics & Communication', code: 'ECE', faculty_count: 0, students_count: 0 },
                    { name: 'Computer Applications', code: 'CA', faculty_count: 0, students_count: 0 },
                    { name: 'Basic Sciences & Humanities', code: 'BSH', faculty_count: 1, students_count: 0 }
                ]);
            }
        };
        fetchStats();
    }, []);

    const navItems = [
        { label: "Overview", icon: <School className="h-4 w-4" />, path: "/dashboard/admin", isActive: true },
        { label: "Teachers", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/teachers" },
        { label: "Students", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/students" },
        { label: "Departments", icon: <Building className="h-4 w-4" />, path: "/dashboard/admin/departments" },
        { label: "Alumni", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
        { label: "Timetables", icon: <FileText className="h-4 w-4" />, path: "/dashboard/admin/timetables" },
        { label: "Attendance", icon: <CheckCircle className="h-4 w-4" />, path: "/dashboard/admin/attendance" },
        { label: "Mentorship", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/mentorship" },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'teacher' | 'student' | 'attendance') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'teacher') setTeacherFile(e.target.files[0]);
            else if (type === 'student') setStudentFile(e.target.files[0]);
            else if (type === 'attendance') setAttendanceFile(e.target.files[0]);
            setUploadResult(null);
        }
    };

    const handleUpload = async (type: 'teacher' | 'student' | 'attendance') => {
        const file = type === 'teacher' ? teacherFile : type === 'student' ? studentFile : attendanceFile;
        if (!file) {
            toast.error("Please select a file first");
            return;
        }

        if (type === 'attendance' && !attendanceDate) {
            toast.error("Please select an attendance date");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        if (type === 'attendance') {
            formData.append("date", attendanceDate);
        }

        setUploading(true);
        setUploadResult(null);

        try {
            const endpoint = type === 'teacher'
                ? "http://localhost:5000/api/admin/upload_teachers"
                : type === 'student'
                    ? "http://localhost:5000/api/admin/upload_students"
                    : "http://localhost:5000/api/admin/attendance/daily_upload";

            const response = await fetch(endpoint, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                setUploadResult({ success: true, message: data.message, report: data.report || data.errors });
                if (type === 'teacher') setTeacherFile(null);
                else if (type === 'student') setStudentFile(null);
                else { setAttendanceFile(null); setAttendanceDate(""); }
            } else {
                toast.error(data.message || "Upload failed");
                setUploadResult({ success: false, message: data.message, report: data.errors });
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Upload failed due to network error");
        } finally {
            setUploading(false);
        }
    };

    return (
        <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
            {uploading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
                >
                    <div className="scale-150 mb-8">
                        <NotebookLoader size="lg" />
                    </div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-heading font-medium text-foreground tracking-tight"
                    >
                        Processing upload...
                    </motion.h2>
                    <p className="text-muted-foreground mt-2">This may take a moment depending on the file size.</p>
                </motion.div>
            )}
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
                    <p className="text-muted-foreground">Manage faculty, students, and academic data.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalStudents === undefined || stats.totalStudents === null ? "..." : stats.totalStudents}</div>
                            <p className="text-xs text-muted-foreground">Enrolled completely</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Mentors</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.activeMentors === undefined || stats.activeMentors === null ? "..." : stats.activeMentors}</div>
                            <p className="text-xs text-muted-foreground">Available for allocation</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Departments</CardTitle>
                            <School className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.departments === undefined || stats.departments === null ? "..." : stats.departments}</div>
                            <p className="text-xs text-muted-foreground">Active departments</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalCourses === undefined || stats.totalCourses === null ? "..." : stats.totalCourses}</div>
                            <p className="text-xs text-muted-foreground">Running courses</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="upload-teachers" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="upload-teachers">Upload Teachers</TabsTrigger>
                        <TabsTrigger value="upload-students">Upload Students</TabsTrigger>
                        <TabsTrigger value="upload-attendance">Upload Attendance</TabsTrigger>
                        <TabsTrigger value="manage-departments">Manage Departments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload-teachers">
                        <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-secondary/5">
                            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Users className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">Bulk Upload Teachers</CardTitle>
                                        <CardDescription className="mt-1">
                                            Upload a CSV or Excel file containing teacher details
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Required Format
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>File Types:</strong> CSV, XLS, XLSX</p>
                                            <p><strong>Required Columns:</strong></p>
                                            <ul className="list-disc list-inside ml-2 space-y-1">
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">username</code> - Unique staff ID</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">password</code> - Initial password</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">name</code> - Full name</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">designation</code> - Role (Professor, Associate Professor, etc.)</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">department</code> - Department name</li>
                                            </ul>
                                            <p className="mt-2"><strong>Allowed Departments:</strong></p>
                                            <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                                <li>Computer Science & Engineering</li>
                                                <li>Mechanical Engineering</li>
                                                <li>Civil Engineering</li>
                                                <li>Electrical Engineering</li>
                                                <li>Electronics & Communication</li>
                                                <li>Computer Applications</li>
                                                <li>Basic Sciences & Humanities</li>
                                            </ul>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <Button variant="outline" size="sm" onClick={handleDownloadTeacherSample}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Teachers Sample
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Upload className="h-5 w-5 text-primary" />
                                            Upload File
                                        </h3>
                                        <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center transition-colors hover:border-primary/40">
                                            <input 
                                                id="teacher-file" 
                                                type="file" 
                                                accept=".csv, .xlsx, .xls" 
                                                onChange={(e) => handleFileChange(e, 'teacher')}
                                                className="hidden"
                                            />
                                            <label 
                                                htmlFor="teacher-file"
                                                className="cursor-pointer flex flex-col items-center gap-3"
                                            >
                                                <div className="p-3 rounded-full bg-primary/10">
                                                    <FileText className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Click to upload teacher data</p>
                                                    <p className="text-sm text-muted-foreground">CSV, XLS or XLSX</p>
                                                </div>
                                                {teacherFile && (
                                                    <div className="text-sm mt-2 flex items-center gap-2">
                                                        <span className="truncate max-w-[200px]">{teacherFile.name}</span>
                                                        <span className="text-xs text-muted-foreground">({(teacherFile.size / 1024).toFixed(2)} KB)</span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                        <Button 
                                            onClick={() => handleUpload('teacher')} 
                                            disabled={uploading || !teacherFile}
                                            className="w-full"
                                        >
                                            {uploading ? (
                                                <>
                                                    <span>Uploading...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload Teachers
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {uploadResult && uploadResult.success === true && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-green-800">Upload Successful</h4>
                                                <p className="text-green-700">{uploadResult.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {uploadResult && uploadResult.success === false && (
                                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-destructive">Upload Failed</h4>
                                                <p className="text-destructive/90">{uploadResult.message}</p>
                                                {uploadResult.report && uploadResult.report.length > 0 && (
                                                    <div className="mt-2 max-h-40 overflow-y-auto bg-destructive/10 p-2 rounded text-sm">
                                                        {uploadResult.report.map((err, i) => (
                                                            <div key={i} className="mb-1 border-b border-destructive/20 pb-1 last:border-0">{err}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="upload-students">
                        <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-secondary/5">
                            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <GraduationCap className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">Bulk Upload Students & Assign Mentors</CardTitle>
                                        <CardDescription className="mt-1">
                                            Upload a CSV or Excel file containing student details. The system will automatically assign mentors.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Required Format
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>File Types:</strong> CSV, XLS, XLSX</p>
                                            <p><strong>Required Columns:</strong></p>
                                            <ul className="list-disc list-inside ml-2 space-y-1">
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">admission_number</code> - Unique admission number</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">name</code> - Full name</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">roll_number</code> - Roll number</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">department</code> - Department name</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">batch</code> - Batch (e.g., 2024-2026)</li>
                                                <li><code className="bg-secondary px-1.5 py-0.5 rounded text-xs">email</code> - Email address</li>
                                            </ul>
                                            <p className="mt-2"><strong>Auto Assignment:</strong> Mentors will be automatically assigned based on department and availability.</p>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <Button variant="outline" size="sm" onClick={handleDownloadStudentSample}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Students Sample
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Upload className="h-5 w-5 text-primary" />
                                            Upload File
                                        </h3>
                                        <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center transition-colors hover:border-primary/40">
                                            <input 
                                                id="student-file" 
                                                type="file" 
                                                accept=".csv, .xlsx, .xls" 
                                                onChange={(e) => handleFileChange(e, 'student')}
                                                className="hidden"
                                            />
                                            <label 
                                                htmlFor="student-file"
                                                className="cursor-pointer flex flex-col items-center gap-3"
                                            >
                                                <div className="p-3 rounded-full bg-primary/10">
                                                    <FileText className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Click to upload student data</p>
                                                    <p className="text-sm text-muted-foreground">CSV, XLS or XLSX</p>
                                                </div>
                                                {studentFile && (
                                                    <div className="text-sm mt-2 flex items-center gap-2">
                                                        <span className="truncate max-w-[200px]">{studentFile.name}</span>
                                                        <span className="text-xs text-muted-foreground">({(studentFile.size / 1024).toFixed(2)} KB)</span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                        <Button 
                                            onClick={() => handleUpload('student')} 
                                            disabled={uploading || !studentFile}
                                            className="w-full"
                                        >
                                            {uploading ? (
                                                <>
                                                    <span>Uploading & Assigning...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload & Assign Mentors
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {uploadResult && uploadResult.success === true && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-green-800">Upload Successful</h4>
                                                <p className="text-green-700">{uploadResult.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {uploadResult && uploadResult.success === false && (
                                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-destructive">Upload Failed</h4>
                                                <p className="text-destructive/90">{uploadResult.message}</p>
                                                {uploadResult.report && uploadResult.report.length > 0 && (
                                                    <div className="mt-2 max-h-40 overflow-y-auto bg-destructive/10 p-2 rounded text-sm">
                                                        {uploadResult.report.map((err, i) => (
                                                            <div key={i} className="mb-1 border-b border-destructive/20 pb-1 last:border-0">{err}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="upload-attendance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Bulk Upload Attendance & Trigger Analytics</CardTitle>
                                <CardDescription>
                                    Upload a CSV or Excel file containing daily attendance. This will automatically trigger the AI risk detection engine to calculate moving averages and identify students at risk.
                                    <br />
                                    Expected Columns: <strong>admission_number, h1, h2, h3, h4, h5, h6, h7</strong> (where values can be P, A, 1, or 0)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5 mb-2">
                                    <Label htmlFor="attendance-date">Attendance Date</Label>
                                    <Input id="attendance-date" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                                </div>
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="attendance-file">Attendance Data File</Label>
                                    <Input id="attendance-file" type="file" accept=".csv, .xlsx" onChange={(e) => handleFileChange(e, 'attendance')} />
                                </div>
                                <Button onClick={() => handleUpload('attendance')} disabled={uploading}>
                                    {uploading ? "Processing & Analyzing..." : "Upload & Analyze Attendance"}
                                    <Upload className="ml-2 h-4 w-4" />
                                </Button>

                                {uploadResult && (
                                    <Alert variant={uploadResult.success ? "default" : "destructive"}>
                                        {uploadResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                        <AlertTitle>{uploadResult.success ? "Analysis Complete" : "Error"}</AlertTitle>
                                        <AlertDescription>
                                            {uploadResult.message}
                                            {uploadResult.report && uploadResult.report.length > 0 && (
                                                <div className="mt-2 max-h-60 overflow-y-auto bg-muted p-2 rounded text-xs font-mono">
                                                    {uploadResult.report.map((line, i) => (
                                                        <div key={i} className="mb-1 border-b border-border/50 pb-1 last:border-0">{line}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="manage-departments">
                        <Card>
                            <CardHeader>
                                <CardTitle>Manage Departments</CardTitle>
                                <CardDescription>
                                    Add, view, or manage academic departments in the system.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="bg-primary/5">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Add New Department</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="dept-name">Department Name</Label>
                                                    <Input 
                                                        id="dept-name" 
                                                        placeholder="e.g., Computer Science & Engineering" 
                                                        value={newDepartment}
                                                        onChange={(e) => setNewDepartment(e.target.value)}
                                                    />
                                                </div>
                                                <Button onClick={handleAddDepartment}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Department
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Current Departments</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {departments.length > 0 ? (
                                                    <ul className="space-y-2">
                                                        {departments.map((dept, index) => (
                                                            <li key={index} className="flex justify-between items-center p-2 bg-secondary rounded">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium">{dept.name}</span>
                                                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{dept.code}</span>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground mt-1">
                                                                        <span className="mr-3">Faculty: {dept.faculty_count}</span>
                                                                        <span>Students: {dept.students_count}</span>
                                                                    </div>
                                                                </div>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() => handleRemoveDepartment(dept.name)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-muted-foreground text-center py-4">No departments found</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
