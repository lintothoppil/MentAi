import { useState, useRef, ChangeEvent } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Upload, Download, Eye, FileText, AlertCircle, CheckCircle2, School, Users, BookOpen, GraduationCap, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminAttendancePage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { label: "Overview", icon: <School className="h-4 w-4" />, path: "/dashboard/admin" },
    { label: "Teachers", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/teachers" },
    { label: "Students", icon: <Users className="h-4 w-4" />, path: "/dashboard/admin/students" },
    { label: "Courses", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses" },
    { label: "Batches", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/batches" },
    { label: "Alumni", icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
    { label: "Timetables", icon: <BookOpen className="h-4 w-4" />, path: "/dashboard/admin/timetables" },
    { label: "Attendance", icon: <CheckCircle className="h-4 w-4" />, path: "/dashboard/admin/attendance", isActive: true },
    { label: "Mentorship", icon: <UserPlus className="h-4 w-4" />, path: "/dashboard/admin/mentorship" },
  ];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Please upload a valid CSV or Excel file');
        return;
      }
      
      setFile(selectedFile);
      toast.success(`File selected: ${selectedFile.name}`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('date', format(selectedDate, 'yyyy-MM-dd'));

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Actual upload
      const response = await fetch('http://localhost:5000/api/admin/attendance/daily_upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Attendance uploaded successfully!');
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleDownloadTemplate = () => {
    // Create a CSV template
    const csvContent = `admission_number,h1,h2,h3,h4,h5,h6,h7
ADMISSION001,P,P,P,A,P,P,P
ADMISSION002,A,P,P,P,P,A,P
ADMISSION003,P,P,A,P,P,P,A`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_template.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Template downloaded successfully!');
  };

  return (
    <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Daily Attendance Management</h1>
            <p className="text-muted-foreground">
              Upload daily attendance records for all students
            </p>
          </div>
          <Button onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Card */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload Attendance Records
              </CardTitle>
              <CardDescription>
                Upload a CSV or Excel file with attendance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date">Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="file">Attendance File</Label>
                  <Input 
                    id="file" 
                    type="file" 
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="mt-2 hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full mt-2 justify-start"
                    onClick={triggerFileInput}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {file ? file.name : 'Choose file...'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports CSV, XLS, XLSX formats. Download template for correct format.
                  </p>
                </div>

                {file && (
                  <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {(file.size / 1024).toFixed(2)} KB
                    </Badge>
                  </div>
                )}

                <Button 
                  onClick={handleUpload} 
                  disabled={!file || !selectedDate || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <span>Uploading... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Attendance
                    </>
                  )}
                </Button>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Attendance Format Guide
              </CardTitle>
              <CardDescription>
                How to prepare your attendance file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">File Format</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload CSV or Excel file with columns: <code className="bg-secondary px-1 rounded">admission_number</code>, <code className="bg-secondary px-1 rounded">h1</code> to <code className="bg-secondary px-1 rounded">h7</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Attendance Values</h4>
                    <p className="text-sm text-muted-foreground">
                      Use <code className="bg-secondary px-1 rounded">P</code> for Present, <code className="bg-secondary px-1 rounded">A</code> for Absent, or <code className="bg-secondary px-1 rounded">1</code>/<code className="bg-secondary px-1 rounded">0</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Important Notes</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Ensure all admission numbers are valid</li>
                      <li>File should contain 7 hour columns (h1-h7)</li>
                      <li>Hours represent attendance for each class period</li>
                      <li>Analytics will be updated automatically after upload</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>
              View your recent attendance uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent uploads. Upload your first attendance file above.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAttendancePage;