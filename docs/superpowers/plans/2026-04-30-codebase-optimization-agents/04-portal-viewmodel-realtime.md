# Portal Viewmodel And Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move repeated viewmodel business helpers and Supabase realtime setup into focused, testable modules.

**Architecture:** Extract pure helper logic first with unit tests, then consolidate repeated realtime subscription boilerplate behind a small utility while keeping hooks responsible for React state and Supabase mutation sequencing.

**Tech Stack:** React hooks, Supabase JS, TypeScript, node:test/tsx.

---

## Ownership

**Owns:**
- `src/viewmodels/useApprovals.ts`
- `src/viewmodels/useAdmin.ts`
- `src/viewmodels/useRequests.ts`
- `src/viewmodels/useImportExport.ts`
- `src/viewmodels/useInventoryDashboardSummary.ts`
- `src/viewmodels/useNotifications.ts`
- `src/viewmodels/usePharmacyInventory.ts`
- `src/viewmodels/useSupplyChart.ts`
- `src/viewmodels/useSupplyInventory.ts`
- `src/lib/approval-actions.ts`
- `src/lib/admin-approval-template-draft.ts`
- `src/lib/supabase-realtime.ts`
- `test/unit/approvalActions.test.ts`
- `test/unit/supabaseRealtime.test.ts`

**Avoids:**
- Page/component presentation files owned by Agent 03.
- `src/App.tsx` and Vite config owned by Agent 02.
- Bridge code.

## Steps

- [ ] **Step 1: Confirm Agent 01 is complete**

Check the active task spec for green baseline evidence.

- [ ] **Step 2: Add approval action tests**

Create `test/unit/approvalActions.test.ts`.

Cover pure behavior:
- Empty selection throws a useful error.
- Non-empty selection returns stable IDs.
- Material consolidation groups by request/material identity if that logic exists in `useApprovals.ts`.

Expected before implementation:
- Test fails because `src/lib/approval-actions.ts` does not exist.

- [ ] **Step 3: Create approval helpers**

Create `src/lib/approval-actions.ts`:

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function assertNonEmptySelection(ids: string[]): string[] {
  if (ids.length === 0) {
    throw new Error('No approval requests selected.');
  }

  return ids;
}
```

Move only deterministic payload/grouping helpers from `useApprovals.ts`. Leave Supabase calls in the hook.

- [ ] **Step 4: Rewire useApprovals**

Import helpers using `@/lib/approval-actions`.

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\approvalActions.test.ts
cmd /c npm.cmd run build
```

- [ ] **Step 5: Extract admin draft helpers only if needed**

Inspect existing `src/lib/approval-config.ts`. If it already owns immutable approval-template draft behavior, reuse it and do not create a duplicate.

Otherwise create `src/lib/admin-approval-template-draft.ts` and wire `useAdmin.ts` to it.

Verify:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\approvalConfigState.test.ts
cmd /c npm.cmd run build
```

- [ ] **Step 6: Add realtime helper tests**

Create `test/unit/supabaseRealtime.test.ts` with a fake Supabase client/channel.

Assert:
- `.channel(channelName)` is called.
- Each subscription calls `.on('postgres_changes', config, callback)`.
- `.subscribe()` is called.
- Cleanup calls `removeChannel(channel)`.

- [ ] **Step 7: Create realtime helper**

Create `src/lib/supabase-realtime.ts`:

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PostgresChangeSubscription {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  table: string;
  filter?: string;
}

export function subscribeToPostgresChanges(
  supabase: { channel: (name: string) => any; removeChannel: (channel: any) => void },
  channelName: string,
  subscriptions: PostgresChangeSubscription[],
  onChange: () => void,
): () => void {
  const channel = supabase.channel(channelName);

  for (const subscription of subscriptions) {
    channel.on(
      'postgres_changes',
      {
        event: subscription.event ?? '*',
        schema: subscription.schema ?? 'public',
        table: subscription.table,
        ...(subscription.filter ? { filter: subscription.filter } : {}),
      },
      onChange,
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

If stricter Supabase types are ergonomic, replace `any` with local structural types.

- [ ] **Step 8: Migrate simple hooks first**

Update:
- `src/viewmodels/useRequests.ts`
- `src/viewmodels/useNotifications.ts`

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\supabaseRealtime.test.ts
cmd /c npm.cmd run build
```

- [ ] **Step 9: Migrate inventory/import hooks**

Update:
- `src/viewmodels/useImportExport.ts`
- `src/viewmodels/useInventoryDashboardSummary.ts`
- `src/viewmodels/useSupplyChart.ts`

Run build again.

- [ ] **Step 10: Migrate high-risk hooks**

Update:
- `src/viewmodels/useApprovals.ts`
- `src/viewmodels/usePharmacyInventory.ts`
- `src/viewmodels/useSupplyInventory.ts`

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\approvalActions.test.ts test\unit\supabaseRealtime.test.ts
cmd /c npm.cmd run build
cmd /c npm.cmd run lint
```

Expected:
- Tests pass.
- Build and lint pass.
- Existing subscription table/event/filter semantics are preserved.

- [ ] **Step 11: Record evidence and commit**

Update the active task spec with migrated hooks and verification results.

Commit:

```powershell
git add src/viewmodels src/lib/approval-actions.ts src/lib/admin-approval-template-draft.ts src/lib/supabase-realtime.ts test/unit/approvalActions.test.ts test/unit/supabaseRealtime.test.ts tasks/active/2026-04-30-codebase-optimization.md
git commit -m "refactor: extract portal viewmodel helpers"
```

