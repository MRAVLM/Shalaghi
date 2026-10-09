import type { Lang } from "../i18n/strings";
import { SHOUTS } from "../i18n/strings";

// Floating shout words: on every crack, one playful bilingual word pops
// above the impact point, floats up and fades. Clean set only (SHOUTS).

let shoutIndex = 0;

export function spawnShout(
  stage: HTMLElement,
  x: number,
  y: number,
  lang: Lang,
): void {
  const pair = SHOUTS[shoutIndex % SHOUTS.length];
  shoutIndex += 1;
  const el = document.createElement("div");
  el.className = "shout";
  const fa = document.createElement("strong");
  fa.textContent = pair.fa;
  const en = document.createElement("span");
  en.textContent = pair.en;
  // Primary line follows the app language; both always shown.
  if (lang === "fa") {
    el.append(fa, en);
  } else {
    const faStrong = document.createElement("strong");
    faStrong.textContent = pair.en;
    const enSpan = document.createElement("span");
    enSpan.textContent = pair.fa;
    el.append(faStrong, enSpan);
  }
  const rect = stage.getBoundingClientRect();
  const jitter = (Math.random() - 0.5) * 60;
  el.style.left = `${x + jitter}px`;
  el.style.top = `${Math.max(8, y - 44)}px`;
  void rect;
  stage.append(el);
  window.setTimeout(() => {
    el.remove();
  }, 1300);
}
