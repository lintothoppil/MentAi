/**
 * TanStack Query hooks for Study Plan API.
 * All API calls hit the Flask backend via the Vite proxy.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  DailyTask,
  GeneratePlanPayload,
  PlanStats,
  StudyPlan,
  StudyPlanTemplate,
  UpdateProgressPayload,
  WeeklyPlan,
} from "@/lib/studyPlanTypes";

const BASE = "/api/study-plans";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const studyPlanKeys = {
  all: ["study-plans"] as const,
  studentPlans: (studentId: number) =>
    [...studyPlanKeys.all, "student", studentId] as const,
  plan: (planId: number) => [...studyPlanKeys.all, planId] as const,
  planWeeks: (planId: number) =>
    [...studyPlanKeys.plan(planId), "weeks"] as const,
  weekTasks: (weekId: number) =>
    [...studyPlanKeys.all, "week", weekId, "tasks"] as const,
  planStats: (planId: number) =>
    [...studyPlanKeys.plan(planId), "stats"] as const,
  templates: () => [...studyPlanKeys.all, "templates"] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useStudentPlans(studentId: number) {
  return useQuery({
    queryKey: studyPlanKeys.studentPlans(studentId),
    queryFn: () => fetchJson<StudyPlan[]>(`${BASE}/student/${studentId}`),
    enabled: studentId > 0,
  });
}

export function useStudyPlan(planId: number, includeWeeks = false) {
  return useQuery({
    queryKey: studyPlanKeys.plan(planId),
    queryFn: () =>
      fetchJson<StudyPlan>(
        `${BASE}/${planId}?include_weeks=${includeWeeks}`
      ),
    enabled: planId > 0,
  });
}

export function useWeeklyPlans(planId: number, includeTasks = false) {
  return useQuery({
    queryKey: studyPlanKeys.planWeeks(planId),
    queryFn: () =>
      fetchJson<WeeklyPlan[]>(
        `${BASE}/${planId}/weeks?include_tasks=${includeTasks}`
      ),
    enabled: planId > 0,
  });
}

export function useWeekTasks(weekId: number) {
  return useQuery({
    queryKey: studyPlanKeys.weekTasks(weekId),
    queryFn: () =>
      fetchJson<DailyTask[]>(`${BASE}/weeks/${weekId}/tasks`),
    enabled: weekId > 0,
  });
}

export function usePlanStats(planId: number) {
  return useQuery({
    queryKey: studyPlanKeys.planStats(planId),
    queryFn: () => fetchJson<PlanStats>(`${BASE}/${planId}/stats`),
    enabled: planId > 0,
  });
}

export function useStudyPlanTemplates() {
  return useQuery({
    queryKey: studyPlanKeys.templates(),
    queryFn: () => fetchJson<StudyPlanTemplate[]>(`${BASE}/templates`),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useGeneratePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeneratePlanPayload) =>
      fetchJson<StudyPlan>(
        `${BASE}/generate`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: (plan) => {
      qc.invalidateQueries({
        queryKey: studyPlanKeys.studentPlans(plan.student_id),
      });
    },
  });
}

export function useUpdateTaskProgress(weekId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number;
      payload: UpdateProgressPayload;
    }) =>
      fetchJson<DailyTask>(`${BASE}/tasks/${taskId}/progress`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyPlanKeys.weekTasks(weekId) });
    },
  });
}

export function useAdaptPlan(planId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<StudyPlan>(`${BASE}/${planId}/adapt`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyPlanKeys.plan(planId) });
      qc.invalidateQueries({ queryKey: studyPlanKeys.planWeeks(planId) });
      qc.invalidateQueries({ queryKey: studyPlanKeys.planStats(planId) });
    },
  });
}
