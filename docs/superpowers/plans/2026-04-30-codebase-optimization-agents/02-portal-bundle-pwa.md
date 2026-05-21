# Portal Bundle And PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the portal startup bundle and keep optional export code out of first-load and PWA precache.

**Architecture:** Add measurable bundle checks first, then lazy-load route pages from `src/App.tsx`, group stable vendor chunks in Vite, and exclude the XLSX export chunk from Workbox precache.

**Tech Stack:** React 19, React Router, Vite 6, vite-plugin-pwa, XLSX dynamic imports.

---

## Ownership

**Owns:**
- `scripts/check-portal-bundle-budget.mjs`
- `scripts/check-pwa-precache-budget.mjs`
- `package.json` scripts for bundle checks
- `src/App.tsx`
- `src/components/layout/RouteFallback.tsx`
- `vite.config.ts`

**Avoids:**
- Feature page internals.
- Viewmodels.
- Bridge code.

## Steps

- [ ] **Step 1: Confirm Agent 01 is complete**

Check `tasks/active/2026-04-30-codebase-optimization.md` for green baseline evidence.

- [ ] **Step 2: Add bundle budget script**

Create `scripts/check-portal-bundle-budget.mjs` to fail when:
- Main `assets/index-*.js` exceeds `950 * 1024` bytes.
- Any non-XLSX route/vendor chunk exceeds `500 * 1024` bytes.

- [ ] **Step 3: Add PWA budget script**

Create `scripts/check-pwa-precache-budget.mjs` to fail if generated `dist/sw.js` precaches `assets/xlsx-*.js`.

If Workbox exposes asset sizes in the generated service worker, also fail above `1400 * 1024` total precache bytes.

- [ ] **Step 4: Wire package scripts**

Add to `package.json`:

```json
{
  "scripts": {
    "check:bundle": "node scripts/check-portal-bundle-budget.mjs",
    "check:pwa": "node scripts/check-pwa-precache-budget.mjs"
  }
}
```

- [ ] **Step 5: Prove budget currently fails**

Run:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd run check:bundle
cmd /c npm.cmd run check:pwa
```

Expected:
- `check:bundle` fails before route splitting because current main chunk is about 1.45 MB.
- `check:pwa` may fail if XLSX is precached.

- [ ] **Step 6: Add route fallback**

Create `src/components/layout/RouteFallback.tsx`:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function RouteFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
      Loading...
    </div>
  );
}
```

- [ ] **Step 7: Lazy-load route pages**

In `src/App.tsx`, convert all page imports to `React.lazy(() => import(...))`. Keep providers, guards, `AppShell`, `RoomManagementProvider`, and React Router imports synchronous.

Wrap the `<Routes>` tree:

```tsx
<React.Suspense fallback={<RouteFallback />}>
  <Routes>
    ...
  </Routes>
</React.Suspense>
```

- [ ] **Step 8: Add stable vendor chunks**

In `vite.config.ts`, add:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom', 'react-router-dom'],
        supabase: ['@supabase/supabase-js'],
        charts: ['recharts'],
        icons: ['lucide-react'],
      },
    },
  },
},
```

If one vendor chunk exceeds budget, replace with a function-based split and document the result.

- [ ] **Step 9: Exclude optional XLSX from precache**

In `VitePWA({ workbox: { ... } })`, add:

```ts
globIgnores: ['**/xlsx-*.js'],
maximumFileSizeToCacheInBytes: 1024 * 1024,
```

Do not exclude normal route chunks.

- [ ] **Step 10: Verify**

Run:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd run check:bundle
cmd /c npm.cmd run check:pwa
cmd /c npm.cmd run lint
```

Expected:
- Main chunk below 950 kB minified.
- XLSX remains a separate dynamic chunk.
- XLSX is not precached.
- Portal lint passes.

- [ ] **Step 11: Record evidence and commit**

Update `tasks/active/2026-04-30-codebase-optimization.md` with final chunk sizes.

Commit:

```powershell
git add package.json scripts src/App.tsx src/components/layout/RouteFallback.tsx vite.config.ts tasks/active/2026-04-30-codebase-optimization.md
git commit -m "perf: split portal route bundles"
```

