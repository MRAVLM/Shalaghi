# AGENTS.md — Shalaghi / VCNO

Source of truth for all coding agents (Codex, Claude Code, Cursor, Copilot, Gemini CLI, Windsurf, OpenCode, Antigravity, Freebuff). Read this first.

## 1. What this repo actually is

* VCNO workflow system: prompt-based skills + docs + validator. **Not an executable app.**
* `backend/` and `frontend/` contain only `README.md` — no `package.json`, no code, no endpoints. Do not claim `npm run dev/test` works.
* Real, working parts: `skills/*/SKILL.md`, `docs/`, `scripts/validate.py`, CI `.github/workflows/validate.yml`.

## 2. Product direction: Shalaghi (not yet implemented)

User brief (authoritative until `/PRD` overrides it):

* Desktop overlay app named **Shalaghi**: on run, shows a whip animation on the desktop (fun layer).
* Practical layer: agent-agnostic prompt booster (e.g. `faster` / `run faster`) that pushes any AI coding agent to respond faster — must work the same on Claude Code, Codex, Antigravity, OpenCode, Freebuff, Gemini, etc. (no per-agent fork).
* Distribution: Windows `.exe`, Linux `.deb`, plus macOS / most major OSes.
* The whip animation is load-bearing: it must actually render and trigger at runtime. Never claim it works without running the built artifact and verifying visually.
* Stack and packaging (Tauri / Electron / other) are **undecided** — decide in `/check` → `/PRD`, not by guessing in code. Until then, `backend/README.md` and `frontend/README.md` are proposals only.

## 3. How to work

Skill order: `/init → /check → /PRD → /Build → /Feedback ↺ → /Doc`. Details in `skills/README.md`.

* `/init`, `/check`, `/PRD`: context / validation / plan only — **do not write code**.
* Only `/Build` (and `/Feedback` for follow-ups) may change code. `/Build` requires a `READY FOR BUILD` PRD; never bypass `/check`/`/PRD` because "coding looks easy".
* `/Doc`: docs only, must describe reality, not intent. No unverified success claims.
* Big change first in docs/skill, then code. Preserve uncommitted user changes; never `git reset --hard` / `git clean` / silent overwrite.

## 4. Commands that actually work

```bash
python3 scripts/validate.py   # only enforced check today; also runs on every push/PR via CI
```

* Checks: `SKILL.md` frontmatter (`name:` kebab-case == parent dir, `description:` >= 20 chars) + all relative Markdown links resolve (code-fence links ignored; skips `.git/`, `node_modules/`, `.freebuff/`).
* `npm run typecheck` / `npm run test` / `npm run dev` do **not** exist yet (no `package.json`). They become mandatory only after scaffold, per `docs/conventions.md`.

## 5. Conventions (repo-specific)

* Prose/docs/commits: Persian explanation allowed; code, filenames, identifiers: English only.
* Filenames `kebab-case`; vars/funcs `camelCase`; classes/types `PascalCase`; constants `UPPER_SNAKE`. Commits English, imperative, scoped (e.g. `feat(shalaghi): ...`, `docs: ...`, `fix(ci): ...`).
* Backend layering `route → service → db` (no logic in routes); frontend `page → component → api` (`fetch` only in `frontend/src/api/`). Keep files \~300 lines max.
* New skill: copy `skills/_template/`, `name:` must equal directory name, register in `skills/README.md`, then run validator.

## 6. Source of truth vs shims

Content lives only in `AGENTS.md` + `skills/`. Never edit shims independently:

* `CLAUDE.md`, `GEMINI.md`, `.windsurfrules`, `.github/copilot-instructions.md`, `.claude/skills/*/SKILL.md` are pointers — they copy nothing.

## 7. Key references

* Skills: `skills/README.md` · Conventions: `docs/conventions.md` · Architecture (implemented vs planned): `docs/architecture.md`
* Setup: `docs/getting-started.md` · API contract (empty until `/Build`): `docs/api.md` · Backend proposal: `backend/README.md` · Frontend proposal: `frontend/README.md`


