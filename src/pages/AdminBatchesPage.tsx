import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  GraduationCap, 
  Calendar, 
  Users, 
  AlertTriangle,
  CheckCircle,
  RotateCcw 
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

interface Batch {
    id: number;
    course_name: string;
    course_id: number;
    start_year: number;
    end_year: number;
    status: string;
    is_completed: boolean;
    status_tier?: "ongoing" | "final_year" | "alumni";
    status_label?: string;
    duplicate_count?: number;
}

const AdminBatchesPage = () => {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompletionDialog, setShowCompletionDialog] = useState(false);
    const [completedBatches, setCompletedBatches] = useState<string[]>([]);
    const [newBatchData, setNewBatchData] = useState({
        course_id: 0,
        start_year: new Date().getFullYear()
    });
    const [courses, setCourses] = useState<{id: number, name: string, duration_years: number}[]>([]);

    const navItems = [
        { label: "Overview",   icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin" },
        { label: "Teachers",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/teachers" },
        { label: "Students",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/students" },
        { label: "Courses",    icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses" },
        { label: "Batches",    icon: <Calendar className="h-4 w-4" />,      path: "/dashboard/admin/batches", isActive: true },
        { label: "Alumni",     icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
        { label: "Timetables", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/timetables" },
        { label: "Attendance", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/attendance" },
        { label: "Mentorship", icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/mentorship" },
    ];


    useEffect(() => {
        fetchBatches();
        fetchCourses();
    }, []);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const response = await fetch("http://localhost:5000/api/admin/batches");
            const data = await response.json();
            
            if (data.success) {
                setBatches(data.data);
            } else {
                toast.error(data.message || "Failed to fetch batches");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/admin/courses");
            const data = await response.json();
            
            if (data.success) {
                setCourses(data.data);
            } else {
                toast.error(data.message || "Failed to fetch courses");
            }
        } catch (error) {
            toast.error("Network error");
        }
    };

    const handleCreateBatch = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/admin/batch/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: newBatchData.course_id,
                    start_year: newBatchData.start_year
                })
            });
            const data = await response.json();
            
            if (data.success) {
                toast.success(data.message);
                if (data.completed_batches?.length) {
                    setCompletedBatches(data.completed_batches);
                }
                fetchBatches(); // Refresh the list
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to create batch");
        }
    };

    const handleConfirmCompletion = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/admin/batch/confirm_completion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmed: true })
            });
            const data = await response.json();
            
            if (data.success) {
                toast.success(data.message);
                setShowCompletionDialog(false);
                fetchBatches(); // Refresh the list
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to confirm completion");
        }
    };

    const getStatusColor = (batch: Batch) => {
        if (batch.status_tier === "alumni" || batch.is_completed) {
            return "bg-red-100 text-red-800 border-red-200";
        }
        if (batch.status_tier === "final_year") {
            return "bg-orange-100 text-orange-800 border-orange-200";
        }
        return "bg-green-100 text-green-800 border-green-200";
    };

    return (
        <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Batch Management</h2>
                    <p className="text-muted-foreground">Manage academic batches across all departments.</p>
                </div>

                {/* Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Batch</CardTitle>
                        <CardDescription>Add a new academic batch with automatic end year calculation.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="course">Course</Label>
                            <select
                                id="course"
                                className="w-full p-2 border rounded-md"
                                value={newBatchData.course_id}
                                onChange={(e) => setNewBatchData({...newBatchData, course_id: parseInt(e.target.value)})}
                            >
                                <option value="">Select Course</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.name} ({course.duration_years} years)
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <Label htmlFor="startYear">Start Year</Label>
                            <Input
                                id="startYear"
                                type="number"
                                min="2000"
                                max="2100"
                                value={newBatchData.start_year}
                                onChange={(e) => setNewBatchData({...newBatchData, start_year: parseInt(e.target.value)})}
                            />
                        </div>
                        
                        <div className="flex items-end">
                            <Button onClick={handleCreateBatch}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Batch
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Batches List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Batch List</CardTitle>
                        <CardDescription>Current and past academic batches.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="p-8 text-center">Loading batches...</div>
                        ) : batches.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">No batches found.</div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {batches.map(batch => (
                                    <Card key={batch.id} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-xl">
                                                        {batch.course_name}
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground">
                                                        {batch.start_year} - {batch.end_year}
                                                    </p>
                                                </div>
                                                <Badge className={getStatusColor(batch)}>
                                                    {batch.status_label || (batch.is_completed ? "Alumni" : batch.status)}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between text-sm">
                                                <span>Start: {batch.start_year}</span>
                                                <span>End: {batch.end_year}</span>
                                            </div>
                                            {batch.duplicate_count && batch.duplicate_count > 1 && (
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    Merged from {batch.duplicate_count} duplicate batch records
                                                </div>
                                            )}
                                            {(batch.status_tier === "alumni" || batch.is_completed) && (
                                                <div className="mt-2 flex items-center text-red-600">
                                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                                    <span>Ready for alumni transfer</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog for Batch Completion */}
            <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                            Batch Completion Alert
                        </DialogTitle>
                        <DialogDescription>
                            The following batches have completed their course duration and are ready to be moved to alumni:
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-2">
                        {completedBatches.map((batch, index) => (
                            <div key={index} className="flex items-center p-2 bg-yellow-50 rounded-md">
                                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                                <span>{batch}</span>
                            </div>
                        ))}
                    </div>
                    
                    <DialogFooter className="flex sm:justify-between">
                        <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirmCompletion}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm & Move to Alumni
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default AdminBatchesPage;
