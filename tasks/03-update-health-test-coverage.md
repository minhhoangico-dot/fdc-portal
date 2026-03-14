# Task: Add missing test coverage for updateHealth

## Context
Current `updateHealth.test.ts` only tests the degraded case (HIS=true, MISA=false). Missing coverage for both connections down and for Supabase upsert failures.

## Files to modify
- `fdc-lan-bridge/test/unit/updateHealth.test.ts` — add two new test cases

## Requirements

### Test case: both connections down
- Mock `checkHisConnection` → `false`, `checkMisaConnection` → `false`
- Verify upsert is called with `bridge_status: "degraded"` (both down = degraded, per current logic)
- Verify the logger success log includes `HIS=false` and `MISA=false`

### Test case: Supabase upsert failure
- Mock `checkHisConnection` → `true`, `checkMisaConnection` → `true`
- Mock the Supabase upsert to return `{ error: { message: "connection refused", code: "PGRST301" }, status: 500 }`
- Verify `logger.error` is called with the error details
- Verify `logger.info` (success log) is NOT called

## Verification
```bash
cd fdc-lan-bridge && npx jest --runInBand test/unit/updateHealth.test.ts
```

## Do NOT
- Modify the production `updateHealth.ts` code
- Change existing test cases
