//! Shalaghi V1 — Tauri shell: overlay window + global shortcut + clipboard.
//! The UI (whip physics, boosters, demo chat) lives in the frontend;
//! this shell only wires OS-level powers: system-wide hotkey registration
//! and native clipboard, so the app works the same no matter which AI
//! coding agent (Claude Code, Codex, Antigravity, OpenCode, Freebuff,
//! Gemini, …) the user pastes boosters into.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .run(tauri::generate_context!())
        .expect("error while running Shalaghi");
}
