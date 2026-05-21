# Task Spec: anomaly-dynamic-thresholds

## Goal

- Problem: anomaly detection thresholds are moving from hardcoded bridge values to Supabase-backed configuration, but the live self-hosted Supabase schema still needs the supporting table and anomaly columns.
- Desired outcome: apply `sql/20260406_anomaly_dynamic_thresholds.sql` to the self-hosted Supabase instance, seed the default threshold rows, and verify the anomaly table shape matches the new bridge/frontend contract.

## Scope

- In scope:
  - Apply the anomaly-threshold migration to the live self-hosted Supabase SQL endpoint.
  - Verify `fdc_anomaly_thresholds` exists with the seeded default rows.
  - Verify `fdc_analytics_anomalies` has `module_type` and `inventory_item_key`, and confirm the live backfill result.
- Out of scope:
  - Frontend or bridge code changes.
  - Follow-up cleanup for legacy anomalies that predate `inventory_item_key`.

## Constraints

- Technical constraints:
  - Use the self-hosted Supabase SQL endpoint at `http://192.168.1.9:8000/pg/query`.
  - Apply the SQL in smaller chunks, matching the established rollout pattern for this environment.
  - Keep the rollout idempotent so reruns are safe.
- Product or operational constraints:
  - The admin threshold UI depends on the seeded default rows existing immediately after rollout.
  - Existing anomalies must retain usable module scoping after the migration.

## Assumptions

- `fdc-lan-bridge/.env` still points at the writable self-hosted Supabase instance and contains the valid service-role key.
- The SQL endpoint continues accepting authenticated `POST /pg/query` requests.

## Affected Areas

- Files or directories:
  - `sql/20260406_anomaly_dynamic_thresholds.sql`
  - `tasks/active/2026-04-06-anomaly-dynamic-thresholds.md`
  - `tasks/todo.md`
- Systems touched:
  - Self-hosted Supabase schema and data in `public`

## Implementation Plan

- [x] Read workflow context and confirm the live rollout path for self-hosted Supabase.
- [x] Verify the self-hosted SQL endpoint is reachable from this machine.
- [x] Apply `sql/20260406_anomaly_dynamic_thresholds.sql` in sequential chunks.
- [x] Run post-rollout verification queries for schema and seed state.

## Verification Plan

- Command or check 1: `@' ... '@ | node -` in `fdc-lan-bridge` posting `select 1 as ok` to `http://192.168.1.9:8000/pg/query`.
- Command or check 2: `@' ... '@ | node -` in `fdc-lan-bridge` applying the four SQL chunks from `sql/20260406_anomaly_dynamic_thresholds.sql` to `POST /pg/query`.
- Command or check 3: `@' ... '@ | node -` in `fdc-lan-bridge` verifying:
  - `public.fdc_anomaly_thresholds` exists
  - `public.fdc_analytics_anomalies` includes `module_type` and `inventory_item_key`
  - 10 default threshold rows exist for `__default__`
  - `module_type` backfill completed for all existing anomalies
- Command or check 4: `cmd /c npm.cmd run build` in the portal root, then `cmd /c npx.cmd wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`.
- Command or check 5: SSH rollout to `hbminh@192.168.1.9` copying the changed bridge files to `/opt/fdc-lan-bridge`, then `sudo npm run build`, `sudo systemctl restart fdc-lan-bridge`, and `curl http://127.0.0.1:3333/health`.

## Closeout

- Final status: rolled out and verified on self-hosted Supabase
- Deployment evidence:
  - `cmd /c npm.cmd run build` in the portal root: passed and emitted `dist/assets/index-LjZCG-9P.js`.
  - `cmd /c npm.cmd run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - `cmd /c npx.cmd wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://4f0787a5.fdc-portal.pages.dev`.
  - `Invoke-WebRequest -UseBasicParsing https://4f0787a5.fdc-portal.pages.dev/` and `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/`: both returned `200` and referenced `assets/index-LjZCG-9P.js`.
  - SSH rollout to `hbminh@192.168.1.9`: copied `src/jobs/detectAnomalies.ts`, `src/lib/anomalyThresholds.ts`, and `src/scheduler.ts` into `/opt/fdc-lan-bridge`, then ran `sudo npm run build`, `sudo systemctl restart fdc-lan-bridge`, and `curl http://127.0.0.1:3333/health`.
  - Remote bridge health verification returned `200 OK` with `{"status":"healthy","hisConnected":true,"misaConnected":true,"queueDepth":0,...}` after restart.
- Residual risks:
  - Two acknowledged legacy pharmacy anomalies from `2026-03-11` still have `inventory_item_key = null`; current frontend matching tolerates that via name fallback, but only newly detected anomalies will carry the new key automatically.
