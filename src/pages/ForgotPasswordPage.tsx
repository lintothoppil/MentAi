import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotebookLoader } from "@/components/ui/NotebookLoader";
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (!email) {
      alert("Please enter your email address!");
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address!");
      setIsLoading(false);
      return;
    }

    // Simulate forgot password request - will be replaced with actual auth
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const handleResend = () => {
    setIsSubmitted(false);
    setEmail("");
  };

  if (isSubmitted) {
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
          <div className="w-full max-w-md animate-fade-in">
            <Card className="shadow-card border-border/50">
              {/* Success Header */}
              <div className="bg-green-50 border-b border-green-200 rounded-t-lg p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-display text-green-800 mb-1">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-green-700">
                  We've sent a password reset link to your email
                </CardDescription>
              </div>

              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Mail className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                    <p className="text-blue-800 font-medium">Email Sent to:</p>
                    <p className="text-blue-600 font-mono break-all">{email}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      Didn't receive the email? Check your spam folder or:
                    </p>
                    <Button
                      onClick={handleResend}
                      variant="outline"
                      className="w-full"
                    >
                      Resend Email
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Link
                      to="/login/student"
                      className="text-primary hover:text-primary/80 font-medium transition-colors text-sm"
                    >
                      ← Back to Login
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

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
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-card border-border/50">
            {/* Header */}
            <div className={cn(
              "rounded-t-lg p-6 text-center gradient-student"
            )}>
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 text-white">
                <Mail className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-display text-white mb-1">
                Forgot Password?
              </CardTitle>
              <CardDescription className="text-white/80">
                Enter your email and we'll send you a reset link
              </CardDescription>
            </div>

            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-medium">Reset Your Password</CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                  <p className="text-sm text-muted-foreground">
                    We'll send a password reset link to your registered email account
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <NotebookLoader size="sm" className="mr-2 text-current" />
                      Sending Email...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center pt-4 border-t border-border">
                  <Link
                    to="/login/student"
                    className="text-primary hover:text-primary/80 font-medium transition-colors text-sm"
                  >
                    ← Back to Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{" "}
            <Link to="/login/student" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}