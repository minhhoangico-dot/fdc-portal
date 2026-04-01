# Task Spec: supply-item-history

## Goal

- Problem: Room Management needs a persistent supply-history backend so the frontend can suggest previously used items per room without duplicating item names and units.
- Desired outcome: Add an idempotent Supabase migration that creates `fdc_supply_item_history`, protects it with RLS, preserves direct `upsert(..., { onConflict })` client usage, and apply the change to the self-hosted Supabase instance.

## Scope

- In scope:
  - Add a new SQL migration for the table, indexes, trigger function, and RLS policies.
  - Add an automated verification script that proves schema and `use_count` behavior against the live self-hosted Supabase SQL endpoint.
  - Apply the migration and record the verification evidence.
- Out of scope:
  - Room-management frontend autocomplete UI changes.
  - Any broader room workflow schema redesign outside this table.

## Constraints

- Technical constraints:
  - Keep the change additive and idempotent.
  - Preserve the future frontend shape that uses direct `supabase.from(...).upsert(..., { onConflict: 'room_id,item_name,unit' })`.
  - Use the self-hosted Supabase SQL endpoint at `http://192.168.1.9:8000/pg/query` for rollout and verification.
- Product or operational constraints:
  - Authenticated users must be able to read suggestions and write back usage history.
  - Repeated writes for the same `(room_id, item_name, unit)` must increment `use_count` instead of resetting it.

## Assumptions

- The self-hosted Supabase `POST /pg/query` endpoint remains available with the existing service-role key from `fdc-lan-bridge/.env`.
- Room-management autocomplete will use the existing direct-table `upsert` pattern rather than an RPC.

## Affected Areas

- Files or directories:
  - `sql/20260401_supply_item_history.sql`
  - `fdc-lan-bridge/scripts/verifySupplyItemHistoryMigration.ts`
  - `tasks/todo.md`
  - `tasks/active/2026-04-01-supply-item-history.md`
  - `docs/superpowers/plans/2026-04-01-supply-item-history.md`
- Systems touched:
  - Self-hosted Supabase schema and RLS
  - Repo-local workflow tracking

## Role Split

- Planner: refresh the task spec, checklist, and execution plan for the focused supply-history backend task.
- Implementer: add the verification script, migration, and live rollout.
- Verifier: prove schema shape, trigger behavior, and ordering through the automated live script.
- Reviewer: confirm the backend preserves direct client upsert semantics and does not weaken access controls.

## Implementation Plan

- [x] Add the focused task spec and implementation plan.
- [x] Write the failing live verification script for schema and conflict-update behavior.
- [x] Add the idempotent SQL migration for table, indexes, trigger, and RLS.
- [x] Apply the migration to self-hosted Supabase.
- [x] Re-run the verification script and record evidence.

## Verification Plan

- Command or check 1: `cmd /c npx ts-node scripts/verifySupplyItemHistoryMigration.ts --expect-missing` in `fdc-lan-bridge` before the migration lands.
- Command or check 2: `cmd /c npx ts-node scripts/verifySupplyItemHistoryMigration.ts` in `fdc-lan-bridge` after applying the migration.
- Command or check 3: capture the live migration apply result from `POST /pg/query` plus the script output showing `use_count` increments and room ordering.

## Review Notes

- Findings:
  - None in the final diff. The backend keeps the direct-table `upsert(..., { onConflict: 'room_id,item_name,unit' })` contract by incrementing `use_count` in a trigger on the conflict-update path.
- Residual risks:
  - Manual `UPDATE` statements against the same row also increment `use_count`, because the table-level trigger treats updates as another observed use. That matches the intended autocomplete history path but should be kept in mind for ad-hoc admin edits.
  - The self-hosted `POST /pg/query` endpoint rejected the full migration body in one request during rollout, so live apply was completed with smaller sequential SQL chunks instead of a single raw file post.

## Closeout

- Final status: rolled-out and verified on self-hosted Supabase
- Follow-up tasks:
  - Wire the room-management frontend to read and write `fdc_supply_item_history` once the autocomplete UX is ready.
