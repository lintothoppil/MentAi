
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { User, BookOpen, Home, Briefcase, ChevronRight, ChevronLeft, Upload, Building2, Hotel } from "lucide-react";

export default function CompleteProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            navigate("/login");
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    // Form State
    const [formData, setFormData] = useState({
        // Personal
        photo: null as File | null,
        roll_number: user?.admission_number ? user.admission_number.slice(-2) : "",  // Auto-populate with last 2 digits of admission number
        branch: "",
        batch: "",
        dob: "",
        age: "",
        blood_group: "",
        religion: "",
        diocese: "",
        parish: "",
        caste_category: "",
        mobile_number: "",
        permanent_address: "",
        contact_address: "",
        same_address: false,

        // Parents
        father_name: "",
        father_profession: "",
        father_age: "",
        father_place_of_work: "",
        father_mobile: "",
        mother_name: "",
        mother_profession: "",
        mother_age: "",
        mother_place_of_work: "",
        mother_mobile: "",

        // Guardian
        guardian_name: "",
        guardian_address: "",
        guardian_mobile: "",

        // Accommodation
        accommodation_type: "day_scholar", // day_scholar, college_hostel, private_hostel
        hostel_name: "",
        stay_from: "",
        stay_to: "",
        staying_with: "",
        transport_mode: "",
        vehicle_number: "",

        // Academic
        school_10th: "",
        board_10th: "",
        percentage_10th: "",
        medium_10th: "",
        school_12th: "",
        board_12th: "",
        percentage_12th: "",
        medium_12th: "",
        college_ug: "",
        university_ug: "",
        percentage_ug: "",
        entrance_rank: "",
        nature_of_admission: "",
        completed_ug: false,

        // Work Experience
        organization: "",
        job_title: "",
        duration: ""
    });

    // Calc Age
    useEffect(() => {
        if (formData.dob) {
            const birthDate = new Date(formData.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            setFormData(prev => ({ ...prev, age: age.toString() }));
        }
    }, [formData.dob]);

    // Handle Address Copy
    useEffect(() => {
        if (formData.same_address) {
            setFormData(prev => ({ ...prev, contact_address: prev.permanent_address }));
        }
    }, [formData.same_address, formData.permanent_address]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData(prev => ({ ...prev, photo: file }));
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                admission_number: user.admission_number,

                // Personal
                roll_number: formData.roll_number,
                branch: user.department || formData.branch, // Use detected branch
                batch: formData.batch,
                dob: formData.dob,
                age: formData.age,
                blood_group: formData.blood_group,
                religion: formData.religion,
                diocese: formData.religion === 'Christian (Catholic)' ? formData.diocese : '',
                parish: formData.religion === 'Christian (Catholic)' ? formData.parish : '',
                caste_category: formData.caste_category,
                permanent_address: formData.permanent_address,
                contact_address: formData.contact_address,
                mobile_number: formData.mobile_number,

                // Nested Objects
                parents: {
                    father_name: formData.father_name,
                    father_profession: formData.father_profession,
                    father_age: formData.father_age,
                    father_place_of_work: formData.father_place_of_work,
                    father_mobile: formData.father_mobile,
                    mother_name: formData.mother_name,
                    mother_profession: formData.mother_profession,
                    mother_age: formData.mother_age,
                    mother_place_of_work: formData.mother_place_of_work,
                    mother_mobile: formData.mother_mobile,
                },
                guardian: {
                    name: formData.guardian_name,
                    address: formData.guardian_address,
                    mobile_number: formData.guardian_mobile,
                },
                other_info: {
                    accommodation_type: formData.accommodation_type,
                    hostel_name: formData.hostel_name,
                    stay_from: formData.stay_from,
                    stay_to: formData.stay_to,
                    staying_with: formData.staying_with,
                    transport_mode: formData.transport_mode,
                    vehicle_number: formData.vehicle_number,
                },
                academics: {
                    school_10th: formData.school_10th,
                    board_10th: formData.board_10th,
                    percentage_10th: formData.percentage_10th,
                    medium_of_instruction: formData.medium_10th, // Mapping to medium field
                    school_12th: formData.school_12th,
                    board_12th: formData.board_12th,
                    percentage_12th: formData.percentage_12th,
                    college_ug: formData.college_ug,
                    university_ug: formData.university_ug,
                    percentage_ug: formData.percentage_ug,
                    entrance_rank: formData.entrance_rank,
                    nature_of_admission: formData.nature_of_admission,
                },
                work_experience: formData.organization ? [{
                    organization: formData.organization,
                    job_title: formData.job_title,
                    duration: formData.duration
                }] : []
            };

            const submitData = new FormData();
            submitData.append('data', JSON.stringify(payload));
            if (formData.photo) {
                submitData.append('photo', formData.photo);
            }

            const response = await fetch("http://localhost:5000/api/complete_profile", {
                method: "POST",
                body: submitData, // No Content-Type header needed, browser sets it
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Profile completed successfully!");
                const updatedUser = { ...user, profile_completed: true };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                navigate("/dashboard/student");
            } else {
                toast.error(data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-secondary/30 p-4 md:p-8 flex justify-center items-start">
            <Card className="w-full max-w-4xl shadow-xl border-border/60">
                <CardHeader className="bg-primary/5 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold text-primary">Complete Your Profile</CardTitle>
                            <CardDescription>Step {step} of 4: {
                                step === 1 ? "Personal Details" :
                                    step === 2 ? "Family & Guardian" :
                                        step === 3 ? "Accommodation" : "Academic & Work"
                            }</CardDescription>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} className={`h-2 w-8 rounded-full ${s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-secondary'}`} />
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* STEP 1: PERSONAL */}
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-32 w-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/50 overflow-hidden relative">
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                            )}
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                        <Label className="text-xs text-muted-foreground">Upload Photo</Label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                        <div className="space-y-2">
                                            <Label>Admission Number</Label>
                                            <Input value={user.admission_number} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Batch (Year-Year)</Label>
                                            <Input name="batch" placeholder="e.g. 2024-2028" value={formData.batch} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Branch</Label>
                                            <Input value={user.department || ""} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Roll Number</Label>
                                            <Input name="roll_number" value={formData.roll_number} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Date of Birth</Label>
                                        <Input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Age</Label>
                                        <Input name="age" value={formData.age} readOnly className="bg-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Blood Group</Label>
                                        <Select name="blood_group" onValueChange={(v) => handleSelectChange("blood_group", v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(g => (
                                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Religion</Label>
                                        <Select name="religion" onValueChange={(v) => handleSelectChange("religion", v)}>
                                            <SelectTrigger><SelectValue placeholder="Select Religion" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Christian (Catholic)">Christian (Catholic)</SelectItem>
                                                <SelectItem value="Christian (Non-Catholic)">Christian (Non-Catholic)</SelectItem>
                                                <SelectItem value="Hindu">Hindu</SelectItem>
                                                <SelectItem value="Muslim">Muslim</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Caste Category</Label>
                                        <Select name="caste_category" onValueChange={(v) => handleSelectChange("caste_category", v)}>
                                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="General">General</SelectItem>
                                                <SelectItem value="OBC">OBC</SelectItem>
                                                <SelectItem value="SC">SC</SelectItem>
                                                <SelectItem value="ST">ST</SelectItem>
                                                <SelectItem value="OEC">OEC</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {formData.religion === 'Christian (Catholic)' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-lg">
                                        <div className="space-y-2">
                                            <Label>Diocese</Label>
                                            <Input name="diocese" value={formData.diocese} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Parish</Label>
                                            <Input name="parish" value={formData.parish} onChange={handleChange} />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Mobile Number</Label>
                                        <Input name="mobile_number" value={formData.mobile_number} onChange={handleChange} required />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Permanent Address</Label>
                                            <Textarea name="permanent_address" value={formData.permanent_address} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Contact Address</Label>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id="same_addr" checked={formData.same_address} onCheckedChange={(c) => setFormData(p => ({ ...p, same_address: !!c }))} />
                                                    <label htmlFor="same_addr" className="text-xs text-muted-foreground cursor-pointer">Same as Permanent</label>
                                                </div>
                                            </div>
                                            <Textarea name="contact_address" value={formData.contact_address} onChange={handleChange} required disabled={formData.same_address} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: FAMILY */}
                        {step === 2 && (
                            <div className="space-y-8 animate-fade-in">
                                {/* Father */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2 text-primary border-b pb-2">
                                        <User className="h-4 w-4" /> Father's Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input name="father_name" value={formData.father_name} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Profession</Label>
                                            <Input name="father_profession" value={formData.father_profession} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Age</Label>
                                            <Input name="father_age" type="number" value={formData.father_age} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mobile</Label>
                                            <Input name="father_mobile" value={formData.father_mobile} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Place of Work</Label>
                                            <Input name="father_place_of_work" value={formData.father_place_of_work} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>

                                {/* Mother */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2 text-primary border-b pb-2">
                                        <User className="h-4 w-4" /> Mother's Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input name="mother_name" value={formData.mother_name} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Profession</Label>
                                            <Input name="mother_profession" value={formData.mother_profession} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Age</Label>
                                            <Input name="mother_age" type="number" value={formData.mother_age} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mobile</Label>
                                            <Input name="mother_mobile" value={formData.mother_mobile} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Place of Work</Label>
                                            <Input name="mother_place_of_work" value={formData.mother_place_of_work} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>

                                {/* Guardian */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2 text-primary border-b pb-2">
                                        <User className="h-4 w-4" /> Local Guardian (Optional)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input name="guardian_name" value={formData.guardian_name} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mobile</Label>
                                            <Input name="guardian_mobile" value={formData.guardian_mobile} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Address</Label>
                                            <Textarea name="guardian_address" value={formData.guardian_address} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ACCOMMODATION */}
                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="space-y-4">
                                    <Label>Accommodation Type</Label>
                                    <RadioGroup
                                        defaultValue="day_scholar"
                                        value={formData.accommodation_type}
                                        onValueChange={(v) => handleSelectChange("accommodation_type", v)}
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                    >
                                        <div>
                                            <RadioGroupItem value="day_scholar" id="day" className="peer sr-only" />
                                            <Label htmlFor="day" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                <Home className="mb-3 h-6 w-6" />
                                                Day Scholar
                                            </Label>
                                        </div>
                                        <div>
                                            <RadioGroupItem value="college_hostel" id="coll" className="peer sr-only" />
                                            <Label htmlFor="coll" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                <Building2 className="mb-3 h-6 w-6" />
                                                College Hostel
                                            </Label>
                                        </div>
                                        <div>
                                            <RadioGroupItem value="private_hostel" id="priv" className="peer sr-only" />
                                            <Label htmlFor="priv" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                <Hotel className="mb-3 h-6 w-6" />
                                                Private Hostel
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {formData.accommodation_type === 'day_scholar' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-lg">
                                        <div className="space-y-2">
                                            <Label>Staying With</Label>
                                            <Input name="staying_with" placeholder="e.g. Parents" value={formData.staying_with} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Transport Mode</Label>
                                            <Select name="transport_mode" onValueChange={(v) => handleSelectChange("transport_mode", v)}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="College Bus">College Bus</SelectItem>
                                                    <SelectItem value="Private Bus">Private Bus</SelectItem>
                                                    <SelectItem value="Own Vehicle">Own Vehicle</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {formData.transport_mode === 'Own Vehicle' && (
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Vehicle Number</Label>
                                                <Input name="vehicle_number" value={formData.vehicle_number} onChange={handleChange} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-lg">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Hostel Name</Label>
                                            <Input name="hostel_name" value={formData.hostel_name} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Staying From</Label>
                                            <Input type="date" name="stay_from" value={formData.stay_from} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Staying To (Optional)</Label>
                                            <Input type="date" name="stay_to" value={formData.stay_to} onChange={handleChange} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 4: ACADEMIC & WORK */}
                        {step === 4 && (
                            <div className="space-y-8 animate-fade-in">
                                {/* Academic Details */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2 text-primary border-b pb-2">
                                        <BookOpen className="h-4 w-4" /> Academic History
                                    </h3>

                                    <div className="space-y-4 border p-4 rounded-lg">
                                        <h4 className="font-medium">10th Grade / SSLC</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>School Name</Label>
                                                <Input name="school_10th" value={formData.school_10th} onChange={handleChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Board</Label>
                                                <Input name="board_10th" placeholder="e.g. CBSE" value={formData.board_10th} onChange={handleChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Percentage / CGPA</Label>
                                                <Input name="percentage_10th" value={formData.percentage_10th} onChange={handleChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Medium</Label>
                                                <Input name="medium_10th" placeholder="English" value={formData.medium_10th} onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border p-4 rounded-lg">
                                        <h4 className="font-medium">12th Grade / HSC</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>School Name</Label>
                                                <Input name="school_12th" value={formData.school_12th} onChange={handleChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Board</Label>
                                                <Input name="board_12th" value={formData.board_12th} onChange={handleChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Percentage / CGPA</Label>
                                                <Input name="percentage_12th" value={formData.percentage_12th} onChange={handleChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Medium</Label>
                                                <Input name="medium_12th" value={formData.medium_12th} onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border p-4 rounded-lg">
                                        <h4 className="font-medium">Admission Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Entrance Rank</Label>
                                                <Input name="entrance_rank" placeholder="KEAM/LBS Rank" value={formData.entrance_rank} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Nature of Admission</Label>
                                                <Select name="nature_of_admission" onValueChange={(v) => handleSelectChange("nature_of_admission", v)}>
                                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Merit">Merit</SelectItem>
                                                        <SelectItem value="Management">Management</SelectItem>
                                                        <SelectItem value="NRI">NRI</SelectItem>
                                                        <SelectItem value="Lateral Entry">Lateral Entry</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 mt-4 ml-1">
                                            <Checkbox
                                                id="completed_ug"
                                                checked={formData.completed_ug}
                                                onCheckedChange={(c) => setFormData(p => ({ ...p, completed_ug: !!c }))}
                                            />
                                            <label htmlFor="completed_ug" className="text-sm font-medium leading-none cursor-pointer">
                                                I have completed a UG Degree / Diploma
                                            </label>
                                        </div>

                                        {(formData.nature_of_admission === 'Lateral Entry' || formData.completed_ug) && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 animate-fade-in">
                                                <div className="space-y-2">
                                                    <Label>College / Poly (UG)</Label>
                                                    <Input name="college_ug" value={formData.college_ug} onChange={handleChange} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>University / Board</Label>
                                                    <Input name="university_ug" value={formData.university_ug} onChange={handleChange} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Percentage / CGPA</Label>
                                                    <Input name="percentage_ug" value={formData.percentage_ug} onChange={handleChange} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Work Experience */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2 text-primary border-b pb-2">
                                        <Briefcase className="h-4 w-4" /> Work Experience (Optional)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Organization</Label>
                                            <Input name="organization" value={formData.organization} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Job Title</Label>
                                            <Input name="job_title" value={formData.job_title} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Duration</Label>
                                            <Input name="duration" placeholder="e.g. 6 Months" value={formData.duration} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </CardContent>

                <CardFooter className="flex justify-between p-6 bg-secondary/10 border-t border-border/40">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={step === 1}
                        className="gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>

                    {step < 4 ? (
                        <Button onClick={nextStep} className="gap-2">
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit" form="profile-form" disabled={loading} className="gap-2 min-w-[120px]">
                            {loading ? "Saving..." : "Submit Profile"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}


