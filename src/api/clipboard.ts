// Clipboard helper: native Tauri clipboard when running inside Tauri,
// else Web Clipboard API, else hidden-textarea fallback.
// No network involved (offline-first per PRD).

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI__" in window &&
    window.__TAURI__ !== undefined
  );
}

export async function copyText(text: string): Promise<void> {
  if (isTauri()) {
    try {
      const { writeText } = await import(
        "@tauri-apps/plugin-clipboard-manager"
      );
      await writeText(text);
      return;
    } catch {
      // Fall through to Web API so the app never hard-fails on copy.
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) {
    throw new Error("fallback copy failed");
  }
}
