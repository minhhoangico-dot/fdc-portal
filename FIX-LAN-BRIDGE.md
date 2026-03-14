# Fix Plan: LAN Bridge OFFLINE Status

## Current Symptoms

- Admin "He thong" tab shows **LAN Bridge: OFFLINE**
- HIS connection: failed (red X)
- MISA connection: failed (red X)
- Heartbeat: "Dang ket noi..." (connecting)
- Sync history table: empty

---

## Root Cause Analysis

The portal reads the `fdc_sync_health` table from Supabase to determine bridge status. If that table has no record (or a stale record), the portal defaults to `"offline"`. The bridge's **heartbeat job** (`updateHealthJob`) runs every 1 minute and upserts to this table — but it was silently failing (no success/error logging).

**Evidence from logs** (`fdc-lan-bridge/logs/bridge-2026-03-14.log`):
- The bridge service starts and registers jobs successfully
- Sync jobs execute but a **Supabase 502 Bad Gateway** error was recorded at 00:35
- The heartbeat job produced NO log output — upserts were failing silently

---

## Code Fixes (DONE)

Steps 2, 3, and 7 from the original plan have been implemented by Codex:

### Canonical health row ID
- **New file:** `fdc-lan-bridge/src/lib/bridgeHealth.ts` — exports `BRIDGE_HEALTH_ROW_ID` (UUID `b45a9096-...`)
- **New file:** `src/lib/bridge.ts` — same constant for portal-side
- Both bridge and portal now reference the same canonical row instead of using `limit(1)` or hardcoded strings

### Heartbeat logging & error handling (`fdc-lan-bridge/src/jobs/updateHealth.ts`)
- Now logs success: `"Health heartbeat updated: online (HIS=true, MISA=true)"`
- Now logs failure with full detail: error code, message, hint, HTTP status
- Wrapped in try/catch for unexpected exceptions

### Server health endpoint (`fdc-lan-bridge/src/server.ts`)
- `/health` now reads by exact `BRIDGE_HEALTH_ROW_ID` with `.maybeSingle()` instead of `limit(1)`

### Portal health fetch (`src/viewmodels/useAdmin.ts`)
- Queries `fdc_sync_health` by exact `BRIDGE_HEALTH_ROW_ID`
- Surfaces Supabase read errors for both `fdc_sync_health` and `fdc_sync_logs`
- Sync buttons disabled when bridge is offline (both UI and `handleManualSync` logic)

### Tests added
- `fdc-lan-bridge/test/unit/updateHealth.test.ts` — verifies degraded status when MISA is down
- `fdc-lan-bridge/test/integration/server.test.ts` — verifies `/health` reads canonical row, sync endpoints work

---

## Remaining Operational Steps (TODO)

These are infrastructure/environment issues that code changes cannot fix:

### Step 1: Verify the bridge is running on the clinic machine

```bash
cd fdc-lan-bridge
curl http://localhost:3333/health
```

If no response, start it:

```bash
npm run dev
```

---

### Step 2: Verify HIS and MISA network connectivity

The bridge runs on-prem and must reach local database servers:

```bash
# HIS PostgreSQL — 192.168.1.253:5642
ping 192.168.1.253
Test-NetConnection -ComputerName 192.168.1.253 -Port 5642

# MISA SQL Server — 192.168.1.2:50114
ping 192.168.1.2
Test-NetConnection -ComputerName 192.168.1.2 -Port 50114
```

**If these fail**: check LAN/VLAN, database server power, firewall rules.

---

### Step 3: Verify Supabase credentials

**File:** `fdc-lan-bridge/.env`

Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are valid. The Service Role Key (not the anon key) is required for writes.

If auth errors appear in the new heartbeat logs, regenerate the key from Supabase Dashboard > Settings > API > Service Role Key.

---

### Step 4: Seed `fdc_sync_health` row if it doesn't exist

The heartbeat job upserts, but if the first upsert keeps failing (RLS, permissions), manually seed via Supabase SQL editor:

```sql
INSERT INTO fdc_sync_health (id, bridge_status, last_heartbeat, his_connected, misa_connected, face_connected, updated_at)
VALUES ('b45a9096-7c91-4cf5-9cd8-89c0966a3371', 'offline', now(), false, false, false, now())
ON CONFLICT (id) DO NOTHING;
```

---

## Future Improvements (not blocking)

| Issue | Description |
|---|---|
| **Heartbeat timeout** | Portal doesn't detect stale heartbeats — if bridge crashes, portal shows last known status indefinitely. Consider marking offline if `last_heartbeat` is older than 3 minutes. |
| **Constant duplication** | `BRIDGE_HEALTH_ROW_ID` exists in two places (`fdc-lan-bridge/src/lib/bridgeHealth.ts` and `src/lib/bridge.ts`). If the ID changes, both must be updated. |
| **Direct health fallback** | Portal only reads health via Supabase. If Supabase is down but bridge is up, portal can't tell. Could add a direct `/health` call as fallback. |
