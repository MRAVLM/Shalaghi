// UI strings (FA/EN) + floating shout words + anti-spam boss messages.
// Language is user-switchable inside the app (settings.lang).

export type Lang = "fa" | "en";

export interface ShoutPair {
  fa: string;
  en: string;
}

// Clean playful shouts only. Never add slurs or race-targeted "jokes" here.
export const SHOUTS: ShoutPair[] = [
  { fa: "کار کن!", en: "Work!" },
  { fa: "سریع‌تر!", en: "Faster!" },
  { fa: "بجنب!", en: "Move it!" },
  { fa: "تندتر!", en: "Quicker!" },
  { fa: "بزن بریم!", en: "Let's go!" },
  { fa: "دوباره!", en: "Again!" },
  { fa: "آفرین!", en: "Nice!" },
];

export interface SpamMessage {
  fa: string;
  en: string;
}

// Index = spam level - 1. Playful "stop it, boss" nudges, never insults.
export const SPAM_MESSAGES: SpamMessage[] = [
  { fa: "هی رئیس، آروم‌تر! 😄", en: "Easy, boss!" },
  { fa: "باشه فهمیدم، دیگه نیازی نیست!", en: "OK, I get it — no need!" },
  { fa: "رئیس بس کن! شلاق خسته شد 😅", en: "Stop it, boss! The whip is tired." },
];

export interface UIText {
  tagline: string;
  crackButton: string; // {hotkey} placeholder
  alwaysOnTop: string;
  clickThrough: string;
  sound: string;
  language: string;
  hint: string;
  parked: string;
  unparked: string;
  rackMain: string;
  rackSub: string;
  crackWord: string;
  boostersHead: string;
  demoHead: string;
  demoBadge: string;
  demoEmpty: string;
  copyFail: string;
  settingsSaved: string;
  fired: string; // {id} placeholder
}

export const STRINGS: Record<Lang, UIText> = {
  fa: {
    tagline: "شلاق + سریع‌تر",
    crackButton: "شلاق بزن ({hotkey})",
    alwaysOnTop: "همیشه رو",
    clickThrough: "کلیک‌ردشو (Tauri)",
    sound: "صدا",
    language: "زبان",
    hint: "شلاق رو هرجا بگیری بچرخون و flick کن — هر ترک، بوستر بعدی رو خودش شلیک می‌کنه. برای خوابوندنش بکشش روی جای شلاق.",
    parked: "شلاق خوابید 😴 — بغلش بزن بیدار شه",
    unparked: "شلاق برگشت!",
    rackMain: "جای شلاق",
    rackSub: "بکش و ول کن",
    crackWord: "ترک",
    boostersHead: "بوسترها (کلیک = کپی)",
    demoHead: "پیش‌نمایش ایجنت",
    demoBadge: "شبیه‌سازی",
    demoEmpty: "شلاق بزن — بوستر خودش اینجا میاد.",
    copyFail: "کپی نشد — دسترسی کلیپ‌بورد نیست",
    settingsSaved: "تنظیمات ذخیره شد",
    fired: "⚡ /{id} شلیک شد + کپی",
  },
  en: {
    tagline: "whip + faster",
    crackButton: "Crack the whip ({hotkey})",
    alwaysOnTop: "Always on top",
    clickThrough: "Click-through (Tauri)",
    sound: "Sound",
    language: "Language",
    hint: "Grab the whip anywhere, swing and flick — every crack auto-fires the next booster. Drag it onto the rack to park it.",
    parked: "Whip parked 😴 — tap it to wake it up",
    unparked: "Whip is back!",
    rackMain: "Whip rack",
    rackSub: "drag & drop",
    crackWord: "cracks",
    boostersHead: "Boosters (click to copy)",
    demoHead: "Agent preview",
    demoBadge: "simulated",
    demoEmpty: "Crack the whip — the booster lands here itself.",
    copyFail: "Copy failed — clipboard denied",
    settingsSaved: "Settings saved",
    fired: "⚡ /{id} fired + copied",
  },
};

export function pick(pair: { fa: string; en: string }, lang: Lang): string {
  return lang === "fa" ? pair.fa : pair.en;
}
