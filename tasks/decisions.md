# Decisions

This file stores durable decisions that new agents should inherit without rediscovering them.

## Architecture Baseline

### 2026-03-19 - Portal uses MVVM

- Pages in `src/app/**/page.tsx` stay focused on UI composition.
- Data fetching, state, and business logic belong in `src/viewmodels/use*.ts`.

### 2026-03-19 - Bridge owns external system sync

- HIS and MISA integration logic belongs in `fdc-lan-bridge/`.
- The portal consumes synced data and operational endpoints instead of embedding bridge logic.

### 2026-03-19 - Shared workflow files are canonical for multi-agent work

- `tasks/` is the repo-local source of truth for planning, handoffs, lessons, and durable coordination.
- New agents should inherit context from these files before acting.

## Decision Entry Template

### YYYY-MM-DD - Short decision title

- Context:
- Decision:
- Consequence:
- Revisit when:

## 2026-07-08 — UX redesign direction confirmed (Minh approved defaults)

- Visual identity: paper/ink surfaces + viridian green brand (#0B7A5C) + vermilion seal red for completed approvals; replaces default indigo. Font: Be Vietnam Pro, self-hosted.
- IA: 5-item primary nav (Hom nay / Can xu ly / workspace / Tra cuu / Ca nhan). TV/print/admin leave primary nav; weekly-report lives under Tra cuu.
- Home is composed from the permission-keyed widget registry (src/lib/home-widgets.ts). Never hardcode role arrays in pages - key everything off PermissionAction.
- Migration is strangler-style in 4 phases. Inviolable: existing URLs, permission-matrix semantics, the bridge contract, Vietnamese labels.
- head_nurse authority contradiction (FULL_ACCESS_ROLES vs OnsiteAccessGate): keep current behavior through Phase 3; explicit decision required before Phase 4.

Source: tasks/active/2026-07-08-ux-redesign-user-centric.md (+ §8 open decisions, defaults approved by Minh 2026-07-08).
