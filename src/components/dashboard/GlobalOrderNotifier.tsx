"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import {
  BC_CHANNEL,
  type BCMessage,
  broadcast,
  addTitleAlert,
  removeTitleAlert,
  registerFocusStop,
} from "@/lib/notifications/tabNotifier";

// ── Audio ─────────────────────────────────────────────────────

function playSound(src: string, volume = 0.85) {
  if (typeof window === "undefined") return;
  const a = new Audio(src);
  a.volume = volume;
  a.play().catch(() => {});
}

const SOUNDS = {
  order:   "/sounds/Pesanan Masuk.wav",
  warning: "/sounds/Peringatan 10 menit.wav",
  overstay:"/sounds/Waktu Habis.wav",
};

// ── Browser notification ──────────────────────────────────────

function sendBrowserNotif(title: string, body: string, tag: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico", tag, requireInteraction: false });
  } catch { /* blocked */ }
}

// ── SVG icons ─────────────────────────────────────────────────

const SvgBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const SvgAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────

interface OverstayAlert {
  bookingId: string;
  roomName: string;
  intervalId: ReturnType<typeof setInterval>;
}

// ── Component ─────────────────────────────────────────────────

export default function GlobalOrderNotifier() {
  const { activeBranchId } = useUser();
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  // Activation banner
  const [notifGranted, setNotifGranted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Active overstay alerts visible as toasts on this tab
  const [overstayToasts, setOverstayToasts] = useState<{ bookingId: string; roomName: string }[]>([]);

  // Refs for repeating overstay intervals (keyed by bookingId)
  const overstayIntervalsRef = useRef<Map<string, OverstayAlert>>(new Map());
  const isMounted = useRef(true);

  // ── Init permission state ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setTimeout(() => {
      if (isMounted.current) setNotifGranted(Notification.permission === "granted");
    }, 0);
  }, []);

  // ── Stop title flash when window focused ──────────────────
  useEffect(() => {
    const unregister = registerFocusStop();
    return unregister;
  }, []);

  // ── Handlers per alert type ───────────────────────────────

  const handleNewOrder = useCallback(() => {
    playSound(SOUNDS.order);
    sendBrowserNotif("🔔 Pesanan Masuk!", "Ada pesanan baru dari customer.", "new-order");
    addTitleAlert("new-order");
    setTimeout(() => removeTitleAlert("new-order"), 30_000);
  }, []);

  const handleWarning10min = useCallback((bookingId: string, roomName: string) => {
    playSound(SOUNDS.warning);
    sendBrowserNotif(`⚠️ 10 Menit Lagi`, `${roomName} akan habis dalam 10 menit.`, `warn-${bookingId}`);
    addTitleAlert(`warn:${roomName}`);
    setTimeout(() => removeTitleAlert(`warn:${roomName}`), 15 * 60_000);
  }, []);

  const startOverstay = useCallback((bookingId: string, roomName: string) => {
    if (overstayIntervalsRef.current.has(bookingId)) return; // already running

    playSound(SOUNDS.overstay);
    sendBrowserNotif(`🚨 Waktu Habis!`, `${roomName} sudah melewati batas waktu. Segera checkout!`, `over-${bookingId}`);
    addTitleAlert(`over:${roomName}`);

    if (isMounted.current) {
      setOverstayToasts((prev) =>
        prev.find((t) => t.bookingId === bookingId) ? prev : [...prev, { bookingId, roomName }]
      );
    }

    const intervalId = setInterval(() => {
      playSound(SOUNDS.overstay);
      sendBrowserNotif(`🚨 Waktu Habis!`, `${roomName} sudah melewati batas waktu. Segera checkout!`, `over-${bookingId}`);
    }, 30_000);

    overstayIntervalsRef.current.set(bookingId, { bookingId, roomName, intervalId });
  }, []);

  const stopOverstay = useCallback((bookingId: string) => {
    const alert = overstayIntervalsRef.current.get(bookingId);
    if (!alert) return;
    clearInterval(alert.intervalId);
    overstayIntervalsRef.current.delete(bookingId);
    removeTitleAlert(`over:${alert.roomName}`);
    if (isMounted.current) {
      setOverstayToasts((prev) => prev.filter((t) => t.bookingId !== bookingId));
    }
  }, []);

  const dismissOverstayToast = useCallback((bookingId: string) => {
    // Stop sound on this tab only — does NOT end the booking
    stopOverstay(bookingId);
  }, [stopOverstay]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    const intervals = overstayIntervalsRef.current;
    return () => {
      isMounted.current = false;
      intervals.forEach((a) => clearInterval(a.intervalId));
    };
  }, []);

  // ── BroadcastChannel: receive from booking-aktif tab ─────
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel(BC_CHANNEL);
    bc.onmessage = (e) => {
      const msg = e.data as BCMessage;
      switch (msg.type) {
        case "new-order":
          handleNewOrder();
          break;
        case "warning-10min":
          handleWarning10min(msg.bookingId, msg.roomName);
          break;
        case "overstay-start":
          startOverstay(msg.bookingId, msg.roomName);
          break;
        case "overstay-stop":
          stopOverstay(msg.bookingId);
          break;
      }
    };
    return () => bc.close();
  }, [handleNewOrder, handleWarning10min, startOverstay, stopOverstay]);

  // ── Supabase Realtime: new orders (this tab is the leader) ─
  useEffect(() => {
    isMounted.current = true;
    if (!activeBranchId) return;
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`global-order-notifier-${activeBranchId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "order_requests",
        filter: `branch_id=eq.${activeBranchId}`,
      }, () => {
        handleNewOrder();
        broadcast({ type: "new-order" });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBranchId, handleNewOrder]);

  // ── Activate handler ──────────────────────────────────────
  const handleActivate = () => {
    playSound(SOUNDS.order, 0.5);
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then((perm) => {
        if (isMounted.current) setNotifGranted(perm === "granted");
      });
    } else {
      setNotifGranted(true);
    }
    setDismissed(true);
  };

  const showBanner = !dismissed && !notifGranted;

  return (
    <>
      {/* ── Overstay toasts (other tabs only — booking-aktif handles its own) ── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {overstayToasts.map((toast) => (
          <div
            key={toast.bookingId}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3.5 bg-red-950/95 backdrop-blur-md border border-red-500/50 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.3)] max-w-xs animate-in slide-in-from-right-4 duration-300"
          >
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0 animate-pulse">
              <SvgAlert />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-300 leading-tight">🚨 WAKTU HABIS</p>
              <p className="text-[11px] text-red-400/80 leading-tight truncate">{toast.roomName}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => router.push("/booking-aktif")}
                className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold hover:bg-red-500/30 transition-all"
              >
                Buka
              </button>
              <button
                onClick={() => dismissOverstayToast(toast.bookingId)}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold hover:bg-white/10 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Activation banner ── */}
      {showBanner && (
        <div className="fixed bottom-5 right-5 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 border border-neon-blue/40 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.2)] max-w-xs">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center text-neon-blue">
                <SvgBell />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">Aktifkan Notifikasi</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Suara &amp; notif di semua halaman &amp; tab</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleActivate}
                className="px-3 py-1.5 rounded-xl bg-neon-blue/20 border border-neon-blue/40 text-neon-blue text-xs font-bold hover:bg-neon-blue/30 transition-all"
              >
                Aktifkan
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
