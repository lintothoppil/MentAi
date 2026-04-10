/**
 * StudentStudyPlanPage
 * ====================
 * Main study plan interface — combines form, calendar, progress tracker,
 * and AI recommendations into a single tabbed page.
 */

import { useState } from "react";
import {
  AdaptiveRecommendations,
  GenerateStudyPlanForm,
  StudyPlanCalendar,
  StudyPlanProgressTracker,
} from "@/components/StudyPlan";
import {
  usePlanStats,
  useStudentPlans,
  useStudyPlan,
  useWeeklyPlans,
} from "@/hooks/useStudyPlan";

// In a real app this comes from auth context / route params
const DEMO_STUDENT_ID = 1;

type Tab = "generate" | "calendar" | "progress" | "insights";

export function StudentStudyPlanPage() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const { data: plans, isLoading: plansLoading } = useStudentPlans(DEMO_STUDENT_ID);
  const { data: selectedPlan } = useStudyPlan(selectedPlanId ?? 0);
  const { data: weeklyPlans } = useWeeklyPlans(selectedPlanId ?? 0, true);
  const { data: planStats } = usePlanStats(selectedPlanId ?? 0);

  const allTasks = weeklyPlans?.flatMap((wp) => wp.daily_tasks ?? []) ?? [];

  const handlePlanGenerated = (planId: number) => {
    setSelectedPlanId(planId);
    setActiveTab("calendar");
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "generate", label: "Generate Plan", icon: "✨" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "progress", label: "Progress", icon: "📊" },
    { id: "insights", label: "AI Insights", icon: "💡" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📚 Study Plan
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Personalised adaptive learning schedule
              </p>
            </div>

            {/* Plan selector */}
            {!plansLoading && (plans?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 shrink-0">
                  Active plan:
                </label>
                <select
                  value={selectedPlanId ?? ""}
                  onChange={(e) =>
                    setSelectedPlanId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">— Select a plan —</option>
                  {plans!.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tabs */}
          <nav className="mt-4 flex gap-1 border-b border-gray-200 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "generate" && (
          <div className="max-w-2xl mx-auto">
            <GenerateStudyPlanForm
              studentId={DEMO_STUDENT_ID}
              onSuccess={handlePlanGenerated}
            />
          </div>
        )}

        {activeTab === "calendar" && (
          <>
            {!selectedPlanId ? (
              <EmptyState
                message="Select or generate a plan to view the calendar."
                action={() => setActiveTab("generate")}
                actionLabel="Generate a plan"
              />
            ) : !weeklyPlans ? (
              <LoadingState />
            ) : (
              <StudyPlanCalendar
                weeklyPlans={weeklyPlans}
                allTasks={allTasks}
              />
            )}
          </>
        )}

        {activeTab === "progress" && (
          <>
            {!selectedPlanId ? (
              <EmptyState
                message="Select a plan to view progress analytics."
                action={() => setActiveTab("generate")}
                actionLabel="Generate a plan"
              />
            ) : !planStats ? (
              <LoadingState />
            ) : (
              <StudyPlanProgressTracker
                planId={selectedPlanId}
                stats={planStats}
              />
            )}
          </>
        )}

        {activeTab === "insights" && (
          <>
            {!selectedPlan ? (
              <EmptyState
                message="Select a plan to view AI recommendations."
                action={() => setActiveTab("generate")}
                actionLabel="Generate a plan"
              />
            ) : (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  AI Insights & Recommendations
                </h2>
                <AdaptiveRecommendations
                  insights={selectedPlan.ai_insights}
                />

                {/* Subject overview */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Subject Breakdown
                  </h3>
                  <div className="space-y-2">
                    {selectedPlan.subjects.map((subj) => (
                      <div
                        key={subj.name}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
                      >
                        <div>
                          <span className="font-medium text-gray-800">
                            {subj.name}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {subj.credit_hours} credits
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Difficulty: {(subj.difficulty ?? 0.5).toFixed(1)}
                          </span>
                          <span>
                            Avg score: {subj.avg_score?.toFixed(0) ?? "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function EmptyState({
  message,
  action,
  actionLabel,
}: {
  message: string;
  action: () => void;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      <button
        onClick={action}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}
