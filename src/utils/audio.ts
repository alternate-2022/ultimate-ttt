/**
 * Lightweight audio manager. Generates short tones via the WebAudio API
 * rather than shipping binary sound assets, keeping the app tiny and
 * fully offline-capable with zero network fetches for sound.
 */
type SoundName = 'move' | 'capture' | 'victory' | 'loss' | 'click' | 'notify';

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType, gainValue: number, delay = 0) {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const start = audioCtx.currentTime + delay;
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  osc.start(start);
  osc.stop(start + durationMs / 1000);
}

const players: Record<SoundName, () => void> = {
  move: () => tone(520, 90, 'sine', 0.12),
  capture: () => {
    tone(660, 120, 'triangle', 0.14);
    tone(880, 140, 'triangle', 0.1, 0.06);
  },
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 220, 'sine', 0.12, i * 0.1));
  },
  loss: () => {
    [400, 320, 240].forEach((f, i) => tone(f, 260, 'sawtooth', 0.08, i * 0.12));
  },
  click: () => tone(700, 40, 'square', 0.05),
  notify: () => tone(900, 80, 'sine', 0.08),
};

export function playSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  try {
    players[name]();
  } catch {
    // Audio can fail silently (e.g. autoplay policy) — never break gameplay.
  }
}

export function haptic(pattern: number | number[], enabled: boolean) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported on all devices — ignore.
  }
}
