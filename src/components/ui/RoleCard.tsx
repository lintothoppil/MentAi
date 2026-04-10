import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface RoleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
  variant: "student" | "mentor" | "subject" | "hod" | "admin";
  delay?: number;
}

const variantStyles = {
  student: "gradient-student hover:shadow-[0_12px_32px_-8px_hsl(199_89%_48%_/_0.3)]",
  mentor: "gradient-mentor hover:shadow-[0_12px_32px_-8px_hsl(152_69%_40%_/_0.3)]",
  subject: "gradient-subject hover:shadow-[0_12px_32px_-8px_hsl(280_65%_55%_/_0.3)]",
  hod: "gradient-hod hover:shadow-[0_12px_32px_-8px_hsl(38_92%_50%_/_0.3)]",
  admin: "gradient-admin hover:shadow-[0_12px_32px_-8px_hsl(217_91%_35%_/_0.3)]",
};

export function RoleCard({ title, description, icon, to, variant, delay = 0 }: RoleCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300",
        "text-white shadow-card hover:shadow-card-hover hover:scale-[1.02] hover:-translate-y-1",
        "animate-slide-up",
        variantStyles[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg mb-1">{title}</h3>
      <p className="text-white/80 text-sm text-center">{description}</p>
      
      {/* Hover arrow indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}