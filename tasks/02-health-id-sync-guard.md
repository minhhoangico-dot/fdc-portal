# Task: Guard against BRIDGE_HEALTH_ROW_ID drift

## Context
The same UUID constant (`BRIDGE_HEALTH_ROW_ID`) exists in two separate files with no compile-time link between them. If one changes and the other doesn't, the portal and bridge silently stop communicating health status.

- `fdc-lan-bridge/src/lib/bridgeHealth.ts`
- `src/lib/bridge.ts`

## Files to modify
- `fdc-lan-bridge/src/lib/bridgeHealth.ts` — add cross-reference comment
- `src/lib/bridge.ts` — add cross-reference comment
- `fdc-lan-bridge/test/unit/bridgeHealthSync.test.ts` — new test file

## Requirements

### Comments
Add to `fdc-lan-bridge/src/lib/bridgeHealth.ts`:
```typescript
// IMPORTANT: This value must match src/lib/bridge.ts in the portal project
```

Add to `src/lib/bridge.ts`:
```typescript
// IMPORTANT: This value must match fdc-lan-bridge/src/lib/bridgeHealth.ts in the bridge project
```

### Test
Create `fdc-lan-bridge/test/unit/bridgeHealthSync.test.ts`:
- Use `fs.readFileSync` to read `../../src/lib/bridge.ts`
- Extract the UUID with a regex
- Import `BRIDGE_HEALTH_ROW_ID` from `../../src/lib/bridgeHealth`
- Assert they are identical

## Verification
```bash
cd fdc-lan-bridge && npx jest --runInBand test/unit/bridgeHealthSync.test.ts
```

## Do NOT
- Create a shared package or move files around
- Change the UUID value
