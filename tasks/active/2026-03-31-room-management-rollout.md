# Task Spec: room-management-rollout

## Goal

- Problem: The live portal at `https://portal.fdc-nhanvien.org` is still serving an older frontend bundle that does not include the already-implemented `Quản lý phòng` sidebar item.
- Desired outcome: Production serves the current portal bundle so `Quản lý phòng` appears in the authenticated sidebar and `/room-management` is reachable.

## Scope

- In scope:
  - Verify the local repo still contains the room-management navigation and route.
  - Rebuild the portal bundle.
  - Deploy the portal bundle to the existing Cloudflare Pages project.
  - Verify the live portal HTML points at the new asset hash after rollout.
- Out of scope:
  - New room-management feature work beyond the existing scaffold.
  - Backend or Supabase changes.

## Constraints

- Technical constraints:
  - Do not deploy without a successful local build.
  - Treat this as a rollout/debugging task rather than a new feature implementation.
- Product or operational constraints:
  - The fix is only real once the public portal serves the updated bundle.

## Assumptions

- `fdc-portal` remains the correct Cloudflare Pages project for the portal frontend.
- The current local room-management scaffold is the intended production payload for this issue.

## Affected Areas

- Files or directories:
  - `dist/`
  - `tasks/todo.md`
  - `tasks/active/2026-03-31-room-management-rollout.md`
- Systems touched:
  - Cloudflare Pages deployment for `portal.fdc-nhanvien.org`

## Role Split

- Planner: capture rollout scope, evidence expectations, and residual risks.
- Implementer: rebuild and deploy the current frontend bundle.
- Verifier: compare the live portal asset hash before and after deployment.
- Reviewer: confirm the symptom was a rollout gap rather than missing source code.

## Implementation Plan

- [x] Record the rollout task in `tasks/todo.md`.
- [x] Run local verification for the room-management navigation/build state.
- [x] Deploy the current `dist/` bundle to Cloudflare Pages.
- [x] Verify the live portal serves the new asset hash and document the result.

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\\unit\\navigation.test.ts` -> passed, 4/4 tests including the `/room-management` assertion.
- Command or check 2: `cmd /c npm run build` -> passed, Vite production build completed successfully and emitted `assets/index-BZgJhm-U.js`.
- Command or check 3: `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true` -> passed; deployment URL `https://6d2e6743.fdc-portal.pages.dev`.
- Command or check 4: `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org` -> passed; live HTML now points at `assets/index-BZgJhm-U.js` instead of the old `index-CEz0pAN3.js`.
- Command or check 5: `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/assets/index-BZgJhm-U.js` -> passed; deployed bundle contains `/room-management`.
- Command or check 6: `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/room-management` -> passed with status `200`.

## Review Notes

- Findings: the live symptom was caused by an undeployed frontend bundle, not by missing source code.
- Residual risks: browsers with an old service worker or cached tab can keep showing the pre-rollout sidebar until the user hard-refreshes or reopens the portal.

## Closeout

- Final status: completed
- Follow-up tasks:
  - Do a visual browser smoke on an authenticated session after cache refresh to confirm the sidebar label renders as expected.
