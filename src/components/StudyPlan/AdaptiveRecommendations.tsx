/**
 * AdaptiveRecommendations
 * ========================
 * Displays AI-generated insights and actionable recommendations stored
 * on the study plan's ai_insights field.
 */

import type { AiInsights } from "@/lib/studyPlanTypes";

interface Props {
  insights: AiInsights;
}

export function AdaptiveRecommendations({ insights }: Props) {
  const hasContent =
    insights.recommendations.length > 0 ||
    insights.weak_subjects.length > 0 ||
    insights.high_difficulty_subjects.length > 0;

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        🎉 Great job! No specific concerns detected in your study plan.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
            <span>💡</span> AI Recommendations
          </h4>
          <ul className="space-y-2">
            {insights.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-blue-800"
              >
                <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weak subjects */}
      {insights.weak_subjects.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-1.5">
            <span>⚠️</span> Subjects needing extra attention
          </h4>
          <div className="flex flex-wrap gap-2">
            {insights.weak_subjects.map((subj) => (
              <span
                key={subj}
                className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
              >
                {subj}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-orange-700">
            Past performance below 50% — additional time has been allocated.
          </p>
        </div>
      )}

      {/* High difficulty */}
      {insights.high_difficulty_subjects.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-1.5">
            <span>🧠</span> High-difficulty subjects
          </h4>
          <div className="flex flex-wrap gap-2">
            {insights.high_difficulty_subjects.map((subj) => (
              <span
                key={subj}
                className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
              >
                {subj}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-purple-700">
            These subjects require longer, focused study sessions.
          </p>
        </div>
      )}

      {/* Top subject */}
      {insights.top_allocated_subject && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          📌 Most hours allocated to:{" "}
          <strong>{insights.top_allocated_subject}</strong>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Generated at {new Date(insights.generated_at).toLocaleString()}
      </p>
    </div>
  );
}
