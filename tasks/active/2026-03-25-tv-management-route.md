# Task Spec: tv-management-route

## Goal

- Problem: `Quản lý TV` hiện chỉ là một tab con trong `/admin`, nên người dùng `super_admin` rất dễ tưởng module này đã biến mất khỏi portal navigation.
- Desired outcome: Tạo route riêng `/tv-management` và đưa nó thành mục điều hướng riêng trong sidebar/bottom nav, đồng thời giữ tab `tv_screens` trong admin để không làm gãy luồng cũ.

## Scope

- In scope:
  - Thêm `ModuleKey` riêng cho TV management
  - Thêm route `/tv-management` trong `AppShell`
  - Thêm item điều hướng riêng trong sidebar/bottom nav cho `super_admin`
  - Tạo page mỏng tái sử dụng `TvScreensTab`
- Out of scope:
  - Đổi logic CRUD TV screens hoặc schema `fdc_tv_screens`
  - Thiết kế lại bottom nav để hiển thị nhiều hơn 4 icon chính
  - Thay đổi quyền của các role ngoài `super_admin`

## Constraints

- Technical constraints:
  - Giữ pages mỏng; logic dữ liệu vẫn nằm ở `useTvScreens`
  - Dùng `@/` imports
  - Không revert các thay đổi không liên quan trong worktree đang bẩn
- Product or operational constraints:
  - Tab admin `tv_screens` phải tiếp tục hoạt động như entry phụ
  - Route mới phải được guard bằng quyền truy cập module riêng

## Assumptions

- `tv_management` chỉ dành cho `super_admin`, giống phạm vi truy cập tab TV hiện tại trong admin.
- Bottom nav mobile chấp nhận hiển thị mục này trong nhóm `Thêm` nếu vượt quá 4 mục chính.

## Affected Areas

- Files or directories:
  - `src/types/roleCatalog.ts`
  - `src/lib/navigation.ts`
  - `src/App.tsx`
  - `src/app/tv-management/page.tsx`
  - `test/unit/navigation.test.ts`
  - `tasks/todo.md`
- Systems touched:
  - Portal routing
  - Portal module visibility/navigation

## Role Split

- Planner: Ghi task spec, checklist, và verification plan cho route/module mới.
- Implementer: Thêm `tv_management` module key, route `/tv-management`, nav item, và page wrapper.
- Verifier: Chạy test đơn vị cho navigation và build portal.
- Reviewer: Soát rủi ro regress navigation/permission và đảm bảo tab admin cũ vẫn còn.

## Implementation Plan

- [x] Ghi workflow files cho task `/tv-management`.
- [x] Viết test đỏ cho visibility của module/nav item `tv_management`.
- [x] Thêm `tv_management` vào type/navigation và tạo route `/tv-management`.
- [x] Tạo page mỏng tái sử dụng `TvScreensTab` và giữ tab admin cũ nguyên vẹn.
- [x] Chạy verification mục tiêu và ghi kết quả.

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\unit\navigation.test.ts`
- Command or check 2: `cmd /c npm run build`

## Review Notes

- Findings:
  - `Quản lý TV` đã có route riêng `/tv-management`, guard theo `moduleKey="tv_management"`, và vẫn giữ nguyên tab `tv_screens` trong admin.
- Residual risks:
  - Trên mobile, `super_admin` có nhiều hơn 4 module nên `Quản lý TV` sẽ xuất hiện trong sheet `Thêm` của bottom nav thay vì luôn hiện ở hàng icon chính. Đây là hành vi hiện có của navigation, không phải regression mới.

## Closeout

- Final status: done
- Follow-up tasks:
  - Browser smoke `/tv-management` với tài khoản `super_admin` để xác nhận active-state trên sidebar và sheet `Thêm` của bottom nav đúng như mong muốn.

## Verification Evidence

- `cmd /c npx tsx --test test\unit\navigation.test.ts`: passed, 2/2 tests covering the dedicated `/tv-management` nav item for `super_admin` and exclusion for non-admin roles.
- `cmd /c npm run build`: passed, Vite production build completed successfully; the existing large-chunk warning remains.
