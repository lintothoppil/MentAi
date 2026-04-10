import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {   User, Users, Home, BookOpen, Briefcase, Save, Edit2, Upload, Building2, Hotel, LayoutDashboard, Brain, Calendar, FileText } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import { useNavigate } from "react-router-dom";
const StudentProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Hardcoded nav items for layout consistency
    const navItems = [
        { label: "Overview",      icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/student" },
        { label: "Academics",     icon: <BookOpen className="h-4 w-4" />,       path: "/dashboard/student/academics" },
        { label: "AI Insights",   icon: <Brain className="h-4 w-4" />,           path: "/dashboard/student/insights" },
        { label: "Timetable",     icon: <Calendar className="h-4 w-4" />,        path: "/dashboard/student/timetable" },
        { label: "Mentoring",     icon: <Users className="h-4 w-4" />,           path: "/dashboard/student/mentoring" },
        { label: "Requests",      icon: <FileText className="h-4 w-4" />,        path: "/dashboard/student/requests" },
        { label: "Profile",       icon: <User className="h-4 w-4" />,            path: "/dashboard/student/profile", isActive: true },
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            // If not a student account (no admission_number), redirect to home
            if (!user.admission_number) {
                setLoading(false);
                navigate('/');
                return;
            }

            try {
                const response = await fetch(`http://localhost:5000/api/profile/${user.admission_number}`);
                const data = await response.json();
                if (data.success) {
                    // Merge: profile API returns full_name but also keep admission_number
                    setFormData({ ...data.data, full_name: data.data.full_name || user.name });
                    if (data.data.photo_path) {
                        setPhotoPreview(`http://localhost:5000/static/${data.data.photo_path}`);
                    }
                } else {
                    toast.error("Failed to load profile");
                }
            } catch (error) {
                console.error(error);
                toast.error("Error loading profile");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = (section: string, field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData((prev: any) => ({ ...prev, photo: file }));
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!window.confirm("Are you sure you want to update your profile details?")) {
            return;
        }

        setSaving(true);
        try {
            const submitData = new FormData();
            // Clean up formData to remove file object from JSON
            const { photo, ...jsonPayload } = formData;
            submitData.append('data', JSON.stringify(jsonPayload));

            if (formData.photo instanceof File) {
                submitData.append('photo', formData.photo);
            }

            const response = await fetch("http://localhost:5000/api/complete_profile", {
                method: "POST",
                body: submitData,
            });

            const result = await response.json();
            if (result.success) {
                // Fetch updated profile to update localStorage
                try {
                    const refreshedResponse = await fetch(`http://localhost:5000/api/profile/${formData.admission_number}`);
                    const refreshedData = await refreshedResponse.json();
                    if (refreshedData.success) {
                        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                        const updatedUser = { ...currentUser, ...refreshedData.data };
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                } catch (e) {
                    console.error("Failed to refresh user data", e);
                }

                toast.success("Profile updated successfully!");
                setIsEditing(false);
                // Refresh to update header avatar
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error(result.message || "Update failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><NotebookLoader size="sm" className="mr-2 text-current" /></div>;

    return (
        <DashboardLayout role="student" roleLabel="Student Dashboard" navItems={navItems} gradientClass="gradient-student">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <Button variant="outline" onClick={() => {
                                if (window.confirm("Do you want to edit your profile details?")) {
                                    setIsEditing(true);
                                }
                            }}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => { setIsEditing(false); /* Reset? */ }}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={saving}>
                                    {saving ? <NotebookLoader size="sm" className="mr-2 text-current" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                    <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-6 lg:w-[760px]">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="parents">Parents</TabsTrigger>
                        <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
                        <TabsTrigger value="academics">Academics</TabsTrigger>
                        <TabsTrigger value="other">Other</TabsTrigger>
                        <TabsTrigger value="wellness">Wellness</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal">
                        <Card>
                            <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
                            <CardContent>
                                <fieldset disabled={!isEditing} className="space-y-4">
                                    {/* Photo Upload */}
                                    <div className="flex items-center gap-4">
                                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20">
                                            {photoPreview ? <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-muted flex items-center justify-center"><User className="h-8 w-8 text-muted-foreground" /></div>}
                                        </div>
                                        <div>
                                            <Label htmlFor="photo-upload" className={`cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 rounded-md inline-flex items-center text-sm font-medium transition-colors ${!isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <Upload className="mr-2 h-4 w-4" /> Change Photo
                                            </Label>
                                            <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={!isEditing} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Full Name</Label>
                                            <Input name="full_name" value={formData.full_name || ''} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Admission Number</Label>
                                            <Input value={formData.admission_number || ''} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Department</Label>
                                            <Input value={formData.department || ''} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mobile Number</Label>
                                            <Input name="mobile_number" value={formData.mobile_number || ''} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input name="email" value={formData.email || ''} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date of Birth</Label>
                                            <Input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Blood Group</Label>
                                            <Select value={formData.blood_group} onValueChange={(v) => handleChange({ target: { name: 'blood_group', value: v } })}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Religion</Label>
                                            <Select value={formData.religion} onValueChange={(v) => handleChange({ target: { name: 'religion', value: v } })}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    {['Hindu', 'Muslim', 'Christian', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </fieldset>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="parents">
                        <Card>
                            <CardHeader><CardTitle>Parent & Guardian Details</CardTitle></CardHeader>
                            <CardContent>
                                <fieldset disabled={!isEditing} className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Father's Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Name</Label>
                                                <Input value={formData.parents?.father_name || ''} onChange={(e) => handleNestedChange('parents', 'father_name', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Occupation</Label>
                                                <Input value={formData.parents?.father_occupation || ''} onChange={(e) => handleNestedChange('parents', 'father_occupation', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Mobile</Label>
                                                <Input value={formData.parents?.father_mobile || ''} onChange={(e) => handleNestedChange('parents', 'father_mobile', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Mother's Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Name</Label>
                                                <Input value={formData.parents?.mother_name || ''} onChange={(e) => handleNestedChange('parents', 'mother_name', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Occupation</Label>
                                                <Input value={formData.parents?.mother_occupation || ''} onChange={(e) => handleNestedChange('parents', 'mother_occupation', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Mobile</Label>
                                                <Input value={formData.parents?.mother_mobile || ''} onChange={(e) => handleNestedChange('parents', 'mother_mobile', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="accommodation">
                        <Card>
                            <CardHeader><CardTitle>Accommodation Details</CardTitle></CardHeader>
                            <CardContent>
                                <fieldset disabled={!isEditing} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Accommodation Type</Label>
                                        <Select value={formData.accommodation?.type} onValueChange={(v) => handleNestedChange('accommodation', 'type', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="college_hostel">College Hostel</SelectItem>
                                                <SelectItem value="private_hostel">Private Hostel</SelectItem>
                                                <SelectItem value="day_scholar">Day Scholar</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {formData.accommodation?.type && formData.accommodation.type !== 'day_scholar' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Hostel Name</Label>
                                                <Input value={formData.accommodation?.hostel_name || ''} onChange={(e) => handleNestedChange('accommodation', 'hostel_name', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Room Number</Label>
                                                <Input value={formData.accommodation?.room_number || ''} onChange={(e) => handleNestedChange('accommodation', 'room_number', e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                </fieldset>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="academics">
                        <Card>
                            <CardHeader><CardTitle>Academic History</CardTitle></CardHeader>
                            <CardContent>
                                <fieldset disabled={!isEditing} className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">10th Grade</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>School</Label>
                                                <Input value={formData.academics?.school_10th || ''} onChange={(e) => handleNestedChange('academics', 'school_10th', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Percentage</Label>
                                                <Input value={formData.academics?.percentage_10th || ''} onChange={(e) => handleNestedChange('academics', 'percentage_10th', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">12th Grade</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>School</Label>
                                                <Input value={formData.academics?.school_12th || ''} onChange={(e) => handleNestedChange('academics', 'school_12th', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Percentage</Label>
                                                <Input value={formData.academics?.percentage_12th || ''} onChange={(e) => handleNestedChange('academics', 'percentage_12th', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    {(formData.academics?.college_ug || formData.academics?.completed_ug) && (
                                        <div className="space-y-4">
                                            <h3 className="font-semibold">Undergraduate (UG)</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>College</Label>
                                                    <Input value={formData.academics?.college_ug || ''} onChange={(e) => handleNestedChange('academics', 'college_ug', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Percentage</Label>
                                                    <Input value={formData.academics?.percentage_ug || ''} onChange={(e) => handleNestedChange('academics', 'percentage_ug', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </fieldset>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="other">
                        <Card>
                            <CardHeader><CardTitle>Other Information</CardTitle></CardHeader>
                            <CardContent>
                                <fieldset disabled={!isEditing} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Achievements</Label>
                                        <Input value={formData.other_info?.achievements || ''} onChange={(e) => handleNestedChange('other_info', 'achievements', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hobbies</Label>
                                        <Input value={formData.other_info?.hobbies || ''} onChange={(e) => handleNestedChange('other_info', 'hobbies', e.target.value)} />
                                    </div>
                                </fieldset>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="wellness">
                        <Card>
                            <CardHeader><CardTitle>Wellness & Workout Preferences</CardTitle></CardHeader>
                            <CardContent>
                                <fieldset disabled={!isEditing} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Wake Time</Label>
                                            <Input
                                                type="time"
                                                value={formData.wellness_preferences?.wake_time || "06:00"}
                                                onChange={(e) => handleNestedChange("wellness_preferences", "wake_time", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sleep Time</Label>
                                            <Input
                                                type="time"
                                                value={formData.wellness_preferences?.sleep_time || "22:30"}
                                                onChange={(e) => handleNestedChange("wellness_preferences", "sleep_time", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Workout Duration (minutes)</Label>
                                            <Input
                                                type="number"
                                                min={15}
                                                max={90}
                                                value={formData.wellness_preferences?.workout_duration_minutes || 30}
                                                onChange={(e) => handleNestedChange("wellness_preferences", "workout_duration_minutes", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Weekly Workout Target (sessions)</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={7}
                                                value={formData.wellness_preferences?.weekly_workout_target || 4}
                                                onChange={(e) => handleNestedChange("wellness_preferences", "weekly_workout_target", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fitness Goal</Label>
                                            <Select
                                                value={formData.wellness_preferences?.fitness_goal || "general_fitness"}
                                                onValueChange={(v) => handleNestedChange("wellness_preferences", "fitness_goal", v)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fat_loss">Fat Loss</SelectItem>
                                                    <SelectItem value="strength">Strength</SelectItem>
                                                    <SelectItem value="flexibility">Flexibility</SelectItem>
                                                    <SelectItem value="general_fitness">General Fitness</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Intensity Level</Label>
                                            <Select
                                                value={formData.wellness_preferences?.intensity_level || "moderate"}
                                                onValueChange={(v) => handleNestedChange("wellness_preferences", "intensity_level", v)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="light">Light</SelectItem>
                                                    <SelectItem value="moderate">Moderate</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Home Equipment</Label>
                                            <Select
                                                value={formData.wellness_preferences?.home_equipment || "none"}
                                                onValueChange={(v) => handleNestedChange("wellness_preferences", "home_equipment", v)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    <SelectItem value="basic">Basic (mat/bands/dumbbells)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Preferred Workout Time</Label>
                                            <Select
                                                value={formData.wellness_preferences?.preferred_workout_time || "evening"}
                                                onValueChange={(v) => handleNestedChange("wellness_preferences", "preferred_workout_time", v)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="morning">Morning</SelectItem>
                                                    <SelectItem value="afternoon">Afternoon</SelectItem>
                                                    <SelectItem value="evening">Evening</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Health Constraints (optional)</Label>
                                        <Input
                                            value={formData.wellness_preferences?.health_constraints || ""}
                                            onChange={(e) => handleNestedChange("wellness_preferences", "health_constraints", e.target.value)}
                                            placeholder="e.g., knee pain, lower-back sensitivity"
                                        />
                                    </div>
                                </fieldset>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default StudentProfile;
