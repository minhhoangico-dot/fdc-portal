# Codex Handoff Log

Last updated: 2026-03-14

## Purpose

This file records what Codex inspected, changed, verified, and intentionally did not do, so Claude Code can resume with full context.

## What I inspected

- Read `CLAUDE.md`
- Read `FIX-LAN-BRIDGE.md`
- Read `todo.md`
- Read `tasks/04-fix-hikvision-node-fetch.md`
- Inspected bridge code:
  - `fdc-lan-bridge/src/jobs/updateHealth.ts`
  - `fdc-lan-bridge/src/server.ts`
  - `fdc-lan-bridge/src/scheduler.ts`
  - `fdc-lan-bridge/src/index.ts`
  - `fdc-lan-bridge/src/config.ts`
  - `fdc-lan-bridge/src/db/his.ts`
  - `fdc-lan-bridge/src/db/misa.ts`
  - `fdc-lan-bridge/src/db/supabase.ts`
  - `fdc-lan-bridge/src/lib/hikvision.ts`
  - `fdc-lan-bridge/src/lib/logger.ts`
  - `fdc-lan-bridge/src/lib/syncLog.ts`
  - `fdc-lan-bridge/src/jobs/syncAttendance.ts`
- Inspected portal code:
  - `src/viewmodels/useAdmin.ts`
  - `src/app/admin/HealthTab.tsx`
  - `src/lib/supabase.ts`
  - `src/lib/utils.ts`
  - `src/types/sync.ts`
- Inspected bridge tests:
  - `fdc-lan-bridge/test/unit/updateHealth.test.ts`
  - `fdc-lan-bridge/test/integration/server.test.ts`
- Read bridge logs:
  - `fdc-lan-bridge/logs/bridge-2026-03-14.log`
  - `fdc-lan-bridge/logs/error-2026-03-14.log`
- Checked live bridge endpoint:
  - `http://localhost:3333/health`
- Ran read-only live Supabase checks through the bridge service-role client for:
  - `fdc_sync_health`
  - `fdc_sync_logs`

## Key findings

- The original root-cause note in `FIX-LAN-BRIDGE.md` was incomplete/outdated.
- The main real bug was not just "silent heartbeat failure".
- `fdc_sync_health` had multiple rows, including:
  - a fresh canonical row with id `b45a9096-7c91-4cf5-9cd8-89c0966a3371`
  - an older stale offline row with id `62caea9c-4a31-4993-be1f-27ec04c9bc5a`
- Both the bridge `/health` endpoint and the portal admin view were using `limit(1)` without filtering by id, so they could read the wrong row.
- This explained the misleading behavior:
  - bridge process looked healthy
  - HIS/MISA could be connected
  - portal still showed stale/offline data
- `fdc_sync_logs` did have recent records, so the "empty history" symptom was likely portal-side reading/display behavior, not an absence of bridge writes.
- A historical Supabase 502 did appear in the logs around `2026-03-14 00:35`, so heartbeat logging and error reporting were still worth improving.
- Before the PM2 restart, `http://localhost:3333/health` was still returning a stale `lastHeartbeat` (`2026-03-04T00:57:32.338422+00:00`), which indicated the live process had not picked up the patched code yet.

## Code changes I made

### Bridge health row canonicalization

- Added `fdc-lan-bridge/src/lib/bridgeHealth.ts`
- Added `src/lib/bridge.ts`
- Both now define the same canonical `BRIDGE_HEALTH_ROW_ID`

### Bridge heartbeat job

Updated `fdc-lan-bridge/src/jobs/updateHealth.ts`:

- Uses `BRIDGE_HEALTH_ROW_ID` instead of an inline string
- Uses one shared timestamp per write
- Logs successful heartbeat writes
- Logs detailed Supabase heartbeat write failures

### Bridge health endpoint

Updated `fdc-lan-bridge/src/server.ts`:

- Reads `fdc_sync_health` by exact id
- Uses `.maybeSingle()` instead of `limit(1).single()`
- Logs structured fetch errors

### Portal admin health fetch

Updated `src/viewmodels/useAdmin.ts`:

- Reads `fdc_sync_health` by exact id
- Logs fetch errors for both `fdc_sync_health` and `fdc_sync_logs`
- Marks bridge `offline` when `last_heartbeat` is older than 3 minutes
- Forces `hisConnected` and `misaConnected` to `false` when heartbeat is stale

### Portal stale heartbeat helper

Updated `src/lib/bridge.ts`:

- Added `BRIDGE_HEARTBEAT_STALE_AFTER_MS`
- Added `isBridgeHeartbeatStale()`

### Portal admin health UI

Updated `src/app/admin/HealthTab.tsx`:

- Replaced inline relative-time formatting with `formatTimeAgo`
- Shows a warning when heartbeat exists but is stale
- Shows a warning when no heartbeat has ever been received

### Duplication guard

Added comments to:

- `fdc-lan-bridge/src/lib/bridgeHealth.ts`
- `src/lib/bridge.ts`

These comments explicitly state that the UUID values must match.

## Test changes I made

### Updated

- `fdc-lan-bridge/test/unit/updateHealth.test.ts`
  - one DB down -> degraded
  - both DBs down -> degraded
  - Supabase upsert failure -> detailed logger error asserted

- `fdc-lan-bridge/test/integration/server.test.ts`
  - `/health` now asserts canonical row lookup by id

### Added

- `fdc-lan-bridge/test/unit/bridgeHealthConstant.test.ts`
  - reads `src/lib/bridge.ts`
  - extracts the portal UUID via regex
  - asserts it matches the bridge UUID

## Additional dependency/runtime hardening I made

### Hikvision fetch rewrite

Updated `fdc-lan-bridge/src/lib/hikvision.ts`:

- Removed `digest-fetch`
- Removed the `@ts-ignore` import
- Replaced the client with Node's built-in global `fetch`
- Implemented inline MD5 Digest authentication using Node's built-in `crypto`
- Kept the same public API:
  - `toHikvisionFormat`
  - `checkConnection`
  - `getAllEvents`

### Bridge dependency cleanup

Updated `fdc-lan-bridge/package.json`:

- Removed direct dependency on `digest-fetch`
- Removed direct dependency on `node-fetch`

Updated `fdc-lan-bridge/package-lock.json` via `npm install`

## Verification I ran

### Bridge tests

Ran in `fdc-lan-bridge`:

- `cmd /c node_modules\\.bin\\jest.cmd --runInBand`

Result:

- 5 test suites passed
- 11 tests passed

### Bridge build

Ran in `fdc-lan-bridge`:

- `cmd /c npm run build`

Result:

- Passed

### Portal type-check

Ran at repo root:

- `cmd /c npm run lint`

Result:

- Failed because root `node_modules` is missing and `tsc` is not available in this workspace
- This is an environment/dependency issue, not a code error I confirmed

### Runtime rollout verification

Performed on 2026-03-14:

- Restarted the live PM2 app:
  - `pm2 restart lan-bridge`
- Confirmed PM2 status:
  - app name: `lan-bridge`
  - status: `online`
  - PM2 script path: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\dist\index.js`

Checked `http://localhost:3333/health` twice after restart:

- First check:
  - `status: healthy`
  - `hisConnected: true`
  - `misaConnected: true`
  - `lastHeartbeat: 2026-03-14T03:12:00.889+00:00`
- Second check about one minute later:
  - `status: healthy`
  - `hisConnected: true`
  - `misaConnected: true`
  - `lastHeartbeat: 2026-03-14T03:14:00.138+00:00`

This confirms the stale March 4 heartbeat issue at `/health` was resolved after the PM2 restart.

Checked PM2 logs after restart:

- Saw startup logs for the restarted process
- Saw heartbeat success logs at:
  - `2026-03-14 10:13:00`
  - `2026-03-14 10:14:00`
- Example log line:
  - `Health heartbeat updated: online (HIS=true, MISA=true)`

### Hikvision runtime verification

Performed on 2026-03-14 after the fetch rewrite:

- Ran `npm install` in `fdc-lan-bridge`
- Rebuilt the bridge successfully
- Re-ran the full bridge Jest suite successfully
- Confirmed `digest-fetch` and `node-fetch` no longer appear in:
  - `fdc-lan-bridge/package.json`
  - `fdc-lan-bridge/package-lock.json`
  - `fdc-lan-bridge/src`
- Restarted PM2 app `lan-bridge`
- Checked `http://localhost:3333/health`:
  - still `healthy`
  - still `hisConnected: true`
  - still `misaConnected: true`
  - `lastHeartbeat` remained fresh
- Triggered manual attendance sync:
  - `POST http://localhost:3333/sync/timekeeping`
  - response: `{"ok":true}`
- Verified in PM2 out log:
  - `Starting syncAttendanceJob...`
  - `Fetching Hikvision events ...`
  - `Fetched 34 events from Hikvision device.`
  - `syncAttendanceJob completed for 32 records.`

This is strong evidence that the bridge no longer depends on the removed `digest-fetch` / `node-fetch` path for the active Hikvision attendance flow.

## Runtime issue still observed

- PM2 error logs still contain historical `MODULE_NOT_FOUND` entries for `node-fetch`
- Those log lines appear to be old retained log history, not fresh failures after the rewrite
- After the rewrite and restart:
  - the bridge stayed online
  - `/health` stayed healthy
  - manual `sync/timekeeping` succeeded
- No fresh `node-fetch` crash was observed on the active code path after deployment

## Live observations worth keeping

- Live bridge `/health` was returning `healthy` with:
  - `hisConnected: true`
  - `misaConnected: true`
  - fresh advancing `lastHeartbeat` after PM2 restart
- Live Supabase `fdc_sync_health` contained at least 2 rows
- Live Supabase `fdc_sync_logs` contained recent successful sync entries

## Things I did NOT do

- I restarted the running `fdc-lan-bridge` PM2 process (`lan-bridge`)
- I did not reload or redeploy the portal
- I did not delete or mutate the stale extra row in `fdc_sync_health`
- I did not change any Supabase table policies
- I did not regenerate credentials

## Recommended next steps for Claude Code

1. Reload or redeploy the portal so the patched admin view and health UI become live.
2. Re-check the Admin -> Health tab and confirm:
   - bridge status reflects the canonical row
   - stale heartbeat handling works
   - warning message appears correctly when expected
   - sync history is populated if portal-side Supabase reads are allowed
3. If sync history is still empty after reload:
   - inspect portal-side Supabase read errors in browser console/network
   - especially `fdc_sync_health` and `fdc_sync_logs`
4. Optionally clean up the stale extra row in `fdc_sync_health`
5. Optionally update `FIX-LAN-BRIDGE.md` so its root-cause section matches the actual diagnosis
