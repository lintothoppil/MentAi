import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import { Search, Users, GraduationCap, Building2, Calendar, Mail, User, Eye, School, BookOpen, CheckCircle2, UserPlus, ClipboardList, TrendingUp } from 'lucide-react';

const API_BASE = "http://localhost:5000";

interface Alumni {
  id: number;
  admission_number: string;
  name: string;
  email: string;
  department: string;
  course_name: string;
  batch_start_year: number;
  batch_end_year: number;
  passout_year: number;
  created_at: string;
}

interface Department {
  department: string;
  alumni_count: number;
}

interface Batch {
  batch_id: number;
  course_name: string;
  start_year: number;
  end_year: number;
  alumni_count: number;
}

interface DepartmentBatch {
  batch_id: number;
  start_year: number;
  end_year: number;
  alumni_count: number;
  status: string;
}

interface AlumniMentorNote {
  id: number;
  mentor_name: string;
  note_type: string;
  content: string;
  created_at: string | null;
  transferred_at: string | null;
}

interface AlumniDetails {
  summary: {
    admission_number: string;
    name: string;
    email: string;
    department: string;
    course_name: string;
    batch_start_year: number | null;
    batch_end_year: number | null;
    passout_year: number | null;
    alumni_since: string | null;
    student_status: string;
    mentor_name: string | null;
  };
  profile: {
    roll_number: string | null;
    date_of_birth: string | null;
    age: number | null;
    blood_group: string | null;
    mobile_number: string | null;
    religion: string | null;
    diocese: string | null;
    parish: string | null;
    caste_category: string | null;
    permanent_address: string | null;
    contact_address: string | null;
    photo_path: string | null;
    mentor_remarks: string | null;
    profile_completed: boolean;
  };
  academics: {
    cgpa: number | null;
    sgpa: number | null;
    tenth_school: string | null;
    tenth_board: string | null;
    tenth_percentage: number | null;
    twelfth_school: string | null;
    twelfth_board: string | null;
    twelfth_percentage: number | null;
    ug_college: string | null;
    ug_university: string | null;
    ug_percentage: number | null;
    medium_of_instruction: string | null;
    entrance_rank: string | null;
    nature_of_admission: string | null;
    verified_university_results: number;
    total_university_results: number;
    internal_mark_records: number;
  };
  mentoring: {
    mentor_history: Array<{
      mentor_id: number | null;
      mentor_name: string;
      start_date: string | null;
      end_date: string | null;
      created_at: string | null;
    }>;
    sessions: Array<{
      id: number;
      mentor_name: string;
      date: string | null;
      time_slot: string | null;
      slot_type: string | null;
      session_type: string | null;
      status: string | null;
      meeting_link: string | null;
      notes: string | null;
      absence_reason: string | null;
      created_at: string | null;
    }>;
  };
  family: {
    father_name: string | null;
    father_profession: string | null;
    father_mobile: string | null;
    mother_name: string | null;
    mother_profession: string | null;
    mother_mobile: string | null;
    guardian_name: string | null;
    guardian_mobile: string | null;
    guardian_address: string | null;
  };
  campus_life: {
    accommodation_type: string | null;
    staying_with: string | null;
    hostel_name: string | null;
    stay_from: string | null;
    stay_to: string | null;
    transport_mode: string | null;
    vehicle_number: string | null;
  };
  performance: {
    attendance_percentage: number | null;
    attended_classes: number;
    total_classes: number;
  };
  experience: Array<{
    organization: string | null;
    job_title: string | null;
    duration: string | null;
  }>;
}

const AdminAlumniPage = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [departmentBatches, setDepartmentBatches] = useState<DepartmentBatch[]>([]);
  const [alumniData, setAlumniData] = useState<Alumni[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAlumni, setTotalAlumni] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alumniNotes, setAlumniNotes] = useState<AlumniMentorNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [selectedAlumniRecord, setSelectedAlumniRecord] = useState<Alumni | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [alumniDetails, setAlumniDetails] = useState<AlumniDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const openAlumniDetails = (alumni: Alumni) => {
    setSelectedAlumniRecord(alumni);
    setAlumniDetails(null);
    setDetailsOpen(true);
    fetchAlumniDetails(alumni.admission_number);
    fetchAlumniNotes(alumni.admission_number);
  };

  const fetchAlumniDetails = async (admissionNumber: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/alumni/${encodeURIComponent(admissionNumber)}/details`);
      const data = await response.json();
      if (data.success) {
        setAlumniDetails(data.data);
      } else {
        setAlumniDetails(null);
      }
    } catch (error) {
      console.error('Error fetching alumni details:', error);
      setAlumniDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchAlumniNotes = async (admissionNumber: string) => {
    setLoadingNotes(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/alumni/${encodeURIComponent(admissionNumber)}/mentor-notes`);
      const data = await response.json();
      if (data.success) {
        setAlumniNotes(data.data);
      } else {
        setAlumniNotes([]);
      }
    } catch (error) {
      console.error('Error fetching alumni mentor notes:', error);
      setAlumniNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Fetch departments with alumni counts
  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/alumni/departments`);
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fetch all batches with alumni counts
  const fetchBatches = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/alumni/batches`);
      const data = await response.json();
      if (data.success) {
        setBatches(data.data);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  // Fetch batches for a specific department
  const fetchDepartmentBatches = async (deptName: string) => {
    if (!deptName) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/alumni/department/${encodeURIComponent(deptName)}/batches`);
      const data = await response.json();
      if (data.success) {
        setDepartmentBatches(data.data);
      }
    } catch (error) {
      console.error('Error fetching department batches:', error);
    }
  };

  const searchAlumni = async (
    page: number = 1,
    overrides?: { searchTerm?: string; department?: string; batchId?: number | null }
  ) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/admin/alumni/search?page=${page}&per_page=20`;
      const effectiveSearchTerm = overrides?.searchTerm ?? searchTerm;
      const effectiveDepartment = overrides?.department ?? selectedDepartment;
      const effectiveBatch = overrides?.batchId ?? selectedBatch;
      
      if (effectiveSearchTerm) url += `&search=${encodeURIComponent(effectiveSearchTerm)}`;
      if (effectiveDepartment) url += `&department=${encodeURIComponent(effectiveDepartment)}`;
      if (effectiveBatch) url += `&batch_id=${effectiveBatch}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setAlumniData(data.data);
        setTotalAlumni(data.pagination.total);
        setTotalPages(data.pagination.pages);
        setCurrentPage(data.pagination.current_page);
      }
    } catch (error) {
      console.error('Error searching alumni:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentBatches(selectedDepartment);
    } else {
      setDepartmentBatches([]);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedDepartment && selectedBatch) {
      setActiveTab('search-results');
      searchAlumni(1);
    }
  }, [selectedDepartment, selectedBatch]);

  const handleSearch = () => {
    if (searchTerm || selectedDepartment || selectedBatch) {
      setActiveTab('search-results');
      searchAlumni(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (searchTerm || selectedDepartment || selectedBatch) {
      searchAlumni(page);
    }
  };

  const handleDepartmentCardClick = async (department: string) => {
    setSelectedDepartment(department);
    setSelectedBatch(null);
    setActiveTab('search-results');
    await fetchDepartmentBatches(department);
    await searchAlumni(1, { department, batchId: null, searchTerm: '' });
  };

  const handleBatchCardClick = async (batch: Batch) => {
    setSelectedDepartment('');
    setDepartmentBatches([]);
    setSelectedBatch(batch.batch_id);
    setActiveTab('search-results');
    await searchAlumni(1, { department: '', batchId: batch.batch_id, searchTerm: '' });
  };

  const navItems = [
    { label: "Overview", icon: <School className="h-4 w-4" />, path: "/dashboard/admin" },
    { label: "Teachers", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/teachers" },
    { label: "Students", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/students" },
    { label: "Courses", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses" },
    { label: "Batches", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/batches" },
    { label: "Alumni", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni", isActive: true },
    { label: "Timetables", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/admin/timetables" },
    { label: "Attendance", icon: <CheckCircle2 className="h-4 w-4" />, path: "/dashboard/admin/attendance" },
    { label: "Mentorship", icon: <UserPlus className="h-4 w-4" />, path: "/dashboard/admin/mentorship" },
  ];

  const formatDate = (value?: string | null) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN');
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
  };

  const displayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return 'Not available';
    return value;
  };

  const isHosteler = (value?: string | null) => (value || '').trim().toLowerCase() === 'hosteler';
  const isDayScholar = (value?: string | null) => (value || '').trim().toLowerCase() === 'day scholar';

  return (
    <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Alumni Management</h1>
            <p className="text-muted-foreground">
              Track and manage alumni by department and batch
            </p>
          </div>
          <Button>
            <GraduationCap className="mr-2 h-4 w-4" />
            Export Alumni Data
          </Button>
        </div>

      {/* Search and Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Alumni</CardTitle>
          <CardDescription>
            Find alumni by department, batch, or search terms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Term</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, Admission No, Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.department} value={dept.department}>
                      {dept.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch</label>
              <Select 
                value={selectedBatch ? selectedBatch.toString() : ""} 
                onValueChange={(value) => setSelectedBatch(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {departmentBatches.map((batch) => (
                    <SelectItem key={batch.batch_id} value={batch.batch_id.toString()}>
                      {batch.start_year}-{batch.end_year} ({batch.alumni_count} alumni)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading} className="w-full">
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-department">By Department</TabsTrigger>
          <TabsTrigger value="by-batch">By Batch</TabsTrigger>
          <TabsTrigger value="search-results">Search Results</TabsTrigger>
        </TabsList>

        {(activeTab === 'overview' || activeTab === 'by-department' || activeTab === 'by-batch') && (
        <div className="space-y-6">
          {/* Department Cards */}
          {(activeTab === 'overview' || activeTab === 'by-department') && (
          <Card>
            <CardHeader>
              <CardTitle>Departments Overview</CardTitle>
              <CardDescription>Total alumni across all departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <Card
                    key={dept.department}
                    className="hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => handleDepartmentCardClick(dept.department)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{dept.department}</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{dept.alumni_count}</span>
                        <Badge variant="secondary">Alumni</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Batch Cards */}
          {(activeTab === 'overview' || activeTab === 'by-batch') && (
          <Card>
            <CardHeader>
              <CardTitle>Batches Overview</CardTitle>
              <CardDescription>All batches with alumni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {batches.map((batch) => (
                  <Card
                    key={batch.batch_id}
                    className="hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => handleBatchCardClick(batch)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{batch.start_year}-{batch.end_year}</CardTitle>
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{batch.course_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold">{batch.alumni_count}</span>
                          <Badge variant="outline">Alumni</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          {activeTab === 'by-department' && selectedDepartment && departmentBatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedDepartment}</CardTitle>
                <CardDescription>Click a batch to view alumni students.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departmentBatches.map((batch) => (
                    <Card
                      key={batch.batch_id}
                      className="hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedBatch(batch.batch_id);
                        setActiveTab('search-results');
                        searchAlumni(1, { department: selectedDepartment, batchId: batch.batch_id, searchTerm: '' });
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{batch.start_year}-{batch.end_year}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <span className="text-xl font-bold">{batch.alumni_count}</span>
                        <Badge variant="outline">Alumni</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          </div>
        )}

          {activeTab === 'search-results' && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Showing {alumniData.length} of {totalAlumni} alumni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Passout Year</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alumniData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No alumni found for the selected department, batch, or search term.
                        </TableCell>
                      </TableRow>
                    )}
                    {alumniData.map((alumni) => (
                      <TableRow key={alumni.id}>
                        <TableCell className="font-medium">{alumni.admission_number}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-medium text-primary hover:underline"
                            onClick={() => openAlumniDetails(alumni)}
                          >
                            {alumni.name}
                          </button>
                        </TableCell>
                        <TableCell>{alumni.email}</TableCell>
                        <TableCell>{alumni.department}</TableCell>
                        <TableCell>{alumni.course_name}</TableCell>
                        <TableCell>{alumni.batch_start_year}-{alumni.batch_end_year}</TableCell>
                        <TableCell>{alumni.passout_year}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openAlumniDetails(alumni)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                      Previous
                    </button>
                    
                    <span className="mx-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alumni Details</DialogTitle>
            <DialogDescription>
              Complete alumni profile with transferred student, mentoring, and academic data.
            </DialogDescription>
          </DialogHeader>
          {selectedAlumniRecord && (
            <div className="space-y-6">
              {loadingDetails ? (
                <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Loading alumni profile...
                </div>
              ) : alumniDetails ? (
                <>
                  <div className="rounded-2xl border bg-gradient-to-r from-slate-50 via-white to-slate-100 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <GraduationCap className="h-7 w-7" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold">{alumniDetails.summary.name}</h3>
                            <p className="text-sm text-muted-foreground">{alumniDetails.summary.admission_number}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{alumniDetails.summary.department}</Badge>
                          <Badge variant="outline">{alumniDetails.summary.course_name}</Badge>
                          <Badge variant="secondary">Passout {displayValue(alumniDetails.summary.passout_year)}</Badge>
                          <Badge variant="outline">{alumniDetails.summary.student_status}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm md:min-w-[260px]">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{displayValue(alumniDetails.summary.email)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Batch {displayValue(alumniDetails.summary.batch_start_year)}-{displayValue(alumniDetails.summary.batch_end_year)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>Mentor {displayValue(alumniDetails.summary.mentor_name)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">CGPA</p>
                            <p className="text-2xl font-bold">{displayValue(alumniDetails.academics.cgpa)}</p>
                          </div>
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">SGPA</p>
                            <p className="text-2xl font-bold">{displayValue(alumniDetails.academics.sgpa)}</p>
                          </div>
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance</p>
                            <p className="text-2xl font-bold">
                              {alumniDetails.performance.attendance_percentage !== null ? `${alumniDetails.performance.attendance_percentage}%` : 'Not available'}
                            </p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Mentoring Sessions</p>
                            <p className="text-2xl font-bold">{alumniDetails.mentoring.sessions.length}</p>
                          </div>
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle>Student Profile</CardTitle>
                        <CardDescription>Transferred core student record and contact details</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div><p className="text-xs text-muted-foreground">Roll Number</p><p className="font-medium">{displayValue(alumniDetails.profile.roll_number)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Mobile Number</p><p className="font-medium">{displayValue(alumniDetails.profile.mobile_number)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Date of Birth</p><p className="font-medium">{formatDate(alumniDetails.profile.date_of_birth)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Blood Group</p><p className="font-medium">{displayValue(alumniDetails.profile.blood_group)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Religion</p><p className="font-medium">{displayValue(alumniDetails.profile.religion)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Caste Category</p><p className="font-medium">{displayValue(alumniDetails.profile.caste_category)}</p></div>
                        <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Permanent Address</p><p className="font-medium">{displayValue(alumniDetails.profile.permanent_address)}</p></div>
                        <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Contact Address</p><p className="font-medium">{displayValue(alumniDetails.profile.contact_address)}</p></div>
                        <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Mentor Remarks</p><p className="font-medium whitespace-pre-wrap">{displayValue(alumniDetails.profile.mentor_remarks)}</p></div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Family & Campus Life</CardTitle>
                        <CardDescription>Parent, guardian, hostel, and travel details</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Parents</p>
                          <p className="font-medium">{displayValue(alumniDetails.family.father_name)} / {displayValue(alumniDetails.family.mother_name)}</p>
                          <p className="text-sm text-muted-foreground">{displayValue(alumniDetails.family.father_profession)} / {displayValue(alumniDetails.family.mother_profession)}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground">Guardian</p>
                          <p className="font-medium">{displayValue(alumniDetails.family.guardian_name)}</p>
                          <p className="text-sm text-muted-foreground">{displayValue(alumniDetails.family.guardian_mobile)}</p>
                          <p className="text-sm text-muted-foreground">{displayValue(alumniDetails.family.guardian_address)}</p>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Accommodation</p>
                          <p className="font-medium">{displayValue(alumniDetails.campus_life.accommodation_type)}</p>
                          {isHosteler(alumniDetails.campus_life.accommodation_type) && (
                            <p className="text-sm text-muted-foreground">Hostel: {displayValue(alumniDetails.campus_life.hostel_name)}</p>
                          )}
                          {isDayScholar(alumniDetails.campus_life.accommodation_type) && (
                            <>
                              <p className="text-sm text-muted-foreground">Staying With: {displayValue(alumniDetails.campus_life.staying_with)}</p>
                              <p className="text-sm text-muted-foreground">Transport: {displayValue(alumniDetails.campus_life.transport_mode)}</p>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle>Academic Snapshot</CardTitle>
                        <CardDescription>Course performance and pre-admission background</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div><p className="text-xs text-muted-foreground">10th</p><p className="font-medium">{displayValue(alumniDetails.academics.tenth_school)}</p><p className="text-sm text-muted-foreground">{displayValue(alumniDetails.academics.tenth_percentage)}%</p></div>
                          <div><p className="text-xs text-muted-foreground">12th</p><p className="font-medium">{displayValue(alumniDetails.academics.twelfth_school)}</p><p className="text-sm text-muted-foreground">{displayValue(alumniDetails.academics.twelfth_percentage)}%</p></div>
                          <div><p className="text-xs text-muted-foreground">UG College</p><p className="font-medium">{displayValue(alumniDetails.academics.ug_college)}</p></div>
                          <div><p className="text-xs text-muted-foreground">UG Percentage</p><p className="font-medium">{displayValue(alumniDetails.academics.ug_percentage)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Admission Type</p><p className="font-medium">{displayValue(alumniDetails.academics.nature_of_admission)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Medium</p><p className="font-medium">{displayValue(alumniDetails.academics.medium_of_instruction)}</p></div>
                        </div>
                        <Separator />
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-muted/40 p-3">
                            <p className="text-xs text-muted-foreground">Verified Results</p>
                            <p className="text-xl font-semibold">{alumniDetails.academics.verified_university_results}</p>
                          </div>
                          <div className="rounded-xl bg-muted/40 p-3">
                            <p className="text-xs text-muted-foreground">University Records</p>
                            <p className="text-xl font-semibold">{alumniDetails.academics.total_university_results}</p>
                          </div>
                          <div className="rounded-xl bg-muted/40 p-3">
                            <p className="text-xs text-muted-foreground">Internal Mark Rows</p>
                            <p className="text-xl font-semibold">{alumniDetails.academics.internal_mark_records}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Mentoring Details</CardTitle>
                        <CardDescription>Mentor history and mentoring session timeline</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div>
                          <p className="mb-3 text-sm font-medium">Mentor History</p>
                          {alumniDetails.mentoring.mentor_history.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No mentor history available.</p>
                          ) : (
                            <div className="space-y-3">
                              {alumniDetails.mentoring.mentor_history.map((item, index) => (
                                <div key={`${item.mentor_id ?? 'unknown'}-${index}`} className="rounded-xl border p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium">{item.mentor_name}</p>
                                    <Badge variant="outline">History</Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatDate(item.start_date)} to {formatDate(item.end_date)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Separator />
                        <div>
                          <p className="mb-3 text-sm font-medium">Mentoring Sessions</p>
                          {alumniDetails.mentoring.sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No mentoring sessions found.</p>
                          ) : (
                            <div className="space-y-3">
                              {alumniDetails.mentoring.sessions.slice(0, 8).map((session) => (
                                <div key={session.id} className="rounded-xl border p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium">{session.mentor_name}</p>
                                    <Badge variant="secondary">{displayValue(session.status)}</Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatDate(session.date)} at {displayValue(session.time_slot)} • {displayValue(session.session_type)}
                                  </p>
                                  {session.notes && (
                                    <p className="mt-2 text-sm whitespace-pre-wrap">{session.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Transferred Mentor Notes</CardTitle>
                      <CardDescription>Private mentor notes visible after alumni transfer</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {loadingNotes ? (
                        <p className="text-sm text-muted-foreground">Loading mentor archive...</p>
                      ) : alumniNotes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No transferred mentor notes found for this alumni record.</p>
                      ) : (
                        alumniNotes.map((note) => (
                          <div key={note.id} className="rounded-xl border p-4">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">{note.note_type}</Badge>
                                <span className="text-sm font-medium">{note.mentor_name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Unable to load alumni details for this record.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
};

export default AdminAlumniPage;
