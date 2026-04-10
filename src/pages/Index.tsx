import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, BookOpen, Building2, Shield, Brain, BarChart3, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
  {
    title: "Student",
    icon: GraduationCap,
    description: "Track academics, get AI insights, book mentoring sessions",
    gradient: "gradient-student",
  },
  {
    title: "Mentor",
    icon: Users,
    description: "Monitor mentees, schedule sessions, track student progress",
    gradient: "gradient-mentor",
  },
  {
    title: "Subject Handler",
    icon: BookOpen,
    description: "Manage subject performance, upload resources, track assignments",
    gradient: "gradient-handler",
  },
  {
    title: "HOD",
    icon: Building2,
    description: "Department analytics, mentor oversight, escalation handling",
    gradient: "gradient-hod",
  },
  {
    title: "Admin",
    icon: Shield,
    description: "Student approvals, mentor allocation, system configuration",
    gradient: "gradient-admin",
  },
];

const features = [
  { icon: Brain, title: "AI-Powered Insights", desc: "Personalized study plans and performance predictions" },
  { icon: BarChart3, title: "Academic Analytics", desc: "Track attendance, marks, and improvement trends" },
  { icon: Calendar, title: "Smart Scheduling", desc: "Book mentoring sessions with calendar integration" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-accent" />
            <span className="text-xl font-bold text-white">MENTOR-AI</span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-accent/40 bg-transparent text-white hover:bg-accent/20"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate("/register")}
            >
              Register
            </Button>
          </div>
        </nav>

        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-16 text-center md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white md:text-7xl">
              MENTOR-<span className="text-accent">AI</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
              AI-Assisted Academic Mentoring & Performance Analytics for Colleges
            </p>
            <p className="mx-auto mb-10 max-w-xl text-sm text-white/80 font-medium">
              Digital mentoring • Academic tracking • Stress & performance insights — empowering students and educators with intelligent analytics.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base px-8"
              onClick={() => navigate("/login")}
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className="bg-white text-black hover:bg-white/90 text-base px-8 border border-border/20 shadow-sm"
              onClick={() => navigate("/register")}
            >
              Student Registration
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Intelligent Academic Support
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Cards */}
      <section className="bg-secondary/50 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            Built for Every Role
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Dedicated dashboards tailored for each stakeholder in the academic ecosystem.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {roles.map((role, i) => (
              <motion.div
                key={role.title}
                className="group relative overflow-hidden rounded-xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all cursor-pointer"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                onClick={() => navigate("/login")}
              >
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${role.gradient} shadow-md`}>
                  <role.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="mb-2 text-base font-bold text-card-foreground">{role.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-10">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            <span className="font-bold text-foreground">MENTOR-AI</span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            For academic use only. This platform does not provide medical diagnosis or professional counseling.
          </p>
          <p className="text-xs text-muted-foreground">
            Privacy-first approach • All data processed ethically • © {new Date().getFullYear()} MENTOR-AI
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
