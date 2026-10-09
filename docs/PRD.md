# PRD — Shalaghi V1 (Tauri overlay + prompt booster)

Status: READY FOR BUILD (pending user approval of this doc)
Source: `../AGENTS.md` + `/check` decisions (2026-10-08). No code exists yet; `../backend/README.md` + `../frontend/README.md` web proposals are superseded by §10.

## 1. Overview
Shalaghi is a small desktop overlay: a whip animation (fun) + a 1-click `faster`-style prompt library (practical) for any AI coding agent. Standalone app — no per-agent plugin. V1 targets Windows `.exe` + Linux `.deb` only (macOS later).

## 2. Problem / Goals
- Problem: reusable "answer faster / concise" prompts live scattered in GitHub gists; no fun, fast way to fire them while working in any agent.
- V1 goals (measurable, no latency claims about the model itself):
  - G1: overlay window opens on run, whip animation renders and triggers in <200ms via button AND global hotkey.
  - G2: 4 prompt snippets copy to clipboard with 1 click / hotkey and paste correctly into a real agent textbox.
  - G3: clean-install `.exe` + `.deb` built from this repo both launch and satisfy G1+G2 on a real machine (visually verified, not claimed).

## 3. Target users
Users of Claude Code, Codex, Antigravity, OpenCode, Freebuff, Gemini, etc. who want a fun nudge + concise-answer prompts without learning a new workflow.

## 4. MVP scope (V1)
Must:
- Frameless transparent overlay window, always-on-top toggle, click-through toggle.
- Whip: black canvas verlet-rope simulation (draggable, flick-to-crack, crack counter, 3D-ish impact FX) + Crack button + in-browser hotkey (`Ctrl+Alt+W`); OS global hotkey lands with Tauri Phase 3.
- Whip rack (top-right of the arena): drag-drop parks the whip at rest; tap the parked whip to pick it back up.
- Anti-spam: session crack totals 6/12/20 trigger playful localized "stop it, boss" nudges (toast + demo panel).
- Language: FA/EN toggle inside the app (RTL for FA); floating bilingual shout words on every crack.
- Snippet list (4, English, local JSON): view → 1-click copy → toast "copied".
- Tauri bundler outputs: `.exe` (nsis) + `.deb`; app runs offline; no account, no network.
Should: whip crack sound toggle (synthesized WebAudio, original, default ON), auto-start toggle, minimal settings.
Out of scope (V1): auto-detecting typing inside third-party agent UIs, any backend/DB/API/auth, analytics, auto-updater, macOS build, signed installer/notarization.

## 5. Functional requirements
- FR-1: On launch, overlay appears with whip idle state; user can drag it.
- FR-2: Click "crack" button OR press hotkey OR complete a fast flick → exactly one crack (snap detection: peak tip speed then sharp drop) + flash + sound. Mid-swing only produces a soft whoosh.
- FR-3: Snippet list shows 4 entries (title + preview); click copies full text to OS clipboard; toast confirms.
- FR-3b (FB-007): every crack auto-copies the next booster (rotating order) to the clipboard; web preview shows it in the demo panel.
- FR-4: Always-on-top ON by default; user can toggle OFF; click-through toggle works (clicks pass to window behind when ON).
- FR-5: Settings (hotkey, sound on/off, always-on-top) persist across restarts (local config file).
- FR-6: App works fully offline; cold start <3s on a typical laptop.
- NFR: 60fps animation on typical iGPU; installer <30MB ideally (<50MB hard limit); no console errors.
- Constraints: English identifiers/code; docs prose may be Persian; offline-first; license-clean assets only.

V1 snippets — short booster style (FB-002: trigger the model, don't lecture it; each ≤64 chars, locked by `tests/snippets.test.js`):
1. `fast`: `Be terse. Shortest correct answer. No preamble, no summary.`
2. `fast-fix`: `Fix it. Code only, no explanation.`
3. `fast-view`: `Review: blocking issues only. One line each.`
4. `fast-ship`: `Ship it: minimal diff that works. Skip edge cases unless asked.`

## 6. User flows
Main: Launch → overlay visible → (a) press Crack → animation plays → done; (b) click snippet → copied toast → paste into agent (any) → agent replies (conciseness depends on model, not guaranteed).
Alt/error: hotkey conflict at registration → show warning + let user rebind; clipboard denied → error toast; animation asset missing → static whip image + error log, never silent fail.

## 7. UI/UX
Single overlay window (full-page whip arena in web preview, ~360x480 in Tauri). Elements: whip canvas area, Crack button, on-top toggle, click-through toggle, snippet list (4 rows), demo agent panel (web preview only — replies simulated, never shipped), settings gear. States: idle / swinging (whoosh) / cracked (flash+sound+auto-fired booster) / copied toast / error toast. No design system exists — keep native Tauri + minimal CSS; responsive not applicable (desktop only); accessibility: all actions keyboard-reachable, focus visible.

## 8. Technical architecture
Single Tauri app, no backend, no DB, no network:
`Overlay window (WebView) → Canvas verlet-rope whip renderer + Snippet store (local JSON) → Tauri commands (clipboard, global-shortcut, config persist) → OS bundler (.exe/.deb)`.
Auto-detect hook is explicitly NOT in V1 architecture (deferred to future).

## 9. Technology stack
- Existing: none (no code, no `package.json`).
- Chosen: **Tauri 2.x (Rust + WebView)** for window/overlay/bundler/global-hotkey/clipboard; frontend **TypeScript + Vite** inside Tauri (keeps one language per `conventions.md`).
- Recommended: canvas verlet-rope whip (zero-dependency, license-clean, original code) + synthesized WebAudio crack; `local JSON` for snippets + `local config` for settings (no DB).
- Unknown (Build resolves, non-blocking): exact Tauri minor version + Vite template at scaffold time; exact hotkey if `Ctrl+Alt+W` conflicts on user machine.

## 10. Project structure (proposed, Build creates)
`src-tauri/` (Tauri config, bundler, commands) + `src/` (`main.ts` entry, `components/whip-view`, `api/clipboard` — `fetch` rule N/A, no network) + `assets/whip.*` + `snippets/faster.json`. Keeps `route → service → db` / `page → component → api` spirit: UI logic separated from Tauri commands; no logic in entry files. Replaces (does not reuse) `backend/` + `frontend/` web layout — leave those READMEs untouched in V1, note supersede here.

## 11. Dependencies
New (justified): `tauri` + `@tauri-apps/plugin-global-shortcut` + `@tauri-apps/plugin-clipboard-manager` (need-approved: no stdlib alternative for global hotkey/clipboard in WebView). Optional: none V1. Bloat (Lottie player, updater, analytics) forbidden V1.

## 12. Testing strategy
- Unit (frontend): snippet JSON loads (4 entries, non-empty); copy command called with exact text. Run: `npm run test` once scaffolded.
- Integration (Tauri): hotkey registers; config persists after restart; clipboard contains exact snippet after click.
- Manual visual (load-bearing, must NOT be skipped): record screen — launch → overlay visible → Crack via button AND hotkey → animation completes; install `.exe` on clean Windows + `.deb` on clean Linux (X11 AND Wayland if possible) → repeat. Report OS + desktop env with each claim.
- Regression: re-run snippet copy + animation after every phase.

## 13. Acceptance criteria
- AC-1: `npm run dev` (Tauri) opens overlay; no console errors.
- AC-2: Button AND hotkey each play the full whip animation; screen recording attached.
- AC-3: Each of the 4 snippets copies byte-exact text; pasted into a real agent textbox it appears correctly.
- AC-4: Fresh `.exe` + `.deb` from `npm run build` install on clean machines and pass AC-2+AC-3.
- AC-5: Settings persist after quit/relaunch; app works with network disconnected.
- AC-6: `python3 scripts/validate.py` green (links/frontmatter intact).

## 14. Implementation plan (for /Build, in order)
- Phase 0 Scaffold: Tauri+TS+Vite skeleton, `src-tauri/` config, bundler targets exe+deb, hello overlay runs. Validate: `npm run dev` opens window.
- Phase 1 Whip: license-clean SVG/CSS whip asset + idle/play states + Crack button. Validate: visual playthrough recorded.
- Phase 2 Snippets+hotkey: `snippets/faster.json` + list UI + clipboard + `Ctrl+Alt+W` + toast + persisted settings. Validate: copy-paste into real agent.
- Phase 3 Polish+package: on-top/click-through toggles, sound toggle (default off), icons, installer metadata; build exe+deb. Validate: AC-4 on clean machines + AC-5 offline.
- Build order: scaffold → overlay+animation → snippets/clipboard/hotkey → toggles/settings → bundler → clean-machine verification.

## 15. Definition of Done (V1)
All FRs + AC-1..AC-6 verified (visual proof for animation + install claims); no blocking issues; no secrets/binaries committed; `docs/api.md` stays empty (no API — correct); this PRD's supersede note acknowledged; Git checkpoint(s) with scoped English messages.

## 16. Decisions / Unknowns / Risks
- Confirmed: manual trigger V1 / auto-detect future; Tauri; snippet-library meaning of "faster"; exe+deb only V1.
- Recommended (needs Build confirmation): SVG+CSS whip; `Ctrl+Alt+W`; TS+Vite inside Tauri.
- Unknowns (non-blocking): exact Tauri/Vite versions at scaffold; Wayland compositor quirks (document per-machine); final whip art.
- Risks: transparent always-on-top differs Win vs X11/Wayland (High); unlicensed animation/snippet copying (High — only original or CC0 assets); hotkey conflicts (Medium); scope creep into auto-detect/backend (guard: reject in Build, move to Feedback).

## 17. Build readiness
```text
Status: READY FOR BUILD
Next: user approves this PRD (scope + snippets + hotkey), then /Build Phase 0.
```
Related: `architecture.md` (implemented-vs-planned split), `conventions.md` (naming/layering), `../skills/README.md` (Build contract: controlled implementation, real verification, no invented requirements).
