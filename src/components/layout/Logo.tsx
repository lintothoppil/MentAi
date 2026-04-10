import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
};

export function Logo({ variant = "dark", size = "md", className }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-foreground";
  const accentColor = variant === "light" ? "text-white/90" : "text-primary";
  
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo Icon */}
      <div className={cn(
        "relative flex items-center justify-center rounded-xl",
        sizeClasses[size],
        size === "sm" ? "w-8" : size === "md" ? "w-10" : "w-14",
        variant === "light" 
          ? "bg-white/20 backdrop-blur-sm" 
          : "gradient-hero"
      )}>
        <svg 
          className={cn(
            "w-1/2 h-1/2",
            variant === "light" ? "text-white" : "text-white"
          )} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        {/* AI Sparkle */}
        <div className={cn(
          "absolute -top-1 -right-1 w-3 h-3 rounded-full",
          variant === "light" ? "bg-accent" : "bg-accent"
        )}>
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/60"></span>
        </div>
      </div>
      
      {/* Logo Text */}
      <div className="flex flex-col">
        <span className={cn(
          "font-display font-bold tracking-tight leading-none",
          textColor,
          size === "sm" ? "text-lg" : size === "md" ? "text-xl" : "text-2xl"
        )}>
          MENTOR<span className={accentColor}>-AI</span>
        </span>
        {size !== "sm" && (
          <span className={cn(
            "text-[10px] tracking-wider uppercase",
            variant === "light" ? "text-white/70" : "text-muted-foreground"
          )}>
            Academic Mentoring System
          </span>
        )}
      </div>
    </div>
  );
}