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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Search, Users, GraduationCap, Building2, Calendar, Mail, User, Eye, School, BookOpen, CheckCircle2, UserPlus } from 'lucide-react';

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

const AdminAlumniPage = () => {
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

  // Fetch departments with alumni counts
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/alumni/departments');
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
      const response = await fetch('/api/admin/alumni/batches');
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
      const response = await fetch(`/api/admin/alumni/department/${encodeURIComponent(deptName)}/batches`);
      const data = await response.json();
      if (data.success) {
        setDepartmentBatches(data.data);
      }
    } catch (error) {
      console.error('Error fetching department batches:', error);
    }
  };

  // Fetch alumni for a specific department and batch
  const fetchAlumniByDeptBatch = async (deptName: string, batchId: number) => {
    if (!deptName || !batchId) return;
    
    try {
      const response = await fetch(`/api/admin/alumni/department/${encodeURIComponent(deptName)}/batch/${batchId}`);
      const data = await response.json();
      if (data.success) {
        setAlumniData(data.data);
        setTotalAlumni(data.data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching alumni by department and batch:', error);
    }
  };

  // Search alumni with filters
  const searchAlumni = async (page: number = 1) => {
    setLoading(true);
    try {
      let url = `/api/admin/alumni/search?page=${page}&per_page=20`;
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (selectedDepartment) url += `&department=${encodeURIComponent(selectedDepartment)}`;
      if (selectedBatch) url += `&batch_year=${selectedBatch}`;
      
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
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedDepartment && selectedBatch) {
      fetchAlumniByDeptBatch(selectedDepartment, selectedBatch);
    }
  }, [selectedDepartment, selectedBatch]);

  const handleSearch = () => {
    if (searchTerm || selectedDepartment || selectedBatch) {
      searchAlumni(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (searchTerm || selectedDepartment || selectedBatch) {
      searchAlumni(page);
    }
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-department">By Department</TabsTrigger>
          <TabsTrigger value="by-batch">By Batch</TabsTrigger>
          <TabsTrigger value="search-results">Search Results</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <div className="space-y-6">
          {/* Department Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Departments Overview</CardTitle>
              <CardDescription>Total alumni across all departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <Card key={dept.department} className="hover:bg-accent transition-colors cursor-pointer">
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

          {/* Batch Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Batches Overview</CardTitle>
              <CardDescription>All batches with alumni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {batches.map((batch) => (
                  <Card key={batch.batch_id} className="hover:bg-accent transition-colors cursor-pointer">
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

          {/* Search Results Tab Content */}
          {(searchTerm || selectedDepartment || selectedBatch) && (
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
                    {alumniData.map((alumni) => (
                      <TableRow key={alumni.id}>
                        <TableCell className="font-medium">{alumni.admission_number}</TableCell>
                        <TableCell>{alumni.name}</TableCell>
                        <TableCell>{alumni.email}</TableCell>
                        <TableCell>{alumni.department}</TableCell>
                        <TableCell>{alumni.course_name}</TableCell>
                        <TableCell>{alumni.batch_start_year}-{alumni.batch_end_year}</TableCell>
                        <TableCell>{alumni.passout_year}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Alumni Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium">Admission Number</h4>
                                    <p>{alumni.admission_number}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Name</h4>
                                    <p>{alumni.name}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Email</h4>
                                    <p>{alumni.email}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Department</h4>
                                    <p>{alumni.department}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Course</h4>
                                    <p>{alumni.course_name}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Batch</h4>
                                    <p>{alumni.batch_start_year}-{alumni.batch_end_year}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Passout Year</h4>
                                    <p>{alumni.passout_year}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Joined</h4>
                                    <p>{alumni.created_at}</p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
        </div>
      </Tabs>
    </div>
    </DashboardLayout>
  );
};

export default AdminAlumniPage;