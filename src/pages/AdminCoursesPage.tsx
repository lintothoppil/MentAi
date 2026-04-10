// src/pages/AdminCoursesPage.tsx
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  GraduationCap, 
  Calendar, 
  Users 
} from "lucide-react";
import { toast } from "sonner";

interface Course {
    id: number;
    name: string;
    duration_years: number;
}

const AdminCoursesPage = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCourse, setNewCourse] = useState({
        name: "",
        duration_years: 4
    });

    const navItems = [
        { label: "Overview",   icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin" },
        { label: "Teachers",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/teachers" },
        { label: "Students",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/students" },
        { label: "Courses",    icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses", isActive: true },
        { label: "Batches",    icon: <Calendar className="h-4 w-4" />,      path: "/dashboard/admin/batches" },
        { label: "Alumni",     icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
        { label: "Timetables", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/timetables" },
        { label: "Attendance", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/attendance" },
        { label: "Mentorship", icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/mentorship" },
    ];


    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await fetch("http://localhost:5000/api/admin/courses");
            const data = await response.json();
            
            if (data.success) {
                setCourses(data.data);
            } else {
                toast.error(data.message || "Failed to fetch courses");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async () => {
        if (!newCourse.name.trim()) {
            toast.error("Course name is required");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/api/admin/course/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCourse)
            });
            const data = await response.json();
            
            if (data.success) {
                toast.success(data.message);
                setNewCourse({ name: "", duration_years: 4 });
                fetchCourses(); // Refresh the list
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to create course");
        }
    };

    return (
        <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Course Configuration</h2>
                    <p className="text-muted-foreground">Manage course settings and durations.</p>
                </div>

                {/* Create Course */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Course</CardTitle>
                        <CardDescription>Add a new course with its duration in years.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="courseName">Course Name</Label>
                            <Input
                                id="courseName"
                                placeholder="e.g., Computer Science Engineering"
                                value={newCourse.name}
                                onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="duration">Duration (years)</Label>
                            <Input
                                id="duration"
                                type="number"
                                min="1"
                                max="10"
                                value={newCourse.duration_years}
                                onChange={(e) => setNewCourse({...newCourse, duration_years: parseInt(e.target.value)})}
                            />
                        </div>
                        
                        <div className="flex items-end">
                            <Button onClick={handleCreateCourse}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Course
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Courses List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Course List</CardTitle>
                        <CardDescription>Current courses and their durations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="p-8 text-center">Loading courses...</div>
                        ) : courses.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">No courses found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">Course Name</th>
                                            <th className="text-left py-2">Duration (years)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courses.map(course => (
                                            <tr key={course.id} className="border-b hover:bg-muted/10">
                                                <td className="py-2">{course.name}</td>
                                                <td className="py-2">{course.duration_years} years</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminCoursesPage;