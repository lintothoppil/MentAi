/**
 * Test to verify IMCA batches start from 2024 only (not 2023)
 */

// Simulate the generateBatchOptions function logic
function generateBatchOptions(department: string, extraYears: number = 0, shiftStart: number = 0): string[] {
    const batches: string[] = [];
    const d = department.toUpperCase();

    // 1. MCA / IMCA
    if (d === 'DEPARTMENT OF COMPUTER APPLICATIONS' || d === 'MCA' || d === 'IMCA') {
        const mcaDuration = 2;
        const imcaDuration = 5;
        
        // MCA: starts from 2023 (existing MCA 2023-2025)
        // IMCA: starts from 2024 (first batch is 2024-2029)
        const mcaBaseStart = 2023 + shiftStart;
        const imcaBaseStart = 2024 + shiftStart; // IMCA starts in 2024
        const maxStart = 2025 + extraYears;

        // Generate MCA batches
        for (let y = mcaBaseStart; y <= maxStart; y++) {
            batches.push(`MCA ${y}-${y + mcaDuration}`);
        }
        // Generate IMCA batches (starting from 2024 only)
        for (let y = imcaBaseStart; y <= maxStart; y++) {
            batches.push(`IMCA ${y}-${y + imcaDuration}`);
        }
        return [...new Set(batches)].sort();
    }

    return [];
}

console.log("=".repeat(60));
console.log("TESTING IMCA BATCH GENERATION");
console.log("=".repeat(60));

const dept = "Department of Computer Applications";
const batches = generateBatchOptions(dept);

console.log("\nGenerated batches for", dept);
console.log("-".repeat(60));

batches.forEach(batch => {
    console.log(`  ${batch}`);
});

console.log("\n" + "-".repeat(60));
console.log("VALIDATION:");
console.log("-".repeat(60));

// Check for IMCA 2023 batches (should NOT exist)
const imca2023 = batches.filter(b => b.includes('IMCA') && b.includes('2023'));
if (imca2023.length > 0) {
    console.log("❌ FAIL: Found IMCA 2023 batches (should not exist):");
    imca2023.forEach(b => console.log(`   ${b}`));
} else {
    console.log("✅ PASS: No IMCA 2023 batches found");
}

// Check first IMCA batch (should be 2024-2029)
const imcaBatches = batches.filter(b => b.includes('IMCA')).sort();
if (imcaBatches.length > 0) {
    const firstImca = imcaBatches[0];
    if (firstImca === 'IMCA 2024-2029') {
        console.log("✅ PASS: First IMCA batch is correct:", firstImca);
    } else {
        console.log("❌ FAIL: First IMCA batch is wrong:", firstImca, "(expected IMCA 2024-2029)");
    }
}

// List all IMCA batches
console.log("\nAll IMCA batches:");
imcaBatches.forEach(b => console.log(`  ${b}`));

console.log("\n" + "=".repeat(60));
