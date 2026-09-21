// ============================================================
// UNLOCK SOUND
// ============================================================
// Generates a short two-tone "ding" using the Web Audio API —
// no audio file to host or load. Safe to call from anywhere;
// silently no-ops if the browser blocks audio (e.g. before any
// user interaction) or doesn't support it.
// ============================================================

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioCtx =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedContext) {
    sharedContext = new AudioCtx();
  }

  return sharedContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

/** Pleasant two-note ascending "ding" — used on successful unlock. */
export function playUnlockSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume if the browser suspended it (autoplay policies)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.18, 0.15); // A5
    playTone(ctx, 1318.51, now + 0.09, 0.22, 0.15); // E6
  } catch (err) {
    console.warn("Could not play unlock sound:", err);
  }
}
