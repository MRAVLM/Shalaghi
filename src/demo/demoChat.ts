import type { PromptSnippet } from "../snippets/snippetStore";

// Demo chat panel for the web preview (NOT shipped in the Tauri app).
// Shows each crack-fired booster as the "user" message plus a canned,
// clearly-labeled SIMULATED reply that demonstrates the concise-answer
// format — never presented as a real model response.

const SIMULATED_REPLIES: Record<string, { fa: string; en: string }> = {
  "fast": { fa: "✓ گرفتم. از اینجا کوتاه جواب می‌دم.", en: "✓ Got it. Short answers from here on." },
  "fast-fix": { fa: "✓ درست شد. فقط دیف.", en: "✓ Fixed. Diff only." },
  "fast-view": { fa: "✓ ۱ مشکل جدی: نال بدون گارد.", en: "✓ 1 blocking issue: unguarded null." },
  "fast-ship": { fa: "✓ شیپ شد. ۳ فایل، بدون حاشیه.", en: "✓ Shipped. 3 files, 0 fluff." },
};

const FALLBACK_REPLY = { fa: "✓ بوستر رسید. حالت مختصر روشن.", en: "✓ Booster received. Concise mode on." };

export interface DemoLabels {
  head: string;
  badge: string;
  empty: string;
  lang: "fa" | "en";
}

export interface DemoChat {
  element: HTMLElement;
  setLabels: (labels: DemoLabels) => void;
  sendBooster: (snippet: PromptSnippet) => void;
  sendNote: (text: string) => void;
}

export function createDemoChat(initial: DemoLabels): DemoChat {
  const panel = document.createElement("div");
  panel.className = "demo-chat";

  const head = document.createElement("div");
  head.className = "demo-chat-head";
  const badge = document.createElement("span");
  badge.className = "demo-badge";
  head.append(badge);

  const log = document.createElement("div");
  log.className = "demo-log";
  panel.append(head, log);

  let lang = initial.lang;

  function setLabels(labels: DemoLabels): void {
    lang = labels.lang;
    head.childNodes[0].textContent = `${labels.head} `;
    badge.textContent = labels.badge;
    const emptyHint = log.querySelector(".hint");
    if (emptyHint !== null && log.children.length === 1) {
      emptyHint.textContent = labels.empty;
    }
  }

  head.prepend(document.createTextNode(""));
  setLabels(initial);
  const empty = document.createElement("p");
  empty.className = "hint";
  empty.textContent = initial.empty;
  log.append(empty);

  function addBubble(kind: "user" | "agent", text: string): void {
    const bubble = document.createElement("div");
    bubble.className = `demo-bubble demo-${kind}`;
    bubble.textContent = text;
    const emptyHint = log.querySelector(".hint");
    if (emptyHint !== null) {
      emptyHint.remove();
    }
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
  }

  function sendBooster(snippet: PromptSnippet): void {
    addBubble("user", `/${snippet.id} — ${snippet.text}`);
    const reply = SIMULATED_REPLIES[snippet.id] ?? FALLBACK_REPLY;
    addBubble("agent", lang === "fa" ? reply.fa : reply.en);
  }

  function sendNote(text: string): void {
    addBubble("agent", text);
  }

  return { element: panel, setLabels, sendBooster, sendNote };
}
