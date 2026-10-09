import type { Lang } from "../i18n/strings";

export interface AppSettings {
  hotkey: string;
  soundOn: boolean;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  lang: Lang;
}

const STORAGE_KEY = "shalaghi.settings.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: "Ctrl+Alt+W",
  soundOn: true,
  alwaysOnTop: true,
  clickThrough: false,
  lang: "fa",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (merged.lang !== "fa" && merged.lang !== "en") {
      merged.lang = DEFAULT_SETTINGS.lang;
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
