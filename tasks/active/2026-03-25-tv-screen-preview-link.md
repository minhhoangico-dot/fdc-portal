# Task Spec: tv-screen-preview-link

## Goal

- Problem: `TvScreensTab` displays the configured `contentUrl`, but the preview icon always opens `/tv/{slug}`. For `internal` screens this creates a visible URL mismatch and forces operators through an extra redirect path that can fail or feel broken.
- Desired outcome: Make the preview action open the effective screen URL for each TV type, and clarify in the UI that `/tv/{slug}` is the public alias while `contentUrl` is the configured internal target.

## Scope

- In scope:
  - Add a helper that derives the effective preview URL from `TvScreen`
  - Use that helper in `TvScreensTab`
  - Clarify the alias/target wording in the TV management table
  - Add unit coverage for the preview-link behavior
- Out of scope:
  - Changes to `fdc_tv_screens` schema or bridge TV access policy
  - Reworking the `/tv/:slug` redirect route itself

## Constraints

- Technical constraints:
  - Keep CRUD/data loading in `useTvScreensAdmin`
  - Follow TDD with a failing unit test before implementation
  - Do not revert unrelated local changes
- Product or operational constraints:
  - Public slug access `/tv/{slug}` must remain valid
  - External URL screens should continue previewing through the public slug wrapper

## Assumptions

- For `internal` screens, operators expect the preview icon to open the configured route shown in the URL column.
- The small alias text under the name cell can be clarified without redesigning the table layout.

## Affected Areas

- Files or directories:
  - `src/app/admin/TvScreensTab.tsx`
  - `src/lib/tv-screen-links.ts`
  - `test/unit/tvScreenLinks.test.ts`
  - `tasks/todo.md`
- Systems touched:
  - Portal TV management UI

## Role Split

- Planner: capture the mismatch, fix scope, and verification commands.
- Implementer: add helper/test and wire the preview action/UI copy.
- Verifier: run targeted unit test and portal build.
- Reviewer: confirm preview semantics are now consistent for both `internal` and `url` screens.

## Implementation Plan

- [x] Save the follow-up task in workflow files.
- [x] Add a failing unit test for TV preview URL derivation.
- [x] Implement preview-link helper and use it in `TvScreensTab`.
- [x] Clarify alias text in the table UI.
- [x] Run targeted verification and record evidence.

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\unit\tvScreenLinks.test.ts`
- Command or check 2: `cmd /c npm run build`

## Review Notes

- Findings:
  - `internal` TV rows now preview via their configured target route instead of always using the slug wrapper URL.
  - The table now labels `/tv/{slug}` explicitly as the public alias, which removes the operator-facing URL mismatch.
- Residual risks:
  - This session verified the deployed bundle hash and static route response, but did not run a full interactive browser click-through after deploy.

## Closeout

- Final status: done
- Follow-up tasks:
  - Browser-smoke the preview icon on an `internal` row and an external `url` row to confirm both open the expected destination in a new tab.

## Verification Evidence

- `cmd /c npx tsx --test test\unit\tvScreenLinks.test.ts`: passed, 3/3 tests covering internal preview target, external wrapper route, and public alias formatting.
- `cmd /c npm run build`: passed, Vite production build completed successfully; the existing large-chunk warning remains.
- `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed, deployment URL `https://2cac7f1d.fdc-portal.pages.dev`.
- Live custom-domain check on `2026-03-25`: `https://portal.fdc-nhanvien.org/` now serves `assets/index-BRr6YnhA.js`, and the deployed bundle contains the new `Alias cong khai` copy.
