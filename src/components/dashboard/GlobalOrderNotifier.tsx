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
import { playNTimes, unlockAudio } from "@/lib/notifications/soundPlayer";

// ── Sound constants ────────────────────────────────────────────
const SOUNDS = {
  order:    "/sounds/Pesanan Masuk.wav",
  message:  "/sounds/Pesan masuk dari customer.wav",
  warn10:   "/sounds/Peringatan 10 menit.wav",
  warn5:    "/sounds/Waktu Tersisa 5 Menit.wav",
  overstay: "/sounds/Waktu Habis.wav",
} as const;

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

  // Active overstay toasts keyed by bookingId (no interval — source tab handles repeat)
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

  const handleNewOrder = useCallback((orderType: "food" | "message" = "food") => {
    const sound = orderType === "message" ? SOUNDS.message : SOUNDS.order;
    playNTimes(sound, 3).catch(() => {});
    const notifTitle = orderType === "message" ? "💬 Pesan Masuk!" : "🔔 Pesanan Masuk!";
    const notifBody  = orderType === "message"
      ? "Ada pesan baru dari customer."
      : "Ada pesanan F&B baru dari customer.";
    sendBrowserNotif(notifTitle, notifBody, "new-order");
    addTitleAlert("new-order");
    setTimeout(() => removeTitleAlert("new-order"), 30_000);
  }, []);

  const handleWarning10min = useCallback((bookingId: string, roomName: string) => {
    playNTimes(SOUNDS.warn10, 3).catch(() => {});
    sendBrowserNotif(`⚠️ 10 Menit Lagi`, `${roomName} akan habis dalam 10 menit.`, `warn-${bookingId}`);
    addTitleAlert(`warn:${roomName}`);
    setTimeout(() => removeTitleAlert(`warn:${roomName}`), 15 * 60_000);
  }, []);

  const handleWarning5min = useCallback((bookingId: string, roomName: string) => {
    playNTimes(SOUNDS.warn5, 3).catch(() => {});
    sendBrowserNotif(`⚠️ 5 Menit Lagi!`, `${roomName} akan habis dalam 5 menit!`, `warn5-${bookingId}`);
    addTitleAlert(`warn5:${roomName}`);
    setTimeout(() => removeTitleAlert(`warn5:${roomName}`), 10 * 60_000);
  }, []);

  const startOverstay = useCallback((bookingId: string, roomName: string) => {
    if (overstayIntervalsRef.current.has(bookingId)) return;

    // Play once — the source tab (booking-aktif / CashierDashboard) handles the 30s repeat.
    // This tab just shows a persistent toast + title flash so the user knows even in other tabs.
    playNTimes(SOUNDS.overstay, 3).catch(() => {});
    sendBrowserNotif(`🚨 Waktu Habis!`, `${roomName} sudah melewati batas waktu. Segera checkout!`, `over-${bookingId}`);
    addTitleAlert(`over:${roomName}`);

    overstayIntervalsRef.current.set(bookingId, { bookingId, roomName });

    if (isMounted.current) {
      setOverstayToasts((prev) =>
        prev.find((t) => t.bookingId === bookingId) ? prev : [...prev, { bookingId, roomName }]
      );
    }
  }, []);

  const stopOverstay = useCallback((bookingId: string) => {
    const alert = overstayIntervalsRef.current.get(bookingId);
    if (!alert) return;
    overstayIntervalsRef.current.delete(bookingId);
    removeTitleAlert(`over:${alert.roomName}`);
    if (isMounted.current) {
      setOverstayToasts((prev) => prev.filter((t) => t.bookingId !== bookingId));
    }
  }, []);

  const dismissOverstayToast = useCallback((bookingId: string) => {
    stopOverstay(bookingId);
  }, [stopOverstay]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── BroadcastChannel: receive from other tabs ─────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel(BC_CHANNEL);
    bc.onmessage = (e) => {
      const msg = e.data as BCMessage;
      switch (msg.type) {
        case "new-order":
          handleNewOrder(msg.orderType ?? "food");
          break;
        case "warning-10min":
          handleWarning10min(msg.bookingId, msg.roomName);
          break;
        case "warning-5min":
          handleWarning5min(msg.bookingId, msg.roomName);
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
  }, [handleNewOrder, handleWarning10min, handleWarning5min, startOverstay, stopOverstay]);

  // ── Supabase Realtime: new orders ─────────────────────────
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
      }, (payload) => {
        // Deduplicate across tabs: first tab to see this INSERT wins
        const orderId = (payload.new as { id?: string })?.id;
        if (orderId) {
          const key = `snd-${orderId}`;
          if (localStorage.getItem(key)) return;
          localStorage.setItem(key, "1");
          setTimeout(() => localStorage.removeItem(key), 5_000);
        }

        // Determine order type: has a text message vs food items
        const msgText = (payload.new as { message?: string | null })?.message;
        const orderType: "food" | "message" =
          typeof msgText === "string" && msgText.trim().length > 0 ? "message" : "food";

        handleNewOrder(orderType);
        broadcast({ type: "new-order", orderType });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBranchId, handleNewOrder]);

  // ── Activate handler ──────────────────────────────────────
  const handleActivate = () => {
    // Unlock AudioContext + preload all buffers during this user gesture
    unlockAudio();
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
      {/* ── Overstay toasts ── */}
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
