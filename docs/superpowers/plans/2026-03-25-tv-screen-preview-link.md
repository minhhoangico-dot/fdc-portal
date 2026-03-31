# TV Screen Preview Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the TV management preview action so internal screens open the configured target route instead of always going through `/tv/{slug}`, and make the alias/target distinction explicit in the UI.

**Architecture:** Introduce a small pure helper that derives the preview URL from `TvScreen` shape. `TvScreensTab` remains the only UI consumer and will use the helper for the open icon plus a clearer alias label. The existing public alias route stays unchanged.

**Tech Stack:** React 19, TypeScript, node:test via `tsx`

---

### Task 1: RED test for preview-link derivation

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\tvScreenLinks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('internal tv preview uses configured contentUrl', () => {
  assert.equal(getTvScreenPreviewHref(screen), '/lab-dashboard/tv');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npx tsx --test test\unit\tvScreenLinks.test.ts`
Expected: FAIL because the helper does not exist yet.

### Task 2: GREEN implementation in helper + UI wiring

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\tv-screen-links.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\admin\TvScreensTab.tsx`

- [ ] **Step 1: Implement the helper**

Rules:
- `internal` => preview href is `contentUrl`
- `url` => preview href is `/tv/{slug}`
- public alias text remains `/tv/{slug}`

- [ ] **Step 2: Wire the open icon to the helper**

Use the helper instead of hard-coded `/tv/${screen.slug}`.

- [ ] **Step 3: Clarify alias text**

Rename the small helper text under the TV name so operators can distinguish alias/public URL from target route.

- [ ] **Step 4: Re-run the unit test**

Run: `cmd /c npx tsx --test test\unit\tvScreenLinks.test.ts`
Expected: PASS

### Task 3: Verify build and document the result

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-25-tv-screen-preview-link.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`

- [ ] **Step 1: Run portal build**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 2: Record verification**

Save the exact command results in the task spec/checklist.
