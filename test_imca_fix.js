// Test IMCA batch generation
const batches = [];
const mcaBaseStart = 2023;
const imcaBaseStart = 2024;
const maxStart = 2025;

// Generate MCA batches (starts from 2023)
for (let y = mcaBaseStart; y <= maxStart; y++) {
    batches.push(`MCA ${y}-${y + 2}`);
}

// Generate IMCA batches (starts from 2024 only)
for (let y = imcaBaseStart; y <= maxStart; y++) {
    batches.push(`IMCA ${y}-${y + 5}`);
}

console.log("=".repeat(60));
console.log("GENERATED BATCHES");
console.log("=".repeat(60));
batches.sort().forEach(b => console.log(`  ${b}`));

console.log("\n" + "=".repeat(60));
console.log("VALIDATION");
console.log("=".repeat(60));

const imca2023 = batches.filter(b => b.includes('IMCA') && b.includes('2023'));
console.log(`\nIMCA 2023 batches found: ${imca2023.length > 0 ? '❌ FAIL' : '✅ PASS'}`);
if (imca2023.length > 0) {
    imca2023.forEach(b => console.log(`   ${b}`));
}

const firstImca = batches.find(b => b.includes('IMCA'));
console.log(`First IMCA batch: ${firstImca}`);
console.log(`Expected: IMCA 2024-2029`);
console.log(`Result: ${firstImca === 'IMCA 2024-2029' ? '✅ PASS' : '❌ FAIL'}`);

const allImcaBatches = batches.filter(b => b.includes('IMCA'));
console.log(`\nAll IMCA batches (${allImcaBatches.length}):`);
allImcaBatches.forEach(b => console.log(`  ${b}`));

console.log("\n" + "=".repeat(60));
