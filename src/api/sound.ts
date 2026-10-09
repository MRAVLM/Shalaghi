// Whip-crack sound: user's real recording first, synthesized fallback second.
// - Primary: `public/sfx/whip-crack.mp3` (user-provided, served offline from
//   dist in builds, from /public in dev — no network).
// - Fallback: original WebAudio noise-burst synthesis (offline, license-clean)
//   if the file is missing or playback is denied.

const CRACK_URL = `${import.meta.env.BASE_URL}sfx/whip-crack.mp3`;

let shared: HTMLAudioElement | null = null;

function getSharedAudio(): HTMLAudioElement | null {
  try {
    if (shared === null) {
      shared = new Audio(CRACK_URL);
      shared.preload = "auto";
    }
    return shared;
  } catch {
    return null;
  }
}

function playSynthesizedFallback(): void {
  const Ctx = window.AudioContext;
  if (Ctx === undefined) {
    return;
  }
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return;
  }
  const duration = 0.32;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const t = i / sampleRate;
    const attack = t < 0.008 ? 1.6 : 1;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 26) * attack;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.1;
  band.frequency.setValueAtTime(6500, ctx.currentTime);
  band.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.55, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(band).connect(gain).connect(ctx.destination);
  source.start();
  source.stop(ctx.currentTime + duration + 0.02);
  source.onended = () => {
    void ctx.close();
  };
}

export function playWhipCrack(): void {
  const audio = getSharedAudio();
  if (audio === null) {
    playSynthesizedFallback();
    return;
  }
  try {
    audio.currentTime = 0;
    const attempt = audio.play();
    if (attempt !== undefined) {
      attempt.catch(() => {
        playSynthesizedFallback();
      });
    }
  } catch {
    playSynthesizedFallback();
  }
}

// Continuous swing whoosh: looped filtered noise whose gain follows the tip
// speed, so swinging has its own "foo" sound and the crack stays the finale.
// The context is created on first user gesture (browser autoplay policy).

let whooshCtx: AudioContext | null = null;
let whooshGain: GainNode | null = null;

export function ensureWhoosh(): void {
  if (whooshCtx !== null) {
    return;
  }
  const Ctx = window.AudioContext;
  if (Ctx === undefined) {
    return;
  }
  try {
    whooshCtx = new Ctx();
  } catch {
    whooshCtx = null;
    return;
  }
  const sampleRate = whooshCtx.sampleRate;
  const length = Math.floor(sampleRate * 1.5);
  const buffer = whooshCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = whooshCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = whooshCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.8;
  whooshGain = whooshCtx.createGain();
  whooshGain.gain.value = 0;
  source.connect(filter).connect(whooshGain).connect(whooshCtx.destination);
  source.start();
}

export function setWhooshLevel(level01: number): void {
  if (whooshCtx === null || whooshGain === null) {
    return;
  }
  if (whooshCtx.state === "suspended") {
    void whooshCtx.resume();
  }
  const v = Math.max(0, Math.min(1, level01));
  // Subtle on purpose (max ~0.10): the crack stays the star of the show.
  whooshGain.gain.setTargetAtTime(v * v * 0.1, whooshCtx.currentTime, 0.06);
}
