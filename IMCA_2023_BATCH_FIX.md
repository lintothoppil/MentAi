# IMCA Batch Start Year Fix ✅

## Problem

The UI was incorrectly generating IMCA batches starting from 2023 (e.g., "IMCA 2023-2028"), but IMCA program actually started in **2024**, so the first batch should be **"IMCA 2024-2029"**.

## Root Cause

In `d:\mentAi\src\pages\AdminMentorshipPage.tsx`, the `generateBatchOptions()` function was using the same start year (2023) for both MCA and IMCA batches:

```typescript
// ❌ BEFORE - WRONG
const baseStart = 2023 + shiftStart; // Same for both MCA and IMCA

for (let y = baseStart; y <= maxStart; y++) {
    batches.push(`MCA ${y}-${y + mcaDuration}`);
}
for (let y = baseStart; y <= maxStart; y++) {
    batches.push(`IMCA ${y}-${y + imcaDuration}`);  // Started from 2023!
}
```

This generated incorrect batches like:
- IMCA 2023-2028 ❌ (should not exist)
- IMCA 2024-2029 ✓
- IMCA 2025-2030 ✓

## Solution

Separate the start years for MCA and IMCA:

```typescript
// ✅ AFTER - CORRECT
// MCA: starts from 2023 (existing MCA 2023-2025)
// IMCA: starts from 2024 (first batch is 2024-2029)
const mcaBaseStart = 2023 + shiftStart;
const imcaBaseStart = 2024 + shiftStart; // IMCA starts in 2024

// Generate MCA batches
for (let y = mcaBaseStart; y <= maxStart; y++) {
    batches.push(`MCA ${y}-${y + mcaDuration}`);
}
// Generate IMCA batches (starting from 2024 only)
for (let y = imcaBaseStart; y <= maxStart; y++) {
    batches.push(`IMCA ${y}-${y + imcaDuration}`);
}
```

Now generates correct batches:
- MCA 2023-2025 ✓
- MCA 2024-2026 ✓
- MCA 2025-2027 ✓
- IMCA 2024-2029 ✓ (FIRST BATCH - correct!)
- IMCA 2025-2030 ✓

## Files Modified

| File | Function | Lines Changed |
|------|----------|---------------|
| `d:\mentAi\src\pages\AdminMentorshipPage.tsx` | `generateBatchOptions()` | 67-82 |

## Expected Behavior

### Before Fix:
When selecting "Department of Computer Applications", user would see:
- MCA 2023-2025
- MCA 2024-2026
- MCA 2025-2027
- **IMCA 2023-2028** ❌ (WRONG - this batch should not exist)
- IMCA 2024-2029
- IMCA 2025-2030

### After Fix:
Now user sees:
- MCA 2023-2025
- MCA 2024-2026
- MCA 2025-2027
- **IMCA 2024-2029** ✓ (CORRECT - first IMCA batch)
- IMCA 2025-2030

## Verification

The fix ensures:
1. ✅ MCA batches can start from 2023 (to match existing MCA 2023-2025 students)
2. ✅ IMCA batches start from 2024 only (first batch is 2024-2029)
3. ✅ No "IMCA 2023-2028" batch appears in dropdown
4. ✅ Correct 5-year duration for IMCA (2024-2029, 2025-2030, etc.)

## Database Consistency

Since IMCA started in 2024 according to business rules:
- Max concurrent batches for IMCA: **5**
- Valid IMCA batch slots:
  - 2024-2029 (Slot 1)
  - 2025-2030 (Slot 2)
  - 2026-2031 (Slot 3)
  - 2027-2032 (Slot 4)
  - 2028-2033 (Slot 5)
  
When 6th batch (2029-2034) is added, the oldest (2024-2029) will be promoted to alumni.

---

**Status:** ✅ COMPLETE  
**Date:** March 3, 2026
