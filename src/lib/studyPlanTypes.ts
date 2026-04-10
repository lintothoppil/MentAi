/** Shared TypeScript types for the Study Plan module. */

export type PlanStatus = "active" | "completed" | "archived" | "paused";
export type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface SubjectInput {
  name: string;
  credit_hours: number;
  difficulty?: number;
  deadline?: string;
}

export interface SubjectEnriched extends SubjectInput {
  avg_score: number;
  performance_factor: number;
  weight: number;
}

export interface StudyPlanTemplate {
  id: number;
  name: string;
  description: string;
  subject_config: SubjectInput[];
  duration_weeks: number;
  daily_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyTask {
  id: number;
  weekly_plan_id: number;
  subject_name: string;
  title: string;
  description: string;
  scheduled_date: string;
  estimated_minutes: number;
  actual_minutes: number;
  status: TaskStatus;
  priority: TaskPriority;
  progress_percentage: number;
  student_notes: string | null;
  resources: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlan {
  id: number;
  study_plan_id: number;
  week_number: number;
  start_date: string;
  end_date: string;
  allocated_hours: number;
  actual_hours: number;
  completion_percentage: number;
  subject_hours: Record<string, number>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  daily_tasks?: DailyTask[];
}

export interface AiInsights {
  weak_subjects: string[];
  high_difficulty_subjects: string[];
  top_allocated_subject: string | null;
  recommendations: string[];
  generated_at: string;
}

export interface StudyPlan {
  id: number;
  student_id: number;
  template_id: number | null;
  title: string;
  description: string;
  status: PlanStatus;
  start_date: string;
  end_date: string;
  total_weekly_hours: number;
  subjects: SubjectEnriched[];
  overall_progress: number;
  ai_insights: AiInsights;
  created_at: string;
  updated_at: string;
  weekly_plans?: WeeklyPlan[];
}

export interface GeneratePlanPayload {
  student_id: number;
  title: string;
  start_date: string;
  end_date: string;
  weekly_hours: number;
  subjects: SubjectInput[];
  description?: string;
  stress_level?: number;
  academic_history?: Array<{ subject: string; score: number; semester: string }>;
  template_id?: number;
}

export interface UpdateProgressPayload {
  progress: number;
  actual_minutes?: number;
  notes?: string;
}

export interface PlanStats {
  plan_id: number;
  overall_progress: number;
  task_summary: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    skipped: number;
    completion_rate: number;
  };
  time_summary: {
    total_estimated_hours: number;
    total_actual_hours: number;
    efficiency_ratio: number;
  };
  subject_stats: Record<
    string,
    {
      total: number;
      completed: number;
      estimated_minutes: number;
      actual_minutes: number;
    }
  >;
  weekly_progress: Array<{
    week: number;
    completion: number;
    allocated_hours: number;
    actual_hours: number;
  }>;
}
