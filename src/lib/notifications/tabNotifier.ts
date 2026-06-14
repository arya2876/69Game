// ══════════════════════════════════════════════════════════════
// tabNotifier.ts — Cross-tab notification bus + tab title flash
// ══════════════════════════════════════════════════════════════

export const BC_CHANNEL = "69game-notifications";

export type BCMessage =
  | { type: "new-order" }
  | { type: "warning-10min"; bookingId: string; roomName: string }
  | { type: "overstay-start"; bookingId: string; roomName: string }
  | { type: "overstay-stop"; bookingId: string };

/** Send a message to all OTHER open dashboard tabs (not this one). */
export function broadcast(msg: BCMessage) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const bc = new BroadcastChannel(BC_CHANNEL);
  bc.postMessage(msg);
  bc.close();
}

// ── Tab title flashing ────────────────────────────────────────

let _flashInterval: ReturnType<typeof setInterval> | null = null;
let _originalTitle = "";
const _activeAlerts = new Set<string>(); // bookingId or "new-order"

function buildFlashMessages(): string[] {
  const msgs: string[] = [];
  if (_activeAlerts.has("new-order")) msgs.push("🔔 PESANAN MASUK!");
  _activeAlerts.forEach((id) => {
    if (id.startsWith("warn:")) msgs.push(`⚠️ 10 MENIT LAGI: ${id.slice(5)}`);
    if (id.startsWith("over:")) msgs.push(`🚨 WAKTU HABIS: ${id.slice(5)}`);
  });
  return msgs;
}

function updateFlash() {
  if (_activeAlerts.size === 0) {
    stopTitleFlash();
    return;
  }
  if (_flashInterval) return; // already running

  if (typeof window === "undefined") return;
  _originalTitle = _originalTitle || document.title;
  const messages = buildFlashMessages();
  let i = 0;
  _flashInterval = setInterval(() => {
    document.title = i % 2 === 0 ? messages[Math.floor(i / 2) % messages.length] : _originalTitle;
    i++;
  }, 900);
}

export function addTitleAlert(key: string) {
  _activeAlerts.add(key);
  updateFlash();
}

export function removeTitleAlert(key: string) {
  _activeAlerts.delete(key);
  if (_activeAlerts.size === 0) stopTitleFlash();
}

export function stopTitleFlash() {
  if (_flashInterval) {
    clearInterval(_flashInterval);
    _flashInterval = null;
  }
  if (_originalTitle && typeof window !== "undefined") {
    document.title = _originalTitle;
    _originalTitle = "";
  }
}

export function clearAllTitleAlerts() {
  _activeAlerts.clear();
  stopTitleFlash();
}

/** Stop title flash when window is focused (user is back). */
export function registerFocusStop() {
  if (typeof window === "undefined") return;
  const handler = () => clearAllTitleAlerts();
  window.addEventListener("focus", handler);
  return () => window.removeEventListener("focus", handler);
}
