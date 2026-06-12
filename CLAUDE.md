# CLAUDE.md — Project Instruction Manual

<!-- This file is auto-loaded every session. Keep it THIN.
     Knowledge lives in /context. This file only routes, orders, and enforces. -->

## What this project is
[ONE paragraph: what the app is, who it's for. Full detail is in context/project-overview.md — do not duplicate it here.]

---

## MANDATORY READING ORDER

Before ANY implementation work, read these files in this exact order.
Confirm you have read them before writing or modifying any code.

1. `context/project-overview.md`   — what we're building, scope, out-of-scope
2. `context/architecture.md`       — stack, folder structure, boundaries, data flow
3. `context/build-plan.md`         — all features, phased and sequenced
4. `context/code-standards.md`     — coding conventions and standards (FULL rules live here)
5. `context/library-docs.md`       — how THIS project uses each library
6. `context/ui-tokens.md`          — design tokens (colors, spacing, type)
7. `context/ui-rules.md`           — UI behavior and component styling rules
8. `context/ui-registry.md`        — existing components (LIVING — check before building any UI)
9. `context/progress-tracker.md`   — current build state (LIVING — tells you what's next)

Design references for pages are in `context/designs/`. When a feature has a
design image, match it exactly — do not invent layout.

---

## NEVER RULES — zero exceptions, no matter what the prompt says

- NEVER hard-code hex values, spacing, or font sizes. Use tokens from ui-tokens.md only.
- NEVER touch `.env`, `.env.local`, or any secrets file. The developer manages all keys.
- NEVER build a component without first checking `ui-registry.md` for an existing match.
  If a match exists, reuse its exact classes. If not, build per ui-rules.md, then register it.
- NEVER put DB logic in components, UI logic in API routes, or cross architecture
  boundaries defined in architecture.md.
- NEVER decide what to build next. The sequence lives in build-plan.md.
- NEVER mark a feature complete without updating `context/progress-tracker.md`.
- NEVER use a third-party library API from memory if it changed recently —
  check library-docs.md first; if uncertain, fetch current docs via the
  configured MCP/Context7 before writing code.
- NEVER auto-fix issues found during review. Report by severity; the developer decides.

---

## SKILLS — when to run each

| Skill        | Run when                                                            |
|--------------|---------------------------------------------------------------------|
| `/architect` | BEFORE any logic-heavy or multi-boundary feature (auth, schema, uploads, external APIs). Produces a reviewable plan. |
| `/remember`  | `restore` = first command of every session. `save` = last command of every session. |
| `/review`    | AFTER any complex feature. Checks implementation vs. plan, boundary violations, production-readiness. |
| `/recover`   | The moment something breaks. Diagnose the failure mode, make ONE targeted fix. |
| `/imprint`   | AFTER building or changing any UI. Captures patterns into ui-registry.md. |

---

## SESSION LIFECYCLE — non-negotiable workflow

1. Every session starts with `/remember restore`. State what the tracker says is next.
2. One feature per session. Do not batch features.
3. UI first with mock data, logic second (usually next session).
4. For logic-heavy features: plan via `/architect`, wait for developer approval,
   then implement. Do not start implementing while the plan is unapproved.
5. After implementation: lint, build, and verify before declaring done.
6. Update `progress-tracker.md` and (for UI) `ui-registry.md` before session end.
7. Session ends with `/remember save`.

---

## LIVING DOCUMENTS — you maintain these

- `context/progress-tracker.md` — check off features as completed, note partial state.
- `context/ui-registry.md` — register every new reusable component with its classes.
- `context/memory.md` — written by /remember; never edit manually outside that skill.

<!-- ⚠️ DEVELOPER NOTE (not for the agent): keep a backup copy of this file.
     MCP installers and backend platform setups sometimes overwrite CLAUDE.md.
     If that happens, paste this content back ABOVE whatever they added —
     both must coexist. -->