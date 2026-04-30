import re

def update_mentor_mentees_page():
    with open('src/pages/MentorMenteesPage.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
        
    # We want to add a tab bar between Title and Search
    # "Mentee Directory"
    # Find:
    
    # 1. Add activeTab state
    content = re.sub(
        r'const \[searchTerm, setSearchTerm\] = useState\(""\);',
        'const [searchTerm, setSearchTerm] = useState("");\n    const [activeTab, setActiveTab] = useState("active");',
        content
    )
    
    # 2. Add filtering for Active/Alumni
    old_filter = r"""    const filteredMentees = mentees.filter\(m => \{
        const matchesSearch =
            m.name.toLowerCase\(\).includes\(searchTerm.toLowerCase\(\)\) \|\|
            m.student_id.toLowerCase\(\).includes\(searchTerm.toLowerCase\(\)\);
        const risk = m.adjusted_risk \|\| 0;
        const matchesFilter =
            filterStatus === "all" \|\|
            \(filterStatus === "critical" && risk >= 70\) \|\|
            \(filterStatus === "at-risk"  && risk >= 40 && risk < 70\) \|\|
            \(filterStatus === "stable"   && risk < 40\);
        return matchesSearch && matchesFilter;
    \}\).sort\(\(a, b\) => \(b.adjusted_risk \|\| 0\) - \(a.adjusted_risk \|\| 0\)\);"""
    
    new_filter = """    const targetMentees = mentees.filter(m => activeTab === 'active' ? m.status !== 'Passed Out' : m.status === 'Passed Out');
    
    const filteredMentees = targetMentees.filter(m => {
        const matchesSearch =
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.student_id.toLowerCase().includes(searchTerm.toLowerCase());
        const risk = m.adjusted_risk || 0;
        const matchesFilter =
            filterStatus === "all" ||
            (filterStatus === "critical" && risk >= 70) ||
            (filterStatus === "at-risk"  && risk >= 40 && risk < 70) ||
            (filterStatus === "stable"   && risk < 40);
        return matchesSearch && matchesFilter;
    }).sort((a, b) => (b.adjusted_risk || 0) - (a.adjusted_risk || 0));"""
    
    content = re.sub(old_filter, new_filter, content)
    
    # 3. Add Tabs to UI just below header
    tabs_ui = """                {/* Tabs */}
                <motion.div {...anim(1)} className="flex gap-2 bg-muted/40 p-1 w-fit rounded-xl">
                    <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-800 shadow-sm text-mentor' : 'text-muted-foreground hover:text-foreground'}`}>Active Mentees</button>
                    <button onClick={() => setActiveTab('alumni')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'alumni' ? 'bg-white dark:bg-slate-800 shadow-sm text-mentor' : 'text-muted-foreground hover:text-foreground'}`}>Alumni / Passed Out</button>
                </motion.div>"""
                
    content = content.replace(
        "                {/* Summary Stats */}",
        tabs_ui + "\n\n                {/* Summary Stats */}"
    )
    
    # 4. Modify counts
    content = content.replace(
        "const criticalCount  = mentees.filter(m => (m.adjusted_risk || 0) >= 70).length;",
        "const criticalCount  = targetMentees.filter(m => (m.adjusted_risk || 0) >= 70).length;"
    ).replace(
        "const atRiskCount    = mentees.filter(m => { const r = m.adjusted_risk || 0; return r >= 40 && r < 70; }).length;",
        "const atRiskCount    = targetMentees.filter(m => { const r = m.adjusted_risk || 0; return r >= 40 && r < 70; }).length;"
    ).replace(
        "const stableCount    = mentees.filter(m => (m.adjusted_risk || 0) < 40).length;",
        "const stableCount    = targetMentees.filter(m => (m.adjusted_risk || 0) < 40).length;"
    )
    
    content = content.replace(
        "{mentees.length} students assigned",
        "{targetMentees.length} {activeTab === 'active' ? 'active mentees' : 'alumni'} assigned"
    )
    
    # Update student display (Program, Batch, Current Semester)
    # The API returns m.batch right now, but the API was not returning `current_semester` directly to the `api/analytics/mentor/<id>`.
    # WAIT! The frontend fetches `api/analytics/mentor/<id>` which we haven't patched yet!
    # Let me check `api_mentor_mentees` vs `api/analytics/mentor`.
    
    with open('src/pages/MentorMenteesPage.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

update_mentor_mentees_page()
print("Mentor page patched")
