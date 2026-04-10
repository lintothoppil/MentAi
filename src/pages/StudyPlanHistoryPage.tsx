/**
 * StudyPlanHistoryPage
 * ====================
 * View of past and archived study plans with their stats.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PlanStatus, StudyPlan } from "@/lib/studyPlanTypes";
import { useStudentPlans } from "@/hooks/useStudyPlan";
import { cn } from "@/lib/utils";

const DEMO_STUDENT_ID = 1;

const STATUS_STYLE: Record<PlanStatus, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-600",
  paused: "bg-yellow-100 text-yellow-700",
};

interface PlanCardProps {
  plan: StudyPlan;
  onView: (id: number) => void;
}

function PlanCard({ plan, onView }: PlanCardProps) {
  const durationDays = Math.round(
    (new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{plan.title}</h3>
          {plan.description && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
              {plan.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
            STATUS_STYLE[plan.status]
          )}
        >
          {plan.status}
        </span>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
        <span>📅 {plan.start_date} → {plan.end_date}</span>
        <span>⏱ {durationDays} days</span>
        <span>⚡ {plan.total_weekly_hours}h/week</span>
        <span>📚 {plan.subjects.length} subjects</span>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Overall progress</span>
          <span className="font-medium">{Math.round(plan.overall_progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              plan.status === "completed" ? "bg-blue-500" : "bg-green-500"
            )}
            style={{ width: `${plan.overall_progress}%` }}
          />
        </div>
      </div>

      {/* Subjects chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {plan.subjects.slice(0, 5).map((s) => (
          <span
            key={s.name}
            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
          >
            {s.name}
          </span>
        ))}
        {plan.subjects.length > 5 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            +{plan.subjects.length - 5} more
          </span>
        )}
      </div>

      <button
        onClick={() => onView(plan.id)}
        className="mt-4 w-full rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
      >
        View Plan →
      </button>
    </div>
  );
}

export function StudyPlanHistoryPage() {
  const { data: plans, isLoading, isError } = useStudentPlans(DEMO_STUDENT_ID);
  const [filterStatus, setFilterStatus] = useState<PlanStatus | "all">("all");
  const navigate = useNavigate();

  const filtered =
    filterStatus === "all"
      ? plans ?? []
      : (plans ?? []).filter((p) => p.status === filterStatus);

  const handleView = (planId: number) => {
    navigate(`/?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-gray-900">
            📋 Study Plan History
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            All your past and current study plans
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          {(["all", "active", "completed", "paused", "archived"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  filterStatus === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {s}
              </button>
            )
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load study plans. Please try again.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500 text-sm mb-4">
              {filterStatus === "all"
                ? "No study plans yet. Generate your first plan!"
                : `No ${filterStatus} plans found.`}
            </p>
            <a
              href="/study-plans"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to Study Plan
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onView={handleView} />
          ))}
        </div>
      </div>
    </div>
  );
}
