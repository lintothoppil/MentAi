import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, GraduationCap, Users, BookOpen, Building2, Shield, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { clearStoredSession, normalizeRole, persistUserSession } from "@/lib/authSession";

type RoleType = "student" | "mentor" | "subject-handler" | "hod" | "admin";

interface RoleConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  placeholder: {
    email: string;
    password: string;
  };
}

const roleConfigs: Record<RoleType, RoleConfig> = {
  student: {
    title: "Student Login",
    description: "Access your personalized study plans, track performance, and connect with mentors",
    icon: <GraduationCap className="w-8 h-8" />,
    gradient: "gradient-student",
    placeholder: {
      email: "student@college.edu",
      password: "Enter your password",
    },
  },
  mentor: {
    title: "Mentor Login",
    description: "View assigned students, track their progress, and provide guidance",
    icon: <Users className="w-8 h-8" />,
    gradient: "gradient-mentor",
    placeholder: {
      email: "mentor@college.edu",
      password: "Enter your password",
    },
  },
  "subject-handler": {
    title: "Subject Handler Login",
    description: "Manage subject-specific interventions and student support materials",
    icon: <BookOpen className="w-8 h-8" />,
    gradient: "gradient-handler",
    placeholder: {
      email: "faculty@college.edu",
      password: "Enter your password",
    },
  },
  hod: {
    title: "HOD Login",
    description: "Access department-wide analytics and oversight dashboards",
    icon: <Building2 className="w-8 h-8" />,
    gradient: "gradient-hod",
    placeholder: {
      email: "hod@college.edu",
      password: "Enter your password",
    },
  },
  admin: {
    title: "Administrator Login",
    description: "System configuration, user management, and governance controls",
    icon: <Shield className="w-8 h-8" />,
    gradient: "gradient-admin",
    placeholder: {
      email: "admin@college.edu",
      password: "Enter your password",
    },
  },
};

export default function LoginPage() {
  const { role } = useParams<{ role: RoleType }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessLoading, setIsSuccessLoading] = useState(false);
  const [mentorLoginAs, setMentorLoginAs] = useState<"mentor" | "faculty">("mentor");

  const validRole = role && roleConfigs[role as RoleType] ? (role as RoleType) : "student";
  const config = roleConfigs[validRole];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admission_number: validRole === 'student' ? email : undefined,
          username: validRole !== 'student' ? email : undefined,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const role = normalizeRole(data.data.role);
        data.data.role = role;

        clearStoredSession();
        persistUserSession({ ...data.data, role });

        setIsSuccessLoading(true);
        setTimeout(() => {
          let dashPath = `/dashboard/${role}`;

          if (validRole === 'mentor' && mentorLoginAs === 'faculty') {
            dashPath = '/dashboard/faculty';
          }

          if (role === 'student' && !data.data.profile_completed) {
            navigate('/complete-profile');
          } else {
            navigate(dashPath);
          }
        }, 2000);
      } else {
        alert(data.message || "Login failed");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to connect to server");
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
        {/* Transition Overlay */}
        {isSuccessLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in transition-all">
            <NotebookLoader size="lg" className="mb-6 scale-150" />
            <h2 className="text-2xl font-display font-medium text-foreground mt-8 animate-pulse text-glow">
              Preparing your dashboard...
            </h2>
          </div>
        )}
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
          <div className="w-full max-w-md animate-fade-in">
            <Card className="shadow-card border-border/50">
              {/* Role Badge */}
              <div className={cn(
                "rounded-t-lg p-6 text-center",
                config.gradient
              )}>
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 text-white">
                  {config.icon}
                </div>
                <CardTitle className="text-2xl font-display text-white mb-1">
                  {config.title}
                </CardTitle>
                <CardDescription className="text-white/80">
                  {config.description}
                </CardDescription>
              </div>

              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-medium">Sign in to your account</CardTitle>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {validRole === "student" ? "Admission Number" : "Email Address"}
                    </Label>
                    <Input
                      id="email"
                      type={validRole === "student" ? "text" : "email"}
                      placeholder={validRole === "student" ? "e.g. A24CS001" : config.placeholder.email}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={config.placeholder.password}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

                  {validRole === "mentor" && (
                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-medium">Log in as:</Label>
                      <RadioGroup
                        value={mentorLoginAs}
                        onValueChange={(val) => setMentorLoginAs(val as "mentor" | "faculty")}
                        className="flex flex-col space-y-1"
                      >
                        <div
                          className={`flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50 cursor-pointer transition-colors ${mentorLoginAs === 'mentor' ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => setMentorLoginAs("mentor")}
                        >
                          <RadioGroupItem value="mentor" id="r1" />
                          <Label htmlFor="r1" className="cursor-pointer flex-1 font-normal">Mentor (Manage Mentees)</Label>
                        </div>
                        <div
                          className={`flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50 cursor-pointer transition-colors ${mentorLoginAs === 'faculty' ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => setMentorLoginAs("faculty")}
                        >
                          <RadioGroupItem value="faculty" id="r2" />
                          <Label htmlFor="r2" className="cursor-pointer flex-1 font-normal">Faculty (My Timetable Only)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <NotebookLoader size="sm" className="mr-2 text-current" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  {validRole === "student" && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      New student?{" "}
                      <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
                        Register here
                      </Link>
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Help Text */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Having trouble logging in?{" "}
              <Link to="/support" className="text-primary hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
