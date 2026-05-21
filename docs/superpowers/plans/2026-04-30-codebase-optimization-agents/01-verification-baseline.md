# Verification Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reliable portal and bridge verification before optimization changes start.

**Architecture:** This agent creates the repo workflow task spec, fixes the known bridge test fixture break, and narrows TypeScript checking so portal lint measures portal code instead of prototypes and bridge tests.

**Tech Stack:** TypeScript, Vite, Jest/ts-jest, node:test/tsx, repo `tasks/` workflow.

---

## Ownership

**Owns:**
- `tasks/active/2026-04-30-codebase-optimization.md`
- `tasks/todo.md`
- `tsconfig.json`
- `package.json` only if a separate portal lint script is required
- `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`

**Avoids:**
- Portal implementation files under `src/**` except config-only typecheck fallout.
- Bridge production code under `fdc-lan-bridge/src/**`.

## Steps

- [ ] **Step 1: Create the active task spec**

Create `tasks/active/2026-04-30-codebase-optimization.md` from `tasks/templates/task-spec.template.md`.

Record:
- Problem: optimization is unsafe while verification is noisy or failing.
- Desired outcome: green baseline plus measurable bundle/module improvements.
- Scope: verification baseline, bundle split, refactors, bridge modularization, final verification.
- Out of scope: behavior changes, visual redesign, live SQL index rollout without measurement.

- [ ] **Step 2: Update the shared task board**

Update `tasks/todo.md` current task:

```md
- Task ID: `codebase-optimization`
- Owner: `planner`
- Status: `planned`
- Spec: `tasks/active/2026-04-30-codebase-optimization.md`
```

Add checklist items matching this folder's six agent plans.

- [ ] **Step 3: Confirm failing baseline**

Run at repo root:

```powershell
cmd /c npm.cmd run lint
```

Run in `fdc-lan-bridge`:

```powershell
cmd /c npm.cmd test -- --runInBand
```

Expected before fixes:
- Root lint fails on bridge Jest globals and `to be intergrate/**` prototype files.
- Bridge tests fail in `labDashboardSourceProvenance.test.ts` because TAT fixtures are missing `testName`.

- [ ] **Step 4: Narrow portal TypeScript scope**

Modify `tsconfig.json` while preserving existing `compilerOptions`.

Preferred shape:

```json
{
  "include": ["src", "test", "vite.config.ts"],
  "exclude": [
    "dist",
    "node_modules",
    "fdc-lan-bridge",
    "to be intergrate",
    ".worktrees",
    ".wrangler"
  ]
}
```

If root `test/**` creates typecheck problems unrelated to portal production code, create `tsconfig.portal.json` with `include: ["src", "vite.config.ts"]` and update `package.json` lint to `tsc --noEmit -p tsconfig.portal.json`.

- [ ] **Step 5: Fix bridge TAT provenance fixtures**

In `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`, add `testName` to each `LabDashboardTatDetailRow` fixture missing it:

```ts
testName: 'CBC',
```

Use simple stable values unless test assertions need distinct names.

- [ ] **Step 6: Verify**

Run at repo root:

```powershell
cmd /c npm.cmd run lint
cmd /c npm.cmd run build
```

Run in `fdc-lan-bridge`:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd test -- --runInBand
```

Expected:
- Portal lint passes for the intended portal scope.
- Portal build passes, large chunk warning may remain.
- Bridge build passes.
- Bridge tests pass.

- [ ] **Step 7: Record evidence**

Append command results and any residual risk to `tasks/active/2026-04-30-codebase-optimization.md`.

- [ ] **Step 8: Commit**

```powershell
git add tsconfig.json package.json tasks/active/2026-04-30-codebase-optimization.md tasks/todo.md fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts
git commit -m "chore: restore optimization verification baseline"
```

