// ══════════════════════════════════════════════════════════════
// soundPlayer.ts — Centralized audio engine for dashboard notifications
//
// Uses AudioContext (Web Audio API) so sounds play reliably in background
// tabs. AudioContext created during a user gesture (Aktifkan button) stays
// "running" even when the tab loses focus in Chrome/Edge.
//
// Falls back to HTMLAudioElement if AudioContext is unavailable.
// ══════════════════════════════════════════════════════════════

let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer>();

// All sounds used by the app — preloaded after user unlock gesture
const ALL_SOUNDS = [
  "/sounds/Pesanan Masuk.wav",
  "/sounds/Pesan masuk dari customer.wav",
  "/sounds/Peringatan 10 menit.wav",
  "/sounds/Waktu Tersisa 5 Menit.wav",
  "/sounds/Waktu Habis.wav",
];

/**
 * Call once during a user-gesture (e.g. button click) to unlock the
 * AudioContext and preload all sound buffers.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;

    if (!_ctx || _ctx.state === "closed") {
      _ctx = new AC();
    }
    if (_ctx.state === "suspended") {
      _ctx.resume().catch(() => {});
    }

    // Preload all buffers in background so first play is instant
    for (const src of ALL_SOUNDS) {
      _loadBuffer(src).catch(() => {});
    }
  } catch {
    // AudioContext not supported — HTMLAudioElement fallback will be used
  }
}

async function _loadBuffer(src: string): Promise<AudioBuffer | null> {
  if (!_ctx) return null;
  if (_buffers.has(src)) return _buffers.get(src)!;
  try {
    const resp = await fetch(src);
    const arr = await resp.arrayBuffer();
    const buf = await _ctx.decodeAudioData(arr);
    _buffers.set(src, buf);
    return buf;
  } catch {
    return null;
  }
}

function _playOnce(buf: AudioBuffer, ctx: AudioContext): Promise<void> {
  return new Promise((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => resolve();
    source.start();
  });
}

function _delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Play a sound `times` times with `gapMs` ms between each play.
 * Fire-and-forget safe (returns a Promise you can ignore or await).
 */
export async function playNTimes(
  src: string,
  times = 3,
  gapMs = 700
): Promise<void> {
  if (typeof window === "undefined") return;

  // Try AudioContext first (stays running in background tabs)
  if (_ctx) {
    try {
      if (_ctx.state === "suspended") await _ctx.resume();
      if (_ctx.state === "running") {
        const buf = await _loadBuffer(src);
        if (buf) {
          for (let i = 0; i < times; i++) {
            await _playOnce(buf, _ctx);
            if (i < times - 1) await _delay(gapMs);
          }
          return;
        }
      }
    } catch {
      // fall through to HTMLAudioElement
    }
  }

  // Fallback: HTMLAudioElement (requires prior user interaction for autoplay)
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      const a = new Audio(src);
      a.volume = 0.85;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
    if (i < times - 1) await _delay(gapMs);
  }
}
