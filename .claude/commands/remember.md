---
description: Project memory — save session state at the end, restore it at the start
argument-hint: save | restore
---

Follow the instructions in `.agents/skills/remember/SKILL.md` exactly for this invocation.

Mode requested: $ARGUMENTS

Path override (per CLAUDE.md's living-documents list): read and write the project
memory at `context/memory.md`, NOT the project root.

- If the mode is empty, ask whether I want `save` or `restore`.
- `save`: capture only the essential, non-secret session state in the skill's format, then write `context/memory.md` (confirm before overwriting if it already exists).
- `restore`: read `context/memory.md` + the mandatory context files, then summarise where we are and what's next — and stop for my confirmation before continuing.
- Never write secrets, keys, tokens, or credentials into memory.
