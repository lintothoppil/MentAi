import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration given in minutes into a human-readable string.
 * Examples: 0 → "0 min", 45 → "45m", 60 → "1h", 90 → "1h 30m"
 */
export function formatMinutes(min: number): string {
  if (min === 0) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
