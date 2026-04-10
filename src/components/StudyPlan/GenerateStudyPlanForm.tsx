/**
 * GenerateStudyPlanForm
 * =====================
 * Form for creating a new personalised study plan.
 * Submits to POST /api/study-plans/generate via the useGeneratePlan mutation.
 */

import { useState } from "react";
import type { GeneratePlanPayload, SubjectInput } from "@/lib/studyPlanTypes";
import { useGeneratePlan } from "@/hooks/useStudyPlan";
import { cn } from "@/lib/utils";

interface Props {
  studentId: number;
  onSuccess?: (planId: number) => void;
}

const PRESET_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Programming",
  "Data Structures",
  "Algorithms",
  "Operating Systems",
  "Database Management",
  "Computer Networks",
  "Software Engineering",
  "English",
];

const todayStr = new Date().toISOString().split("T")[0];
const fourMonthsLater = new Date();
fourMonthsLater.setMonth(fourMonthsLater.getMonth() + 4);
const defaultEndStr = fourMonthsLater.toISOString().split("T")[0];

export function GenerateStudyPlanForm({ studentId, onSuccess }: Props) {
  const generateMutation = useGeneratePlan();

  // Form state
  const [title, setTitle] = useState("My Semester Study Plan");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(defaultEndStr);
  const [weeklyHours, setWeeklyHours] = useState(20);
  const [stressLevel, setStressLevel] = useState(5);
  const [subjects, setSubjects] = useState<SubjectInput[]>([
    { name: "Mathematics", credit_hours: 4 },
  ]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCredits, setNewSubjectCredits] = useState(3);
  const [newSubjectDifficulty, setNewSubjectDifficulty] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    if (subjects.find((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setError("Subject already added.");
      return;
    }
    const subj: SubjectInput = { name, credit_hours: newSubjectCredits };
    if (newSubjectDifficulty !== "") subj.difficulty = newSubjectDifficulty;
    setSubjects((prev) => [...prev, subj]);
    setNewSubjectName("");
    setNewSubjectCredits(3);
    setNewSubjectDifficulty("");
    setError(null);
  };

  const removeSubject = (idx: number) => {
    setSubjects((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (subjects.length === 0) {
      setError("Please add at least one subject.");
      return;
    }

    const payload: GeneratePlanPayload = {
      student_id: studentId,
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      weekly_hours: weeklyHours,
      stress_level: stressLevel,
      subjects,
    };

    generateMutation.mutate(payload, {
      onSuccess: (plan) => onSuccess?.(plan.id),
      onError: (err) => setError((err as Error).message),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Generate Study Plan
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details to generate a personalised adaptive study plan.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plan Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Weekly hours & stress */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Available Hours / Week: <strong>{weeklyHours}h</strong>
          </label>
          <input
            type="range"
            min={5}
            max={60}
            step={1}
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>5h</span><span>60h</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Stress Level: <strong>{stressLevel}/10</strong>
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={stressLevel}
            onChange={(e) => setStressLevel(Number(e.target.value))}
            className={cn(
              "w-full",
              stressLevel >= 7
                ? "accent-red-500"
                : stressLevel >= 5
                ? "accent-yellow-500"
                : "accent-green-500"
            )}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>Low</span><span>High</span>
          </div>
        </div>
      </div>

      {/* Subjects section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Enrolled Subjects ({subjects.length})
        </h3>

        {/* Existing subjects */}
        <ul className="mb-3 space-y-2">
          {subjects.map((s, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-800">{s.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {s.credit_hours} credits
                  {s.difficulty !== undefined && ` · difficulty ${s.difficulty}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubject(idx)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Add subject */}
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Add subject</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-32">
              <input
                type="text"
                list="subject-suggestions"
                placeholder="Subject name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <datalist id="subject-suggestions">
                {PRESET_SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <input
              type="number"
              min={1}
              max={6}
              value={newSubjectCredits}
              onChange={(e) => setNewSubjectCredits(Number(e.target.value))}
              placeholder="Credits"
              className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={newSubjectDifficulty}
              onChange={(e) =>
                setNewSubjectDifficulty(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="Difficulty 0–1"
              className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={addSubject}
              className="rounded bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={generateMutation.isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generateMutation.isPending
          ? "Generating plan…"
          : "Generate Study Plan"}
      </button>
    </form>
  );
}
