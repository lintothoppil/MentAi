import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";

interface TimetableEntry {
    day: string;
    period: number;
    time_slot?: string;
    subject: string;
    handler?: string;
}

interface StudyBlock {
    day: string;
    period: number;
    subject: string;
    duration: string;
    priority: "high" | "medium" | "low";
    recommendation?: string;
}

interface StudyScheduleGridProps {
    timetable: TimetableEntry[];
    studyPlan?: string;
    loading?: boolean;
}

const PERIOD_TIMES: { [key: number]: string } = {
    1: "09:00 - 10:00",
    2: "10:00 - 11:00",
    3: "11:15 - 12:15",
    4: "12:15 - 01:15",
    5: "02:00 - 03:00",
    6: "03:00 - 04:00",
    7: "04:00 - 05:00",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const generateStudyBlocks = (timetable: TimetableEntry[]): StudyBlock[] => {
    const blocks: StudyBlock[] = [];
    
    // Common subjects that need focus
    const subjectPriorities: { [key: string]: "high" | "medium" | "low" } = {
        "DSA": "high", "DBMS": "high", "OS": "high", "ML": "high", "DAA": "high",
        "Data Structures": "high", "Algorithms": "high", "Cloud Comput": "medium",
        "Database": "medium", "Web Dev": "medium", "IoT": "medium",
        "Python": "high", "Data Science": "high", "Lab": "low",
        "Mini Project": "medium", "Seminar": "low", "Revision": "high",
    };

    const recommendations: { [key: string]: string } = {
        "DSA": "🔧 Implement sorting/searching on LeetCode",
        "DBMS": "🗄️ Practice SQL queries and E-R diagrams",
        "OS": "⚙️ Study scheduling & memory management",
        "ML": "🤖 Code ML models in Python/scikit-learn",
        "DAA": "📊 Analyze algorithm complexity & proofs",
        "Data Structures": "🌳 Solve tree & graph problems",
        "Algorithms": "🔀 Focus on sorting & searching",
        "Cloud Comput": "☁️ Review AWS/Azure concepts",
        "Database": "📈 Design normalized schemas",
        "Web Dev": "🎨 Build responsive layouts",
        "IoT": "📡 Explore IoT protocols & applications",
        "Python": "🐍 Practice OOP & automation scripts",
        "Data Science": "📉 Work on EDA & visualizations",
        "Lab": "💻 Complete practical exercises",
        "Mini Project": "🚀 Implement project requirements",
        "Seminar": "🎤 Prepare presentation materials",
        "Revision": "✅ Review previous concepts",
    };

    // Get all subjects from timetable
    const subjectsInTimetable = [...new Set(timetable.map(t => t.subject))];
    
    // Distribute study blocks across free slots (max 2 per day, different subjects)
    const studiedSubjectsPerDay: { [key: string]: string[] } = {};
    
    DAYS.forEach(day => {
        studiedSubjectsPerDay[day] = [];
        
        // Get all classes for this day
        const classesThisDay = timetable.filter(
            t => t.day.toLowerCase() === day.toLowerCase()
        );
        
        if (classesThisDay.length === 0) return;
        
        // Find free periods and prioritize study blocks
        let studyBlocksAdded = 0;
        
        for (let period = 1; period <= PERIODS.length; period++) {
            if (studyBlocksAdded >= 2) break; // Max 2 study blocks per day
            
            const hasClass = classesThisDay.some(c => c.period === period);
            if (hasClass) continue;
            
            // Pick next subject to study (that hasn't been studied today)
            const availableSubjects = classesThisDay
                .map(c => c.subject)
                .filter((s, i, arr) => arr.indexOf(s) === i && !studiedSubjectsPerDay[day].includes(s));
            
            if (availableSubjects.length > 0) {
                const subject = availableSubjects[0];
                const priority = subjectPriorities[subject] || "medium";
                
                blocks.push({
                    day,
                    period,
                    subject,
                    duration: "1 hour",
                    priority,
                    recommendation: recommendations[subject],
                });
                
                studiedSubjectsPerDay[day].push(subject);
                studyBlocksAdded++;
            }
        }
    });

    return blocks.sort((a, b) => {
        // Sort by priority then by day order
        const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
        const dayOrder: { [key: string]: number } = {
            Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4
        };
        
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return dayOrder[a.day] - dayOrder[b.day];
    });
};

export function StudyScheduleGrid({ 
    timetable, 
    studyPlan,
    loading = false 
}: StudyScheduleGridProps) {
    const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);

    useEffect(() => {
        const blocks = generateStudyBlocks(timetable);
        setStudyBlocks(blocks);
    }, [timetable]);

    const getColorForPriority = (priority: string): string => {
        switch (priority) {
            case "high":
                return "bg-red-500/20 border-red-500/30 text-red-300";
            case "medium":
                return "bg-amber-500/20 border-amber-500/30 text-amber-300";
            default:
                return "bg-green-500/20 border-green-500/30 text-green-300";
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case "high":
                return <AlertCircle className="h-4 w-4" />;
            case "medium":
                return <Clock className="h-4 w-4" />;
            default:
                return <CheckCircle2 className="h-4 w-4" />;
        }
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center py-12">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                    </motion.div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Time-Based Grid View */}
            <div className="overflow-hidden bg-slate-50/50 dark:bg-slate-900/20 border-b border-border">
                <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                    {DAYS.map((day, dayIdx) => {
                        const dayClasses = timetable.filter(t => t.day.toLowerCase() === day.toLowerCase());
                        const dayStudyBlocks = studyBlocks.filter(b => b.day === day);
                        
                        return (
                            <div key={day} className="space-y-2">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">{day}</h4>
                                <div className="grid grid-cols-7 gap-1">
                                    {PERIODS.map(period => {
                                        const classEntry = dayClasses.find(c => c.period === period);
                                        const studyBlock = dayStudyBlocks.find(b => b.period === period);

                                        return (
                                            <div
                                                key={period}
                                                className={`
                                                    h-8 rounded-[4px] border transition-all cursor-pointer flex items-center justify-center text-[10px]
                                                    ${classEntry 
                                                        ? "bg-indigo-600/20 border-indigo-600/40 text-indigo-800 dark:text-indigo-400 font-black" 
                                                        : studyBlock 
                                                        ? `border-dashed ${studyBlock.priority === 'high' 
                                                            ? 'bg-red-500/20 border-red-500/40 text-red-700' 
                                                            : 'bg-amber-500/20 border-amber-500/40 text-amber-700'}`
                                                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                    }
                                                `}
                                                title={classEntry?.subject || studyBlock?.subject || "Free"}
                                            >
                                                {classEntry ? "L" : studyBlock ? "S" : ""}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 flex flex-wrap gap-5 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-indigo-600 shadow-sm" /> <span className="text-[11px] text-slate-900 dark:text-slate-100 font-black">Class</span></div>
                    <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-600 shadow-sm" /> <span className="text-[11px] text-slate-900 dark:text-slate-100 font-black">Priority Study</span></div>
                    <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-slate-400 shadow-sm" /> <span className="text-[11px] text-slate-900 dark:text-slate-100 font-black">Free</span></div>
                    <div className="ml-auto flex items-center gap-1.5"><span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-black">L</span> <span className="text-[11px] text-slate-900 dark:text-slate-100 font-black">Lecture</span></div>
                    <div className="flex items-center gap-1.5"><span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-black italic">S</span> <span className="text-[11px] text-slate-900 dark:text-slate-100 font-black">Study Session</span></div>
                </div>
            </div>

            {/* Compact Recommendations */}
            <div className="px-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    <h3 className="font-black text-[11px] uppercase tracking-wider text-slate-900 dark:text-slate-50">Focus Units</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {studyBlocks.slice(0, 4).map((block, idx) => (
                        <Card key={idx} className="p-2 border-0 bg-white dark:bg-slate-900 ring-1 ring-border shadow-md">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-slate-900 dark:text-slate-50 truncate pr-1">{block.subject}</span>
                                <span className={`h-1.5 w-1.5 rounded-full ${block.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                            </div>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">{block.day} · P{block.period}</p>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default StudyScheduleGrid;
