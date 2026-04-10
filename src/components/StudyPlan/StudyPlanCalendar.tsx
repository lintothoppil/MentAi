/**
 * StudyPlanCalendar
 * =================
 * Weekly calendar view showing DailyTasks grouped by day.
 */

import { useMemo, useState } from "react";
import type { DailyTask, WeeklyPlan } from "@/lib/studyPlanTypes";
import { TaskCard } from "./TaskCard";
import { useUpdateTaskProgress } from "@/hooks/useStudyPlan";

interface Props {
  weeklyPlans: WeeklyPlan[];
  /** Full list of tasks for every week (pre-fetched by parent) */
  allTasks: DailyTask[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoToDisplayDate(iso: string) {
  // Parse date parts explicitly to avoid UTC-vs-local timezone ambiguity
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDayIndex(isoDate: string) {
  // Parse date parts explicitly to avoid UTC midnight shifting to previous day
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return (d.getDay() + 6) % 7; // Mon=0 … Sun=6
}

export function StudyPlanCalendar({ weeklyPlans, allTasks }: Props) {
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);

  const currentWeek = weeklyPlans[selectedWeekIdx];

  const weekTasks = useMemo(
    () =>
      currentWeek
        ? allTasks.filter((t) => t.weekly_plan_id === currentWeek.id)
        : [],
    [allTasks, currentWeek]
  );

  const tasksByDay = useMemo(() => {
    const map: Record<number, DailyTask[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const task of weekTasks) {
      const idx = getDayIndex(task.scheduled_date);
      map[idx].push(task);
    }
    return map;
  }, [weekTasks]);

  const updateProgress = useUpdateTaskProgress(currentWeek?.id ?? 0);

  const handleProgressUpdate = (
    taskId: number,
    progress: number,
    actualMinutes?: number,
    notes?: string
  ) => {
    updateProgress.mutate({ taskId, payload: { progress, actual_minutes: actualMinutes, notes } });
  };

  if (weeklyPlans.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        No weekly plans available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Week selector */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {weeklyPlans.map((wp, idx) => (
          <button
            key={wp.id}
            onClick={() => setSelectedWeekIdx(idx)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              idx === selectedWeekIdx
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Week {wp.week_number}
            <span className="ml-1 opacity-70">{Math.round(wp.completion_percentage)}%</span>
          </button>
        ))}
      </div>

      {currentWeek && (
        <>
          {/* Week header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                Week {currentWeek.week_number}:{" "}
                {isoToDisplayDate(currentWeek.start_date)} –{" "}
                {isoToDisplayDate(currentWeek.end_date)}
              </h3>
              <p className="text-xs text-gray-500">
                {currentWeek.allocated_hours}h allocated ·{" "}
                {currentWeek.actual_hours}h logged ·{" "}
                {Math.round(currentWeek.completion_percentage)}% complete
              </p>
            </div>

            {/* Weekly progress bar */}
            <div className="w-32">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${currentWeek.completion_percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Day columns */}
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((day, dayIdx) => (
              <div key={dayIdx} className="min-w-0">
                <div
                  className={`mb-1.5 text-center text-xs font-semibold py-1 rounded-md ${
                    dayIdx < 5
                      ? "bg-blue-50 text-blue-700"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-1.5">
                  {tasksByDay[dayIdx].length > 0 ? (
                    tasksByDay[dayIdx].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onProgressUpdate={handleProgressUpdate}
                      />
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
                      Free
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Subject hours legend */}
          {Object.keys(currentWeek.subject_hours).length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Subject allocation this week
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(currentWeek.subject_hours).map(
                  ([subj, hours]) => (
                    <span
                      key={subj}
                      className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      {subj}: {hours}h
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
