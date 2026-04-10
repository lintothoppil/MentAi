// Test alumni filtering logic
const students = [
    {
        admission_number: "MCA2021001",
        name: "John Doe",
        department: "MCA",
        batch: "2021-2023",
        status: "Passed Out"
    },
    {
        admission_number: "MCA2022001", 
        name: "Jane Smith",
        department: "MCA",
        batch: "2022-2024",
        status: "Live"
    },
    {
        admission_number: "IMCA2020001",
        name: "Bob Johnson",
        department: "IMCA", 
        batch: "2020-2025",
        status: "Passed Out"
    },
    {
        admission_number: "CSE2020001",
        name: "Alice Brown",
        department: "Computer Science and Engineering (CSE)",
        batch: "2020-2024",
        status: "Live"
    }
];

console.log("Testing alumni filtering logic...\n");

const currentYear = new Date().getFullYear();
console.log(`Current year: ${currentYear}\n`);

const alumniList = students.filter((s) => {
    console.log(`Checking student ${s.name} (${s.admission_number}): status=${s.status}, batch=${s.batch}, department=${s.department}`);
    
    // Primary rule: Students marked as "Passed Out" are alumni
    if (s.status === 'Passed Out') {
        console.log(`  -> Marked as Passed Out, including in alumni`);
        return true;
    }

    // Auto-detect based on batch end year
    if (s.batch) {
        const parts = s.batch.split('-');
        if (parts.length === 2) {
            const endYear = parseInt(parts[1]);
            const deptUpper = s.department.toUpperCase();
            const isIMCA = deptUpper.includes('IMCA') || (deptUpper.includes('COMPUTER APPLICATIONS') && s.batch.startsWith('IMCA'));

            // User Rule: End date 2023 to 2025 -> Alumni (Except IMCA)
            if (!isIMCA && endYear >= 2023 && endYear <= 2025) {
                console.log(`  -> Batch end year ${endYear} in 2023-2025 range, including in alumni`);
                return true;
            }

            // General rule: If end year is before current year and not Live
            if (endYear < currentYear && s.status !== 'Live') {
                console.log(`  -> Batch ended ${endYear} (before ${currentYear}) and status is ${s.status}, including in alumni`);
                return true;
            }
        }
    }
    
    console.log(`  -> Not included in alumni`);
    return false;
});

console.log(`\nAlumni list (${alumniList.length} students):`);
alumniList.forEach(s => {
    console.log(`- ${s.name} (${s.admission_number}) - ${s.department} - ${s.batch} - ${s.status}`);
});