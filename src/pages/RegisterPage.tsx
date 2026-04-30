import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, GraduationCap, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    admissionNumber: "",
    department: "",
    batch: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "admissionNumber") {
      // Basic parsing logic: A24CS001
      // A - Constant
      // 24 - Year (Batch)
      // CS - Dept
      // 001 - Roll No
      const upperValue = value.toUpperCase();
      let dept = "";
      let batch = "";

      // Simple regex to extract parts
      const match = upperValue.match(/^A(\d{2})([A-Z]+)(\d{3})$/);

      if (match) {
        const year = match[1];
        const deptCode = match[2];
        const startYear = parseInt(`20${year}`);

        let duration = 4; // Default B.Tech
        if (deptCode === 'IMCA') duration = 5;
        else if (deptCode === 'MCA' || deptCode === 'MBA') duration = 2;

        batch = `${startYear}-${startYear + duration}`;

        const deptMap: Record<string, string> = {
          "CS": "Computer Science and Engineering (CSE)",
          "CY": "Computer Science and Engineering (CSE)",
          "AD": "Computer Science and Engineering (CSE)", // AI & Data Science
          "EC": "Electronics and Communication Engineering (ECE)",
          "EEE": "Electrical and Electronics Engineering (EEE)",
          "ECM": "Electronics and Computer Engineering (ECM)",
          "MBA": "Department of Business Administration",
          "MCA": "Department of Computer Applications",
          "IMCA": "Department of Computer Applications",
          "ME": "Mechanical Engineering (ME)",
          "CE": "Civil Engineering (CE)"
        };

        dept = deptMap[deptCode] || deptCode;
      }

      setFormData(prev => ({
        ...prev,
        admissionNumber: upperValue,
        department: dept,
        batch: batch
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters long!");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          admission_number: formData.admissionNumber,
          email: formData.email,
          password: formData.password,
          // department is auto-detected by backend too, but we send basic info
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        alert("Registration successful! Please login.");
        navigate("/login");
      } else {
        // Error from backend
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Failed to connect to the server. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl animate-fade-in">
          <Card className="shadow-card border-border/50">
            {/* Header */}
            <div className={cn(
              "rounded-t-lg p-6 text-center gradient-student"
            )}>
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 text-white">
                <GraduationCap className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-display text-white mb-1">
                Student Registration
              </CardTitle>
              <CardDescription className="text-white/80">
                Create your account to access mentoring services
              </CardDescription>
            </div>

            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-medium">Create your account</CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admissionNumber">Admission Number *</Label>
                  <Input
                    id="admissionNumber"
                    name="admissionNumber"
                    type="text"
                    placeholder="e.g. A24CS001"
                    value={formData.admissionNumber}
                    onChange={handleChange}
                    required
                    className="h-11 uppercase"
                  />
                  {formData.department && (
                    <p className="text-xs text-muted-foreground mt-1 animate-fade-in">
                      Detected: {formData.department} (Batch {formData.batch})
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      readOnly
                      className="bg-muted h-11"
                      placeholder="Auto-detected"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batch">Batch Year</Label>
                    <Input
                      id="batch"
                      name="batch"
                      value={formData.batch}
                      readOnly
                      className="bg-muted h-11"
                      placeholder="Auto-detected"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <NotebookLoader size="sm" className="mr-2 text-current" />
                      Creating Account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground pt-2">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Sign in here
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            By registering, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </main>
    </div>
  );
}