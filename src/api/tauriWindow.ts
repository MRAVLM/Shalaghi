// Tauri window powers: real always-on-top + click-through on the OS window.
// No-ops outside Tauri (browser dev keeps working with CSS-only behavior).

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI__" in window &&
    window.__TAURI__ !== undefined
  );
}

async function currentWindow(): Promise<{ setAlwaysOnTop: (v: boolean) => Promise<void>; setIgnoreCursorEvents: (v: boolean) => Promise<void> } | null> {
  if (!isTauri()) {
    return null;
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  } catch {
    return null;
  }
}

export async function applyAlwaysOnTop(on: boolean): Promise<void> {
  try {
    await currentWindow()?.then((w) => w?.setAlwaysOnTop(on));
  } catch {
    // Browser dev: silently ignore.
  }
}

export async function applyClickThrough(on: boolean): Promise<void> {
  try {
    await currentWindow()?.then((w) => w?.setIgnoreCursorEvents(on));
  } catch {
    // Browser dev: silently ignore.
  }
}
