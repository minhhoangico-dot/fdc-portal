# Admin TV Surface Removal Design

## Goal

Keep TV management accessible only through `/tv-management` and remove the duplicate `Màn hình TV` entry from `/admin`.

## Scope

- Remove the `Màn hình TV` tab from `AdminPage`
- Redirect legacy deep links `admin?tab=tv_screens` to `/tv-management`
- Keep `/tv-management` unchanged as the only management surface

## Approach

Use a small admin-navigation helper as the single source of truth for:

- the visible admin tab list
- legacy deep-link redirects from `/admin`

This keeps the behavior testable without rendering the whole admin screen and avoids leaving dead `tv_screens` state in `useAdmin`.

## Files

- Modify `src/app/admin/page.tsx` to consume the shared tab/redirect helper and remove the TV tab UI
- Modify `src/viewmodels/useAdmin.ts` to drop `tv_screens` from `AdminTab`
- Add `src/app/admin/admin-navigation.ts` for tab metadata and legacy redirect logic
- Add `test/unit/adminNavigation.test.ts` for regression coverage

## Verification

- `cmd /c npx tsx --test test\unit\adminNavigation.test.ts test\unit\navigation.test.ts`
- `cmd /c npm run build`
