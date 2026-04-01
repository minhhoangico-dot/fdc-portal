# Supply Item History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live-ready Supabase migration for `fdc_supply_item_history` and prove that repeated direct-table upserts increment usage counts instead of overwriting them.

**Architecture:** Keep the change additive inside `sql/` and preserve the intended frontend contract by handling repeated `upsert` writes with a table trigger instead of an RPC-only path. Use a focused TypeScript verification script in `fdc-lan-bridge/scripts/` to exercise the live `POST /pg/query` endpoint before and after rollout.

**Tech Stack:** PostgreSQL, Supabase RLS, TypeScript, `ts-node`, PowerShell-accessible self-hosted Supabase SQL endpoint

---

### Task 1: Red Phase Verification Script

**Files:**
- Create: `fdc-lan-bridge/scripts/verifySupplyItemHistoryMigration.ts`
- Test: `fdc-lan-bridge/scripts/verifySupplyItemHistoryMigration.ts`

- [x] **Step 1: Write the failing test script**

Create a script that:
- loads `fdc-lan-bridge/.env`
- calls `POST http://192.168.1.9:8000/pg/query`
- with `--expect-missing`, asserts `public.fdc_supply_item_history` does not exist yet
- without flags, asserts the table, indexes, policies, trigger, and increment behavior exist

- [x] **Step 2: Run the script to verify it fails before the migration**

Run: `cmd /c npx ts-node scripts/verifySupplyItemHistoryMigration.ts`
Expected: failure because `fdc_supply_item_history` or its trigger/policies are missing.

### Task 2: SQL Migration

**Files:**
- Create: `sql/20260401_supply_item_history.sql`
- Test: `fdc-lan-bridge/scripts/verifySupplyItemHistoryMigration.ts`

- [x] **Step 1: Write the migration**

Add:
- `CREATE TABLE IF NOT EXISTS public.fdc_supply_item_history`
- unique key on `(room_id, item_name, unit)`
- room/global indexes
- RLS enable + idempotent policies
- a trigger function that makes repeated direct-table conflict updates increment `use_count`

- [x] **Step 2: Apply the migration**

Run a `POST /pg/query` request that executes the SQL file contents against the self-hosted Supabase instance.

- [x] **Step 3: Re-run the verification script**

Run: `cmd /c npx ts-node scripts/verifySupplyItemHistoryMigration.ts`
Expected: PASS, including `use_count = 2` after two writes and correct room ordering by `use_count DESC`.

### Task 3: Workflow Proof

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/active/2026-04-01-supply-item-history.md`

- [x] **Step 1: Record verification evidence**

Capture the exact commands run and the key live results in the task spec and task board.

- [x] **Step 2: Mark the task checklist complete**

Update the workflow files to reflect implementation, verification, and remaining risks.
