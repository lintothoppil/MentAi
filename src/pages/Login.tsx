import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
import { clearStoredSession, normalizeRole, persistUserSession } from "@/lib/authSession";

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
                const role = normalizeRole(data.data.role);
                data.data.role = role; // Save normalized role

                clearStoredSession();
                persistUserSession({ ...data.data, role });

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
                        className="text-2xl font-black text-slate-800 tracking-tight"
                    >
                        {isNavigating ? "Entering Dashboard..." : "Securely Signing in..."}
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
                    <div className="h-24 w-24 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center mx-auto mb-10 border border-white/20 shadow-2xl">
                        <Brain className="h-12 w-12 text-white" />
                    </div>
                    <h2 className="text-5xl font-black text-white mb-4 font-heading tracking-tighter">
                        Ment<span className="text-indigo-400">Ai</span>
                    </h2>
                    <p className="text-white/70 text-lg font-medium max-w-sm mx-auto leading-relaxed">
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

                    <div className="mb-10">
                        <h1 className="text-4xl font-black text-slate-800 font-heading tracking-tight">Sign In</h1>
                        <p className="mt-2 text-slate-500 font-semibold italic">Welcome to the future of academic mentoring.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <Label htmlFor="username" className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2 block">Admission Number / Username</Label>
                            <Input
                                id="username"
                                placeholder="Admission No. or Staff ID"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-2 bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 h-12 rounded-xl font-bold transition-all"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2 block">Password</Label>
                            <div className="relative mt-2">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 h-12 pr-12 rounded-xl font-bold transition-all"
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
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-black text-base shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Access Dashboard"}
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
