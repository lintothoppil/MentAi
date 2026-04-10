import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users, School, BookOpen, UserPlus, RefreshCcw, CheckCircle2, AlertCircle,
    ArrowLeft, GraduationCap, Calendar, TrendingUp, Loader2, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────────────────────────────────
// Semester + Batch helpers (all computed from calendar date)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exact semester an active batch is currently in.
 * 2 semesters per year: Jan–Jun → odd sem, Jul–Dec → even sem.
 *
 * March 2026 examples
 *  BTech 2022-2026 : yearsElapsed=4, semInYear=1 → sem=9 → capped → 8 (FINAL)
 *  BTech 2023-2027 : yearsElapsed=3 → sem=7
 *  MCA   2024-2026 : yearsElapsed=2 → sem=5 → capped → 4 (FINAL)
 *  MCA   2025-2027 : yearsElapsed=1 → sem=3
 */
const calcCurrentSem = (startYear: number, durationYears: number): number => {
    const now = new Date();
    const yearsElapsed = now.getFullYear() - startYear;
    const semInYear = now.getMonth() < 6 ? 1 : 2; // 0-indexed month
    if (yearsElapsed < 0) return 1;
    const raw = yearsElapsed * 2 + semInYear;
    return Math.min(raw, durationYears * 2);
};

/** True when the batch is sitting in its final semester right now. */
const isLastSem = (startYear: number, durationYears: number): boolean =>
    calcCurrentSem(startYear, durationYears) >= durationYears * 2;

// ─────────────────────────────────────────────────────────────────────────────
// Active batch lists per department type (as of 2026)
// Rules:
//   BTech  4yr  8 sems : start years 2022→2025  (4 active, 2022 is final)
//   MCA    2yr  4 sems : start years 2024→2025  (2 active, 2024 is final)
//   MBA    2yr  4 sems : same as MCA
//   IMCA   5yr 10 sems : start from 2024 onward  (1 batch so far)
// ─────────────────────────────────────────────────────────────────────────────

interface BatchInfo {
    label: string;
    startYear: number;
    endYear: number;
    course: string;
    durationYears: number;
    currentSem: number;
    maxSem: number;
    isFinal: boolean;
}

const buildActiveBatches = (department: string): BatchInfo[] => {
    const d = department.toUpperCase();
    const now = new Date().getFullYear(); // 2026

    const makeBatch = (
        startYear: number,
        duration: number,
        course: string,
        labelPrefix = ''
    ): BatchInfo => {
        const endYear   = startYear + duration;
        const curSem    = calcCurrentSem(startYear, duration);
        const maxSem    = duration * 2;
        const label     = labelPrefix
            ? `${labelPrefix} ${startYear}-${endYear}`
            : `${startYear}-${endYear}`;
        return { label, startYear, endYear, course, durationYears: duration, currentSem: curSem, maxSem, isFinal: curSem >= maxSem };
    };

    const isCA  = d.includes('COMPUTER APPLICATIONS');
    const isMBA = d.includes('MBA') || d.includes('BUSINESS ADMINISTRATION') || d.includes('BUSINESS');

    if (isCA) {
        const batches: BatchInfo[] = [];
        // MCA  2yr, max 2 concurrent: starts 2024 & 2025
        for (let y = now - 2; y <= now - 1; y++) {
            batches.push(makeBatch(y, 2, 'MCA', 'MCA'));
        }
        // IMCA 5yr: first batch 2024 only (still in sem 5 of 10)
        batches.push(makeBatch(2024, 5, 'IMCA', 'IMCA'));
        return batches;
    }

    if (isMBA) {
        const batches: BatchInfo[] = [];
        for (let y = now - 2; y <= now - 1; y++) {
            batches.push(makeBatch(y, 2, 'MBA'));
        }
        return batches;
    }

    // Default: B.Tech 4yr, max 4 concurrent: starts 2022→2025
    const batches: BatchInfo[] = [];
    for (let y = now - 4; y <= now - 1; y++) {
        batches.push(makeBatch(y, 4, 'BTech'));
    }
    return batches;
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MentorStats {
    id: number;
    name: string;
    designation: string;
    batch_mentee_count: number;
    total_load: number;
    mentees: { admission_number: string; name: string; batch: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AdminMentorshipPage = () => {
    const [viewMode, setViewMode] = useState<'dept' | 'batch' | 'mentorship'>('dept');
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [allocating, setAllocating] = useState(false);
    const [promotingAll, setPromotingAll] = useState(false);
    const [promotingBatch, setPromotingBatch] = useState<string | null>(null); // batch label

    const [mentors, setMentors] = useState<MentorStats[]>([]);
    const [unassignedCount, setUnassignedCount] = useState(0);

    const navItems = [
        { label: "Overview",   icon: <School className="h-4 w-4" />,        path: "/dashboard/admin" },
        { label: "Teachers",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/teachers" },
        { label: "Students",   icon: <Users className="h-4 w-4" />,         path: "/dashboard/admin/students" },
        { label: "Courses",    icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/courses" },
        { label: "Batches",    icon: <Calendar className="h-4 w-4" />,      path: "/dashboard/admin/batches" },
        { label: "Alumni",     icon: <GraduationCap className="h-4 w-4" />, path: "/dashboard/admin/alumni" },
        { label: "Timetables", icon: <BookOpen className="h-4 w-4" />,      path: "/dashboard/admin/timetables" },
        { label: "Attendance", icon: <CheckCircle2 className="h-4 w-4" />,  path: "/dashboard/admin/attendance" },
        { label: "Mentorship", icon: <UserPlus className="h-4 w-4" />,      path: "/dashboard/admin/mentorship", isActive: true },
    ];

    const departments = [
        'Department of Computer Applications',
        'Computer Science and Engineering (CSE)',
        'Mechanical Engineering (ME)',
        'Civil Engineering (CE)',
        'Electrical and Electronics Engineering (EEE)',
        'Electronics and Communication Engineering (ECE)',
        'Electronics and Computer Engineering (ECM)',
        'Department of Business Administration',
        'Basic Sciences & Humanities',
    ];


    // ── fetch mentor view ─────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        if (!selectedDept) return;
        setLoading(true);
        try {
            let url = `http://localhost:5000/api/admin/mentorship/view?department=${encodeURIComponent(selectedDept)}`;
            if (selectedBatch) url += `&batch=${encodeURIComponent(selectedBatch)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setMentors(data.data);
                setUnassignedCount(data.unassigned_count);
            }
        } catch {
            toast.error("Failed to fetch mentorship stats");
        } finally {
            setLoading(false);
        }
    }, [selectedDept, selectedBatch]);

    useEffect(() => {
        if (viewMode === 'mentorship') fetchStats();
    }, [viewMode, fetchStats]);

    // ── auto-allocate ────────────────────────────────────────────
    const handleAllocate = async () => {
        const msg = selectedBatch
            ? `Re-distribute students of ${selectedBatch} among mentors?`
            : "Re-distribute ALL students in this department among mentors?";
        if (!confirm(msg)) return;
        setAllocating(true);
        try {
            const res = await fetch("http://localhost:5000/api/admin/mentorship/allocate", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: selectedDept, batch: selectedBatch })
            });
            const data = await res.json();
            data.success ? toast.success(data.message) : toast.error(data.message);
            if (data.success) fetchStats();
        } catch { toast.error("Allocation failed"); }
        finally { setAllocating(false); }
    };

    // ── Promote a single batch (next sem or alumni) ───────────────
    const handlePromoteBatch = async (batch: BatchInfo) => {
        const isFinal = batch.isFinal;
        const confirmMsg = isFinal
            ? `Promote batch "${batch.label}" (Sem ${batch.currentSem}/${batch.maxSem} — FINAL) to Alumni?\n\nAll students will be moved to the Alumni section.`
            : `Advance batch "${batch.label}" from Sem ${batch.currentSem} → Sem ${batch.currentSem + 1}?\n\n(Semester is calendar-based; this will be recorded as acknowledged.)`;

        if (!confirm(confirmMsg)) return;
        setPromotingBatch(batch.label);

        try {
            const res = await fetch("http://localhost:5000/api/admin/semester/promote-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    batch_label:    batch.label,
                    department:     selectedDept ?? '',
                    duration_years: batch.durationYears,
                })
            });
            const data = await res.json();
            if (data.success) {
                if (data.to_alumni) {
                    toast.success(`🎓 ${data.message}`);
                    window.dispatchEvent(new CustomEvent('refreshAlumni'));
                } else {
                    toast.success(`📆 ${data.message}`);
                }
            } else {
                toast.error(data.message || "Promotion failed");
            }
        } catch { toast.error("Promotion request failed"); }
        finally { setPromotingBatch(null); }
    };

    // ── Promote ALL final-sem batches across all departments ───────
    const handlePromoteAll = async () => {
        if (!confirm(
            "Promote ALL departments' final-semester batches to Alumni?\n\n" +
            "• MCA 2024-2026 (Sem 4/4) → Alumni\n" +
            "• MBA 2024-2026 (Sem 4/4) → Alumni\n" +
            "• BTech 2022-2026 (Sem 8/8) → Alumni\n\n" +
            "New 2026 intake batches will be created automatically."
        )) return;

        setPromotingAll(true);
        try {
            const res = await fetch("http://localhost:5000/api/admin/semester/promote-all", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (data.success) {
                const newInfo = data.new_batches?.length
                    ? `\n\nNew batches: ${data.new_batches.join(', ')}`
                    : '';
                toast.success(`${data.message}${newInfo}`);
                window.dispatchEvent(new CustomEvent('refreshAlumni'));
            } else {
                toast.error(data.message || "Promotion failed");
            }
        } catch { toast.error("Promote-all request failed"); }
        finally { setPromotingAll(false); }
    };

    // ══════════════════════════════════════════════════════════════
    // VIEW: Department selection
    // ══════════════════════════════════════════════════════════════
    const renderDeptView = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mentorship Allocation</h2>
                    <p className="text-muted-foreground text-sm mt-1">Select a department to manage batches and mentors.</p>
                </div>
                <Button
                    onClick={handlePromoteAll}
                    disabled={promotingAll}
                    className="bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow"
                >
                    {promotingAll
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <TrendingUp className="h-4 w-4 mr-2" />}
                    Promote All Final Batches → Alumni
                </Button>
            </div>

            {/* Current sem quick-reference */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Current Semester Reference — March 2026</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-blue-700 dark:text-blue-300">
                    <div>BTech 2022–2026 → <span className="font-bold text-orange-600">Sem 8/8 (FINAL)</span></div>
                    <div>MCA   2024–2026 → <span className="font-bold text-orange-600">Sem 4/4 (FINAL)</span></div>
                    <div>BTech 2023–2027 → Sem 7/8</div>
                    <div>MCA   2025–2027 → Sem 3/4</div>
                    <div>BTech 2024–2028 → Sem 5/8</div>
                    <div>MBA   2024–2026 → <span className="font-bold text-orange-600">Sem 4/4 (FINAL)</span></div>
                    <div>BTech 2025–2029 → Sem 3/8</div>
                    <div>MBA   2025–2027 → Sem 3/4</div>
                    <div>IMCA  2024–2029 → Sem 5/10</div>
                </div>
            </div>

            {/* Department cards */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {departments.map(dept => {
                    const batches  = buildActiveBatches(dept);
                    const finals   = batches.filter(b => b.isFinal);
                    return (
                        <Card
                            key={dept}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
                            onClick={() => { setSelectedDept(dept); setViewMode('batch'); }}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors leading-snug">
                                        {dept}
                                    </CardTitle>
                                    {finals.length > 0 && (
                                        <Badge className="bg-orange-500 text-white shrink-0">
                                            {finals.length} Final
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground">
                                {batches.length} active batch{batches.length !== 1 ? 'es' : ''} · Click to manage
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════
    // VIEW: Batch selection + per-batch promote button
    // ══════════════════════════════════════════════════════════════
    const renderBatchView = () => {
        const batches = selectedDept ? buildActiveBatches(selectedDept) : [];

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <Button variant="outline" onClick={() => { setSelectedDept(null); setViewMode('dept'); }}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">{selectedDept}</h2>
                        <p className="text-muted-foreground text-sm">Select a batch to manage • Use "Promote" to advance semester or graduate final batches</p>
                    </div>
                </div>

                {/* ALL BATCHES shortcut */}
                <Button
                    variant="outline"
                    className="w-full h-12 text-base border-dashed border-2"
                    onClick={() => { setSelectedBatch(null); setViewMode('mentorship'); }}
                >
                    <Users className="h-4 w-4 mr-2" /> View All Batches — Mentor Overview
                </Button>

                <div className="grid gap-4 md:grid-cols-2">
                    {batches.map((batch) => {
                        const isProcessing = promotingBatch === batch.label;
                        const semColor = batch.isFinal
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-primary';
                        const semLabel = batch.isFinal
                            ? `Semester ${batch.currentSem} / ${batch.maxSem} — FINAL`
                            : `Semester ${batch.currentSem} / ${batch.maxSem}`;
                        const promoteLabel = batch.isFinal
                            ? `Graduate → Alumni (Sem ${batch.currentSem}/${batch.maxSem})`
                            : `Promote → Sem ${batch.currentSem + 1}`;

                        return (
                            <Card
                                key={batch.label}
                                className={`transition-all border-2 ${
                                    batch.isFinal
                                        ? 'border-orange-400/60 bg-orange-50/40 dark:bg-orange-900/10'
                                        : 'border-transparent'
                                }`}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-lg font-bold">{batch.label}</CardTitle>
                                            <p className={`text-sm font-medium mt-0.5 ${semColor}`}>
                                                {semLabel}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {batch.course} · {batch.durationYears}-year programme
                                            </p>
                                        </div>
                                        {batch.isFinal && (
                                            <Badge className="bg-orange-500 text-white shrink-0 mt-0.5">
                                                Final Sem
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="flex flex-col gap-2 pt-0">
                                    {/* Mentor management */}
                                    <Button
                                        variant="secondary"
                                        className="w-full justify-start"
                                        onClick={() => { setSelectedBatch(batch.label); setViewMode('mentorship'); }}
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        Manage Mentors
                                    </Button>

                                    {/* Promote to next sem / alumni */}
                                    <Button
                                        variant={batch.isFinal ? "default" : "outline"}
                                        className={`w-full justify-start ${
                                            batch.isFinal
                                                ? 'bg-orange-500 hover:bg-orange-600 text-white border-0'
                                                : ''
                                        }`}
                                        disabled={isProcessing}
                                        onClick={() => handlePromoteBatch(batch)}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : batch.isFinal ? (
                                            <GraduationCap className="h-4 w-4 mr-2" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 mr-2" />
                                        )}
                                        {promoteLabel}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {batches.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center text-muted-foreground border-2 border-dashed rounded-xl">
                            <Calendar className="h-10 w-10 mb-2 opacity-40" />
                            <p>No active batches found for this department.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════
    // VIEW: Mentor list + allocation
    // ══════════════════════════════════════════════════════════════
    const renderMentorshipView = () => {
        const sorted = [...mentors].sort((a, b) => b.batch_mentee_count - a.batch_mentee_count);

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => setViewMode('batch')}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Batches
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold">
                                {selectedBatch ? `${selectedBatch}` : `${selectedDept}`}
                            </h2>
                            <p className="text-muted-foreground text-sm">Mentor–mentee allocation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {unassignedCount > 0 && (
                            <span className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                <AlertCircle className="w-4 h-4 mr-1.5" />{unassignedCount} Unassigned
                            </span>
                        )}
                        <Button onClick={handleAllocate} disabled={allocating}>
                            {allocating
                                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                : <RefreshCcw className="h-4 w-4 mr-2" />}
                            Auto-Allocate
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Mentor Summary {selectedBatch ? `(${selectedBatch})` : '(All)'}</CardTitle>
                                <CardDescription>Students assigned to each mentor.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mentor</TableHead>
                                            <TableHead>Designation</TableHead>
                                            <TableHead className="text-right">Batch Mentees</TableHead>
                                            <TableHead className="text-right">Total Load</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sorted.map(m => (
                                            <TableRow key={m.id}>
                                                <TableCell className="font-medium">{m.name}</TableCell>
                                                <TableCell>{m.designation}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={m.batch_mentee_count > 0 ? "default" : "secondary"}>
                                                        {m.batch_mentee_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline">{m.total_load}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Detailed accordion */}
                        <Accordion type="single" collapsible className="w-full">
                            {sorted.map(m => (
                                <AccordionItem key={m.id} value={`m-${m.id}`}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex justify-between w-full pr-4">
                                            <span>{m.name} <span className="text-muted-foreground text-sm">({m.designation})</span></span>
                                            <span className="text-muted-foreground text-sm">{m.batch_mentee_count} mentees</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                                            {m.mentees.map(s => (
                                                <div key={s.admission_number} className="p-2 border rounded text-sm flex justify-between gap-2">
                                                    <span className="truncate">{s.name}</span>
                                                    <span className="text-muted-foreground text-xs shrink-0">{s.batch}</span>
                                                </div>
                                            ))}
                                            {m.mentees.length === 0 && (
                                                <p className="text-muted-foreground text-sm italic">No students assigned.</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────
    return (
        <DashboardLayout role="admin" roleLabel="Admin Dashboard" navItems={navItems} gradientClass="gradient-admin">
            <div className="min-h-[500px]">
                {viewMode === 'dept'        && renderDeptView()}
                {viewMode === 'batch'       && renderBatchView()}
                {viewMode === 'mentorship'  && renderMentorshipView()}
            </div>
        </DashboardLayout>
    );
};

export default AdminMentorshipPage;
