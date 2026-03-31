# Task Spec: head-nurse-role-label-encoding

## Goal

- Problem: The live employee portal shows the `head_nurse` role label as mojibake instead of Vietnamese text.
- Desired outcome: Repair the displayed `Điều dưỡng trưởng` label for existing seeded data and prevent future environments from seeding the corrupted text again.

## Scope

- In scope:
  - Portal-side role catalog normalization for corrupted seeded labels/descriptions
  - SQL correction for the `head_nurse` seed/update script
  - Targeted regression coverage and verification
- Out of scope:
  - Unrelated mojibake copy outside the role catalog path
  - Broad typography or CSS font changes

## Constraints

- Technical constraints:
  - The repo is in a dirty worktree, so edits must stay narrow.
  - The bug is in user-facing Vietnamese copy, so verification needs to check actual rendered source values, not just type safety.
- Product or operational constraints:
  - Existing live `fdc_role_catalog` rows may already contain the corrupted text.
  - Future DB seeds must preserve the proper Vietnamese label and description.

## Assumptions

- The screenshot corresponds to `TopBar` rendering `getRoleLabel('head_nurse')` from `RoleCatalogContext`.
- The portal should gracefully repair already-corrupted role catalog rows until the data is corrected at the source.

## Affected Areas

- Files or directories:
  - `src/lib/role-catalog.ts`
  - `src/contexts/RoleCatalogContext.tsx`
  - `sql/20260323_head_nurse_role.sql`
  - `sql/`
  - `test/unit/`
  - `tasks/`
- Systems touched:
  - Portal frontend
  - Supabase role catalog seed/update scripts

## Role Split

- Planner: capture the bug scope, root-cause evidence, and verification plan.
- Implementer: add regression coverage plus the portal/SQL fix.
- Verifier: run targeted tests/build and record any remaining rollout gap.
- Reviewer: confirm the fix stays limited to role catalog text handling and note residual deployment risk.

## Implementation Plan

- [x] Add failing regression coverage for corrupted `head_nurse` role catalog text.
- [x] Repair corrupted role catalog labels/descriptions in the portal merge path.
- [x] Fix the SQL script so fresh seeds use proper Vietnamese text.
- [x] Run targeted verification and record the lesson.

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\\unit\\roleCatalog.test.ts`
- Command or check 2: `cmd /c npm run build`
- Command or check 3: Verify the live `fdc_role_catalog.head_nurse` row with the service-role key and confirm the production portal serves the new bundle.

## Review Notes

- Findings:
  - Root cause was a corrupted `sql/20260323_head_nurse_role.sql` seed, not a font or CSS issue. `src/lib/role-catalog.ts` already stored the default label bytes correctly, but `RoleCatalogContext` trusted the live `fdc_role_catalog` row and rendered the mojibake payload from Supabase unchanged.
- Residual risks:
  - Other SQL files with operator-facing Vietnamese copy should still be reviewed for byte-level corruption when they are touched next.

## Closeout

- Final status: code fix, regression coverage, live role-catalog data repair, and Cloudflare Pages rollout are complete.
- Follow-up tasks:
  - None required for this bug beyond normal user smoke-checking in an authenticated session.
