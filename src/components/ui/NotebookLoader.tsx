import React from "react";
import { cn } from "@/lib/utils";

interface NotebookLoaderProps {
    className?: string;
    size?: "sm" | "md" | "lg";
}

export function NotebookLoader({ className, size = "md" }: NotebookLoaderProps) {
    const sizeMap = {
        sm: "scale-[0.6]",
        md: "scale-100",
        lg: "scale-150",
    };

    return (
        <div
            className={cn(
                "premium-notebook-loader inline-flex items-center justify-center -ml-1 mr-2",
                sizeMap[size],
                className
            )}
        >
            <div className="book">
                <div className="page page-5"></div>
                <div className="page page-4"></div>
                <div className="page page-3"></div>
                <div className="page page-2"></div>
                <div className="page page-1"></div>
                <div className="front-cover"></div>
                <div className="back-cover"></div>
                <div className="spine"></div>
            </div>
        </div>
    );
}
