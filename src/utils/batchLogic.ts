
export const getCourseDuration = (dept: string | null, admNo: string = ''): number => {
    // Robust check: Department OR Admission Number hints
    const d = (dept || '').toUpperCase();
    const a = (admNo || '').toUpperCase();

    // Check IMCA / Integrated
    if (d.includes('IMCA') || d.includes('INTEGRATED') || a.includes('IMCA')) return 5;

    // Check MCA / MBA or Department of Computer Applications (defaulting to 2 if not IMCA)
    if (d === 'MCA' || d === 'MBA' || d === 'DEPARTMENT OF COMPUTER APPLICATIONS' || a.includes('MCA') || a.includes('MBA')) {
        // Double check it's not IMCA if implied by Admission Number
        if (a.includes('IMCA')) return 5;
        // If it is Department of Computer Applications, and no admission number hint, we might default to 2 (MCA) 
        // OR we shouldn't be calling this without context. 
        // But 2 is a safer default for PG dept.
        return 2;
    }

    return 4; // Default to 4 (B.Tech etc)
};

export const getBatchFromAdmissionNumber = (admNo: string, dept: string | null): string => {
    if (!admNo) return '';
    const match = admNo.match(/^A?(\d{2})/i);
    if (match) {
        const yearShort = parseInt(match[1]);
        const startYear = 2000 + yearShort;
        const duration = getCourseDuration(dept, admNo);
        const endYear = startYear + duration;
        return `${startYear}-${endYear}`;
    }
    return '';
};

export const generateBatchOptions = (dept: string | null, extraYears: number = 0, shiftStart: number = 0): string[] => {
    if (!dept) return [];

    const d = dept.toUpperCase();
    const batches: string[] = [];

    // 1. Basic Sciences & Humanities -> No Mentoring -> Return Empty
    if (d === 'BASIC SCIENCES & HUMANITIES') {
        return [];
    }

    // 2. Department of Computer Applications (MCA / IMCA)
    if (d === 'DEPARTMENT OF COMPUTER APPLICATIONS' || d === 'MCA' || d === 'IMCA') {
        const mcaDuration = 2;
        const imcaDuration = 5;
        const maxYear = 2025 + extraYears;

        // MCA: Starts 2024 for Active. (Allow shift for new batches)
        for (let y = 2024 + shiftStart; y <= maxYear; y++) {
            batches.push(`MCA ${y}-${y + mcaDuration}`);
        }

        // IMCA: Starts 2024.
        for (let y = 2024 + shiftStart; y <= maxYear; y++) {
            batches.push(`IMCA ${y}-${y + imcaDuration}`);
        }

        return batches.sort();
    }

    // 3. MBA -> Starts 2024
    if (d.includes('MBA') || d.includes('BUSINESS')) {
        const duration = 2;
        const maxYear = 2025 + extraYears;
        for (let y = 2024 + shiftStart; y <= maxYear; y++) {
            batches.push(`${y}-${y + duration}`);
        }
        return batches.sort();
    }

    // 4. B.Tech / Engineering -> Starts 2022
    let duration = 4;
    if (d.includes('M.TECH') || d.includes('MSC')) duration = 2;

    const maxYear = 2025 + extraYears;

    // B.Tech starts 2022 normally. 
    // If shiftStart > 0 (Add Next Batch pressed), we shift window forward:
    // e.g. shift=1 -> Starts 2023. Old 2022 is removed (goes to alumni).
    for (let y = 2022 + shiftStart; y <= maxYear; y++) {
        batches.push(`${y}-${y + duration}`);
    }

    return batches.sort();
};
