# Task: Heartbeat timeout detection

## Context
If the bridge crashes or stops, the portal keeps showing the last known status ("online") indefinitely because it only reads `bridge_status` from the database without checking how old `last_heartbeat` is.

## Files to modify
- `src/viewmodels/useAdmin.ts` — inside `fetchSyncData`, after reading the `fdc_sync_health` row
- `src/app/admin/HealthTab.tsx` — show stale heartbeat warning in UI

## Requirements

### useAdmin.ts
- Compare `last_heartbeat` to the current time
- If `last_heartbeat` is older than 3 minutes, override `status` to `"offline"` regardless of what `bridge_status` says
- Set `hisConnected` and `misaConnected` to `false` when status is overridden to offline

### HealthTab.tsx
- If `bridgeHealth.status === "offline"` and `bridgeHealth.lastHeartbeat` exists and is older than 3 minutes, show: `"Mất kết nối với Bridge từ {formatTimeAgo(lastHeartbeat)}"`
- If `bridgeHealth.lastHeartbeat` is null, show: `"Chưa nhận được tín hiệu từ Bridge"`
- Use the existing `formatTimeAgo` utility from `@/lib/utils`

## Verification
```bash
npm run lint
```

## Do NOT
- Change any bridge-side code
- Modify the Supabase query itself
- Add new dependencies
