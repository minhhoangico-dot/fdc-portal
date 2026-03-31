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
