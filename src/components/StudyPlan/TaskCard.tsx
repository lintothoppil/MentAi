/**
 * TaskCard – renders a single DailyTask with inline progress update.
 */

import { useState } from "react";
import type { DailyTask, TaskPriority, TaskStatus } from "@/lib/studyPlanTypes";
import { cn, formatMinutes } from "@/lib/utils";

interface TaskCardProps {
  task: DailyTask;
  onProgressUpdate?: (taskId: number, progress: number, actualMinutes?: number, notes?: string) => void;
  readOnly?: boolean;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  skipped: "bg-red-100 text-red-600",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "border-l-gray-300",
  medium: "border-l-yellow-400",
  high: "border-l-orange-500",
  critical: "border-l-red-600",
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export function TaskCard({ task, onProgressUpdate, readOnly = false }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState(task.progress_percentage);
  const [actualMin, setActualMin] = useState(task.actual_minutes);
  const [notes, setNotes] = useState(task.student_notes ?? "");

  const handleSave = () => {
    onProgressUpdate?.(task.id, progress, actualMin, notes);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4 shadow-sm border-l-4",
        PRIORITY_COLORS[task.priority],
        task.status === "completed" && "opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 leading-tight">
            {task.title}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">{task.subject_name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              PRIORITY_BADGE[task.priority]
            )}
          >
            {task.priority}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_COLORS[task.status]
            )}
          >
            {task.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Time info */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>⏱ Est: {formatMinutes(task.estimated_minutes)}</span>
        {task.actual_minutes > 0 && (
          <span>✅ Actual: {formatMinutes(task.actual_minutes)}</span>
        )}
        <span>📅 {task.scheduled_date}</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round(task.progress_percentage)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              task.status === "completed"
                ? "bg-green-500"
                : task.progress_percentage > 0
                ? "bg-blue-500"
                : "bg-gray-300"
            )}
            style={{ width: `${task.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Inline edit form */}
      {!readOnly && (
        <>
          {editing ? (
            <div className="mt-3 space-y-2 border-t pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Progress (%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-xs text-gray-500">{progress}%</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Actual minutes
                </label>
                <input
                  type="number"
                  min={0}
                  value={actualMin}
                  onChange={(e) => setActualMin(Number(e.target.value))}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            task.status !== "completed" && (
              <button
                onClick={() => setEditing(true)}
                className="mt-3 w-full rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                Update Progress
              </button>
            )
          )}
        </>
      )}

      {/* Student notes (read-only display) */}
      {task.student_notes && !editing && (
        <p className="mt-2 text-xs italic text-gray-500 border-t pt-2">
          📝 {task.student_notes}
        </p>
      )}
    </div>
  );
}
