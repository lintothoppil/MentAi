/**
 * StudyPlanProgressTracker
 * =========================
 * Dashboard with charts, stats, and per-subject progress metrics.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import type { PlanStats } from "@/lib/studyPlanTypes";
import { useAdaptPlan } from "@/hooks/useStudyPlan";

interface Props {
  planId: number;
  stats: PlanStats;
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  in_progress: "#3b82f6",
  pending: "#d1d5db",
  skipped: "#ef4444",
};

export function StudyPlanProgressTracker({ planId, stats }: Props) {
  const adaptMutation = useAdaptPlan(planId);

  const taskPieData = [
    { name: "Completed", value: stats.task_summary.completed },
    { name: "In Progress", value: stats.task_summary.in_progress },
    { name: "Pending", value: stats.task_summary.pending },
    { name: "Skipped", value: stats.task_summary.skipped },
  ].filter((d) => d.value > 0);

  const subjectBarData = Object.entries(stats.subject_stats).map(
    ([subject, s]) => ({
      subject: subject.length > 12 ? subject.slice(0, 12) + "…" : subject,
      fullName: subject,
      completion:
        s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      estimatedHours: +(s.estimated_minutes / 60).toFixed(1),
      actualHours: +(s.actual_minutes / 60).toFixed(1),
    })
  );

  const weeklyLineData = stats.weekly_progress.map((wp) => ({
    name: `W${wp.week}`,
    completion: wp.completion,
    allocated: wp.allocated_hours,
    actual: wp.actual_hours,
  }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Overall Progress"
          value={`${Math.round(stats.overall_progress)}%`}
          sub={`${stats.task_summary.completed}/${stats.task_summary.total} tasks`}
          color="blue"
        />
        <KpiCard
          label="Completion Rate"
          value={`${stats.task_summary.completion_rate}%`}
          sub="of started tasks"
          color="green"
        />
        <KpiCard
          label="Hours Logged"
          value={`${stats.time_summary.total_actual_hours}h`}
          sub={`of ${stats.time_summary.total_estimated_hours}h planned`}
          color="indigo"
        />
        <KpiCard
          label="Efficiency"
          value={`${(stats.time_summary.efficiency_ratio * 100).toFixed(0)}%`}
          sub="actual vs estimated"
          color={stats.time_summary.efficiency_ratio >= 0.8 ? "green" : "yellow"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Task distribution pie */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Task Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={taskPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {taskPieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name.toLowerCase().replace(" ", "_")] ?? "#8b5cf6"}
                  />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly completion line */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Weekly Completion Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="completion"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Completion %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject breakdown bar chart */}
      {subjectBarData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Subject-wise Progress
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectBarData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val, name) => [`${val}`, name]}
                labelFormatter={(label) =>
                  subjectBarData.find((d) => d.subject === label)?.fullName ??
                  label
                }
              />
              <Bar dataKey="completion" name="Completion %" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {subjectBarData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly hours bar */}
      {weeklyLineData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Allocated vs Actual Hours per Week
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip />
              <Bar dataKey="allocated" name="Allocated" fill="#dbeafe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Adapt plan button */}
      <div className="flex justify-end">
        <button
          onClick={() => adaptMutation.mutate()}
          disabled={adaptMutation.isPending}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        >
          {adaptMutation.isPending ? "Recalculating…" : "🔄 Adapt Plan"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------
interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "green" | "indigo" | "yellow" | "red";
}

const COLOR_MAP: Record<KpiCardProps["color"], string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-900",
  green: "bg-green-50 border-green-200 text-green-900",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
  red: "bg-red-50 border-red-200 text-red-900",
};

function KpiCard({ label, value, sub, color }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${COLOR_MAP[color]}`}
    >
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs opacity-60">{sub}</p>
    </div>
  );
}
