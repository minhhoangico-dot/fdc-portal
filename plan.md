# Plan: Fix Console Errors (Recharts + fdc_delegations)

## Error Summary

Two errors visible in the browser console:

1. **`GET fdc_delegation... 404 (Not Found)`** — Supabase REST calls to `fdc_delegations` table return 404 because the table doesn't exist yet in the database.
2. **`The width(-1) and height(-1) of chart should be greater than 0`** — Recharts fires this on every initial render when `height="100%"` is used and the browser hasn't laid out the DOM yet, so the measured size is `-1`.

---

## Fix 1 — Apply SQL migration (manual step in Supabase)

The migration file is already written at `sql/20260314_fdc_delegations.sql`.

**Action**: Copy and run it in the Supabase SQL Editor. This creates the `fdc_delegations` table with the correct schema and RLS policies. No code changes needed.

---

## Fix 2 — Recharts `width(-1) height(-1)` warning

**File**: `src/app/inventory/OverviewTab.tsx`

**Root cause**: All 4 `<ResponsiveContainer>` components use `height="100%"`. Recharts measures the container synchronously on the first render, before the browser has applied CSS. Result: measured height = `-1`. When you pass an explicit number (e.g., `height={320}`), Recharts uses it directly without measuring the DOM — no warning.

**Fix**: Replace `height="100%"` with the pixel equivalent of the parent div's Tailwind height class on each of the 4 charts:

| Parent class | Tailwind px | Fix |
|---|---|---|
| `h-80` (supply consumption chart, line ~171) | 320px | `height={320}` |
| `h-56` (per-visit cost chart, line ~259) | 224px | `height={224}` |
| `h-72` (inventory value 1-year chart, line ~350) | 288px | `height={288}` |
| `h-72` (top 10 bar chart, line ~413) | 288px | `height={288}` |

For each `<ResponsiveContainer width="100%" height="100%">` in OverviewTab.tsx, change `height="100%"` to the matching pixel value from the table above.

**Do not change** the `height={140}` in `src/app/inventory/page.tsx` — that chart already uses an explicit pixel height and doesn't have this warning.

---

## Files to Change

| File | Change |
|---|---|
| `src/app/inventory/OverviewTab.tsx` | Replace `height="100%"` → explicit pixel heights on 4 `ResponsiveContainer` instances |
| Supabase SQL Editor (manual) | Run `sql/20260314_fdc_delegations.sql` |
