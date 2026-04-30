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
  DialogTrigger,
} from '@/components/ui/dialog';

import { Search, Users, GraduationCap, Building2, Calendar, Mail, User, Eye, School, BookOpen, CheckCircle2, UserPlus } from 'lucide-react';

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

  const openAlumniDetails = (alumni: Alumni) => {
    setSelectedAlumniRecord(alumni);
    setDetailsOpen(true);
    fetchAlumniNotes(alumni.admission_number);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alumni Details</DialogTitle>
            <DialogDescription>
              Mentor-private notes are shown here only after the student has been transferred to alumni.
            </DialogDescription>
          </DialogHeader>
          {selectedAlumniRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Admission Number</h4>
                  <p>{selectedAlumniRecord.admission_number}</p>
                </div>
                <div>
                  <h4 className="font-medium">Name</h4>
                  <p>{selectedAlumniRecord.name}</p>
                </div>
                <div>
                  <h4 className="font-medium">Email</h4>
                  <p>{selectedAlumniRecord.email}</p>
                </div>
                <div>
                  <h4 className="font-medium">Department</h4>
                  <p>{selectedAlumniRecord.department}</p>
                </div>
                <div>
                  <h4 className="font-medium">Course</h4>
                  <p>{selectedAlumniRecord.course_name}</p>
                </div>
                <div>
                  <h4 className="font-medium">Batch</h4>
                  <p>{selectedAlumniRecord.batch_start_year}-{selectedAlumniRecord.batch_end_year}</p>
                </div>
                <div>
                  <h4 className="font-medium">Passout Year</h4>
                  <p>{selectedAlumniRecord.passout_year}</p>
                </div>
                <div>
                  <h4 className="font-medium">Joined</h4>
                  <p>{selectedAlumniRecord.created_at}</p>
                </div>
              </div>
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium">Transferred Mentor Notes</h4>
                {loadingNotes ? (
                  <p className="text-sm text-muted-foreground">Loading mentor archive...</p>
                ) : alumniNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transferred mentor notes found for this alumni record.</p>
                ) : (
                  alumniNotes.map((note) => (
                    <div key={note.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <Badge variant="outline" className="capitalize">{note.note_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {note.created_at ? new Date(note.created_at).toLocaleString('en-IN') : 'Unknown time'}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{note.mentor_name}</p>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
};

export default AdminAlumniPage;
