import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NotebookLoader } from "@/components/ui/NotebookLoader";

const Login = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username, // Send as username (backend handles both)
                    password: password,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Determine role, normalize it, and map faculty to mentor dashboard
                let rawRole = (data.data.role || 'student').toLowerCase().trim();

                // Faculty designations default to mentor Dashboard
                if (['assistant professor', 'associate professor', 'professor', 'faculty', 'teacher'].includes(rawRole)) {
                    rawRole = 'mentor';
                }

                const role = rawRole.replace(/\s+/g, '-');
                data.data.role = role; // Save normalized role

                // Store user data
                localStorage.setItem('user', JSON.stringify(data.data));

                toast({
                    title: "Login successful",
                    description: `Welcome back, ${data.data.name}!`
                });

                let targetRoute = "";
                if (role === 'student') {
                    if (data.data.profile_completed) {
                        targetRoute = "/dashboard/student";
                    } else {
                        toast({
                            title: "Profile Incomplete",
                            description: "Please complete your profile to continue.",
                            duration: 5000
                        });
                        targetRoute = "/complete-profile";
                    }
                } else {
                    targetRoute = `/dashboard/${role}`;
                }

                setIsNavigating(true);
                setTimeout(() => {
                    navigate(targetRoute);
                }, 1500);

            } else {
                toast({
                    title: "Login failed",
                    description: data.message || "Invalid credentials",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Login error:", error);
            toast({
                title: "Connection Error",
                description: "Failed to connect to the server.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen relative overflow-hidden">
            {/* Page Transition/Loading Overlay */}
            {(isNavigating || loading) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
                >
                    <div className="scale-150 mb-8">
                        <NotebookLoader size="lg" />
                    </div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-heading font-medium text-foreground tracking-tight"
                    >
                        {isNavigating ? "Preparing your dashboard..." : "Processing sign in..."}
                    </motion.h2>
                </motion.div>
            )}

            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 gradient-hero relative items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 dot-pattern opacity-20" />
                <motion.div
                    className="relative z-10 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-8 neon-glow">
                        <Brain className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-4xl font-bold text-foreground mb-3 font-heading">
                        MENTOR<span className="gradient-text">-AI</span>
                    </h2>
                    <p className="text-foreground/50 max-w-sm mx-auto leading-relaxed">
                        AI-powered academic mentoring platform. Smart analytics, personalized insights, seamless scheduling.
                    </p>
                </motion.div>
            </div>

            {/* Right Panel */}
            <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2 relative">
                <div className="absolute inset-0 dot-pattern opacity-10" />
                <motion.div
                    className="w-full max-w-sm relative z-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Button
                        variant="ghost"
                        className="mb-8 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground font-heading">Sign In</h1>
                        <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to access your dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <Label htmlFor="username" className="text-foreground/70 text-xs uppercase tracking-wider">Admission Number / Username</Label>
                            <Input
                                id="username"
                                placeholder="Admission No. or Staff ID"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-2 bg-secondary/50 border-border focus:border-primary/50 h-11"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-foreground/70 text-xs uppercase tracking-wider">Password</Label>
                            <div className="relative mt-2">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-secondary/50 border-border focus:border-primary/50 h-11 pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                className="text-primary hover:text-primary/80 text-xs transition-colors"
                                onClick={() => navigate("/forgot-password")}
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-heading font-semibold neon-glow"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        New student?{" "}
                        <button className="text-primary font-medium hover:text-primary/80 transition-colors" onClick={() => navigate("/register")}>
                            Register here
                        </button>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
