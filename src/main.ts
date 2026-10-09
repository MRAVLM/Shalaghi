import "./styles/app.css";
import { createWhipView } from "./whip/whipView";
import { loadSnippets, type PromptSnippet } from "./snippets/snippetStore";
import { renderSnippetList } from "./snippets/snippetList";
import { createDemoChat } from "./demo/demoChat";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
} from "./settings/appSettings";
import { DEFAULT_HOTKEY_LABEL, registerInBrowserHotkey, registerGlobalHotkey } from "./api/hotkey";
import { applyAlwaysOnTop, applyClickThrough } from "./api/tauriWindow";
import { copyText } from "./api/clipboard";
import { playWhipCrack } from "./api/sound";
import { spamLevel } from "./api/spamGuard";
import { spawnShout } from "./ui/shouts";
import { showToast } from "./ui/toast";
import { STRINGS, SPAM_MESSAGES, pick, type Lang } from "./i18n/strings";

function currentLang(): Lang {
  return loadSettings().lang === "en" ? "en" : "fa";
}

function renderHeader(tagText: string): { header: HTMLElement; tag: HTMLElement } {
  const header = document.createElement("header");
  header.className = "app-header";
  const title = document.createElement("h1");
  title.textContent = "Shalaghi";
  const tag = document.createElement("span");
  tag.className = "hint";
  tag.textContent = tagText;
  header.append(title, tag);
  return { header, tag };
}

function main(): void {
  const app = document.querySelector("#app");
  if (app === null) {
    return;
  }
  let lang = currentLang();
  const t = () => STRINGS[lang];

  let snippets: PromptSnippet[] = [];
  try {
    snippets = loadSnippets();
  } catch {
    showToast(t().copyFail, true);
  }
  // Rotating auto-fire: each crack sends the next booster, no clicking needed.
  let fireIndex = 0;
  // Anti-spam: session crack total drives the "stop it, boss" nudges.
  let sessionCracks = 0;
  let lastSpamLevel = 0;
  // Set when the OS-wide hotkey arms (Tauri only); shown on the button.
  let globalArmed = false;

  const demo = createDemoChat({
    head: t().demoHead,
    badge: t().demoBadge,
    empty: t().demoEmpty,
    lang,
  });

  function applyLang(next: Lang): void {
    lang = next;
    saveSettings({ ...loadSettings(), lang });
    document.documentElement.lang = next;
    document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
    tag.textContent = t().tagline;
    crackButton.textContent =
      t().crackButton.replace("{hotkey}", DEFAULT_HOTKEY_LABEL) + (globalArmed ? " 🌍" : "");
    buildToggles();
    hint.textContent = t().hint;
    listHead.textContent = t().boostersHead;
    faButton.classList.toggle("active", next === "fa");
    enButton.classList.toggle("active", next === "en");
    demo.setLabels({ head: t().demoHead, badge: t().demoBadge, empty: t().demoEmpty, lang: next });
    whip.setLabels({ rackMain: t().rackMain, rackSub: t().rackSub, crackWord: t().crackWord });
  }

  function fireBooster(): void {
    if (snippets.length === 0) {
      return;
    }
    const snippet = snippets[fireIndex % snippets.length];
    fireIndex += 1;
    void copyText(snippet.text)
      .then(() => {
        demo.sendBooster(snippet);
        showToast(t().fired.replace("{id}", snippet.id));
      })
      .catch(() => {
        showToast(t().copyFail, true);
      });
  }

  function onWhipCracked(x: number, y: number): void {
    if (loadSettings().soundOn) {
      playWhipCrack();
    }
    spawnShout(whip.element, x, y, lang);
    fireBooster();
    sessionCracks += 1;
    const level = spamLevel(sessionCracks);
    if (level > lastSpamLevel) {
      lastSpamLevel = level;
      const msg = pick(SPAM_MESSAGES[level - 1], lang);
      showToast(msg);
      demo.sendNote(`🖤 ${msg}`);
    }
  }

  const whip = createWhipView(onWhipCracked, {
    isSoundOn: () => loadSettings().soundOn,
    onPark: () => {
      showToast(t().parked);
    },
    onUnpark: () => {
      showToast(t().unparked);
    },
  });

  function crack(): void {
    whip.crackNow();
  }

  const { header, tag } = renderHeader(t().tagline);

  const crackButton = document.createElement("button");
  crackButton.type = "button";
  crackButton.className = "primary";

  const langToggle = document.createElement("div");
  langToggle.className = "lang-toggle";
  const faButton = document.createElement("button");
  faButton.type = "button";
  faButton.textContent = "فارسی";
  faButton.addEventListener("click", () => {
    applyLang("fa");
  });
  const enButton = document.createElement("button");
  enButton.type = "button";
  enButton.textContent = "EN";
  enButton.addEventListener("click", () => {
    applyLang("en");
  });
  langToggle.append(faButton, enButton);

  const togglesWrap = document.createElement("div");
  togglesWrap.className = "toggles";

  function buildToggles(): void {
    const settings: AppSettings = loadSettings();
    togglesWrap.replaceChildren();
    const defs: Array<{ key: "alwaysOnTop" | "clickThrough" | "soundOn"; label: string }> = [
      { key: "alwaysOnTop", label: t().alwaysOnTop },
      { key: "clickThrough", label: t().clickThrough },
      { key: "soundOn", label: t().sound },
    ];
    for (const def of defs) {
      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = settings[def.key] === true;
      box.addEventListener("change", () => {
        saveSettings({ ...loadSettings(), [def.key]: box.checked });
        if (def.key === "alwaysOnTop") {
          void applyAlwaysOnTop(box.checked);
        }
        if (def.key === "clickThrough") {
          void applyClickThrough(box.checked);
        }
        showToast(t().settingsSaved);
      });
      label.append(box, document.createTextNode(def.label));
      togglesWrap.append(label);
    }
    const langLabel = document.createElement("span");
    langLabel.className = "hint";
    langLabel.textContent = `${t().language}:`;
    togglesWrap.append(langLabel, langToggle);
  }

  const hint = document.createElement("p");
  hint.className = "hint";

  const row = document.createElement("div");
  row.className = "row";
  row.append(crackButton);
  registerInBrowserHotkey(crack);
  // OS-wide hotkey inside Tauri: fires while ANY app (any AI agent) is focused.
  void registerGlobalHotkey(crack).then((armed) => {
    globalArmed = armed;
    if (armed) {
      crackButton.textContent = `${t().crackButton.replace("{hotkey}", DEFAULT_HOTKEY_LABEL)} 🌍`;
    }
  });
  // Apply persisted window powers on startup (no-ops in browser dev).
  void applyAlwaysOnTop(loadSettings().alwaysOnTop);
  void applyClickThrough(loadSettings().clickThrough);

  const panels = document.createElement("div");
  panels.className = "panels";
  const listHead = document.createElement("div");
  listHead.className = "panel-head";
  if (snippets.length > 0) {
    const list = renderSnippetList(snippets, () => {
      // Manual copy stays click-to-copy; crack auto-fires separately.
    });
    const listWrap = document.createElement("div");
    listWrap.className = "panel";
    listWrap.append(listHead, list);
    panels.append(listWrap);
  }
  panels.append(demo.element);

  app.append(header, whip.element, row, togglesWrap, panels, hint);
  applyLang(lang);
}

main();
