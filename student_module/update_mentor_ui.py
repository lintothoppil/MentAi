
import os

with open('src/pages/MentorMenteesPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state and fetch for marks in StudentDetailSheet
DETAIL_STATE_OLD = "    const [loading, setLoading] = useState(false);"
DETAIL_STATE_NEW = "    const [loading, setLoading] = useState(false);\n    const [marks, setMarks] = useState<any[]>([]);"
content = content.replace(DETAIL_STATE_OLD, DETAIL_STATE_NEW)

DETAIL_FETCH_OLD = "setDetail(d.data); else toast.error(d.message);"
DETAIL_FETCH_NEW = "setDetail(d.data); fetchMarks(studentId); else toast.error(d.message);"
content = content.replace(DETAIL_FETCH_OLD, DETAIL_FETCH_NEW)

# 2. Add fetchMarks and handleVerify functions inside StudentDetailSheet
DETAIL_FUNCS = r'''
    const fetchMarks = async (sid: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/student/marks/${sid}`);
            const d = await res.json();
            if (d.success) setMarks(d.data);
        } catch {}
    };

    const handleVerifyMarks = async (sem: number, action: 'verify' | 'unlock' = 'verify') => {
        try {
            const res = await fetch(`http://localhost:5000/api/mentor/marks/verify/${studentId}/${sem}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });
            const d = await res.json();
            if (d.success) {
                toast.success(d.message);
                fetchMarks(studentId!);
            } else toast.error(d.message);
        } catch { toast.error("Verification failed"); }
    };
'''

# Insert before return in StudentDetailSheet (around line 395)
content = content.replace("    return (", DETAIL_FUNCS + "\n    return (")

# 3. Add University Marks UI section (Insert after Analytics/before Contact Info)
MARKS_UI = r'''
                        {/* University Marks Authorization */}
                        {marks.length > 0 && (
                            <>
                                <Separator />
                                <div className="p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                                        <GraduationCap className="h-3 w-3" /> University Mark Verification
                                    </p>
                                    <div className="space-y-4">
                                        {[...new Set(marks.map(m => m.semester))].sort().map(sem => {
                                            const semMarks = marks.filter(m => m.semester === sem);
                                            const allVerified = semMarks.every(m => m.is_verified);
                                            return (
                                                <div key={sem} className="p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-xs font-black text-indigo-950 dark:text-white uppercase">Semester {sem}</p>
                                                        {allVerified ? (
                                                            <div className="flex items-center gap-2">
                                                                <Badge className="bg-emerald-500 text-white border-0 text-[10px]">Authorized</Badge>
                                                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground" onClick={() => handleVerifyMarks(sem, 'unlock')}>Unlock</Button>
                                                            </div>
                                                        ) : (
                                                            <Button 
                                                                size="sm" 
                                                                className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg"
                                                                onClick={() => handleVerifyMarks(sem)}
                                                            >
                                                                Verify & Authorize
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {semMarks.map((m, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-[10px]">
                                                                <span className="font-bold text-slate-600 dark:text-slate-400">{m.university_grade || m.university_mark || '—'}</span>
                                                                <span className="text-slate-400">·</span>
                                                                <span className="truncate max-w-[80px] font-semibold">{m.subject_code}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
'''

# Insert before "Contact Information" block (line 496 in original)
content = content.replace('<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</p>', 
                          MARKS_UI + '\n                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</p>')

with open('src/pages/MentorMenteesPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Mentor Verification UI implemented in MentorMenteesPage.tsx")
