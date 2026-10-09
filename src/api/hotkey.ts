// Crack hotkey: OS-wide global shortcut inside Tauri (works while ANY app —
// any AI agent — is focused), plus the in-browser listener for dev.
// Both call the same handler.

export const DEFAULT_HOTKEY_LABEL = "Ctrl+Alt+W";
const GLOBAL_SHORTCUT = "Ctrl+Alt+W";

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI__" in window &&
    window.__TAURI__ !== undefined
  );
}

export function registerInBrowserHotkey(handler: () => void): () => void {
  function onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "w") {
      event.preventDefault();
      handler();
    }
  }
  window.addEventListener("keydown", onKeyDown);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}

// Fire-and-forget: resolves true when the OS-wide shortcut is armed.
export async function registerGlobalHotkey(handler: () => void): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  try {
    const { register, isRegistered } = await import(
      "@tauri-apps/plugin-global-shortcut"
    );
    if (await isRegistered(GLOBAL_SHORTCUT)) {
      return true;
    }
    await register(GLOBAL_SHORTCUT, (event) => {
      if (event.state === "Pressed") {
        handler();
      }
    });
    return true;
  } catch {
    return false;
  }
}
