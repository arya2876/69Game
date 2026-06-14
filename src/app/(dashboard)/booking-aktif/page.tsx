"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRealtimeBookings } from "@/lib/hooks/useRealtimeBookings";
import PendingOrdersPanel from "@/components/dashboard/PendingOrdersPanel";
import BookingReceiptModal from "@/components/dashboard/BookingReceiptModal";
import CheckoutModal, { type CheckoutBookingInfo } from "@/components/dashboard/CheckoutModal";
import ShiftSummaryBar from "@/components/dashboard/ShiftSummaryBar";
import { AnimatePresence, motion } from "framer-motion";
import { broadcast, addTitleAlert, removeTitleAlert, registerFocusStop } from "@/lib/notifications/tabNotifier";
import AddMenuModal, { type MenuItem } from "@/components/dashboard/AddMenuModal";
import { createClient } from "@/lib/supabase/client";

// ── Audio (module-level singleton) ──────────────────────────

function playSound(src: string, volume = 0.8) {
  if (typeof window === "undefined") return;
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

function playWarningChime() {
  playSound("/sounds/Peringatan 10 menit.wav");
}

function playOverstayBeep() {
  playSound("/sounds/Waktu Habis.wav");
}

export function playOrderIncoming() {
  playSound("/sounds/Pesanan Masuk.wav");
}

// ── Types ────────────────────────────────────────────────────

interface BookingCard {
  rawId: string;
  displayId: string;
  customer: string;
  whatsapp: string;
  facility: string;
  boothNumber: string | null;
  category: string;
  durationMin: number;
  startTime: number; // unix ms
  endTime: number;   // unix ms
  status: "active" | "waiting";
  base_amount: number;
  isOpenSession: boolean;
  pricePerHour: number;
}

// ── Helpers ──────────────────────────────────────────────────

function boothSortKey(booth: string | null | undefined): number {
  if (!booth) return Infinity;
  const m = booth.match(/\d+/);
  return m ? parseInt(m[0]) : Infinity;
}

function formatCountdown(ms: number): string {
  const abs = Math.abs(ms);
  const totalSecs = Math.floor(abs / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const base =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return ms < 0 ? `-${base}` : base;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ── SVG Icons ────────────────────────────────────────────────

const SvgClock = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const SvgPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const SvgCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const SvgLoader = () => (
  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const SvgClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Room Card ────────────────────────────────────────────────

function RoomCard({
  booking,
  now,
  onAddTime,
  onAddMenu,
  onCheckout,
}: {
  booking: BookingCard;
  now: number;
  onAddTime: (id: string) => void;
  onAddMenu: (id: string, facilityName: string) => void;
  onCheckout: (id: string, info: CheckoutBookingInfo) => void;
}) {
  const isWaiting = booking.status === "waiting";
  const isOpen = booking.isOpenSession && !isWaiting;
  const elapsed = isOpen ? now - booking.startTime : 0;
  const remaining = !isOpen ? booking.endTime - now : 0;
  const isWarning = !isWaiting && !isOpen && remaining > 0 && remaining <= 10 * 60 * 1000;
  const isOverstay = !isWaiting && !isOpen && remaining <= 0;

  // Color theme
  const theme = isOpen
    ? {
        border: "border-neon-blue/30",
        glow: "shadow-[0_0_16px_rgba(59,130,246,0.08)]",
        bar: "bg-neon-blue",
        countdown: "text-neon-blue",
        countdownBg: "bg-neon-blue/5",
        badgeCls: "bg-neon-blue/20 text-neon-blue border-neon-blue/30",
        dot: "bg-neon-blue",
        label: "OPEN",
        subLabel: "berjalan",
        checkoutCls: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]",
      }
    : isOverstay
    ? {
        border: "border-red-500/50",
        glow: "shadow-[0_0_24px_rgba(239,68,68,0.12)]",
        bar: "bg-red-500",
        countdown: "text-red-400",
        countdownBg: "bg-red-950/30",
        badgeCls: "bg-red-500/20 text-red-400 border-red-500/30",
        dot: "bg-red-400",
        label: "MELEBIHI WAKTU",
        subLabel: "MELEBIHI BATAS WAKTU",
        checkoutCls: "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]",
      }
    : isWarning
    ? {
        border: "border-amber-500/50",
        glow: "shadow-[0_0_18px_rgba(245,158,11,0.08)]",
        bar: "bg-amber-500",
        countdown: "text-amber-400",
        countdownBg: "bg-amber-950/20",
        badgeCls: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        dot: "bg-amber-400",
        label: "HAMPIR HABIS",
        subLabel: "sisa waktu",
        checkoutCls: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]",
      }
    : isWaiting
    ? {
        border: "border-slate-700/60",
        glow: "",
        bar: "bg-slate-600",
        countdown: "text-slate-500",
        countdownBg: "bg-slate-800/30",
        badgeCls: "bg-slate-800 text-slate-400 border-slate-700",
        dot: "bg-slate-500",
        label: "MENUNGGU",
        subLabel: `mulai ${formatTime(booking.startTime)}`,
        checkoutCls: "",
      }
    : {
        border: "border-emerald-500/25",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.06)]",
        bar: "bg-emerald-500",
        countdown: "text-emerald-400",
        countdownBg: "bg-slate-800/30",
        badgeCls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-400",
        label: "AKTIF",
        subLabel: "sisa waktu",
        checkoutCls: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]",
      };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`relative bg-slate-900/80 backdrop-blur-md border ${theme.border} ${theme.glow} rounded-2xl overflow-hidden transition-shadow duration-300`}
    >
      {/* Accent bar */}
      <div className={`h-0.5 w-full ${theme.bar} ${isOverstay ? "animate-pulse" : ""}`} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          {booking.boothNumber
            ? <span className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[9px] font-black tracking-widest border bg-slate-800 text-slate-200 border-slate-600">{booking.boothNumber}</span>
            : <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{booking.category}</span>
          }
          <span
            className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${theme.badgeCls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} ${isOverstay || isWarning ? "animate-pulse" : ""}`} />
            {theme.label}
          </span>
        </div>
        {/* Facility name + category */}
        <div className="-mt-1">
          <p className="text-sm font-bold text-white truncate">{booking.facility}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{booking.category}</p>
        </div>

        {/* Customer */}
        <div className="bg-slate-800/50 rounded-xl px-3 py-2">
          <p className="text-sm font-semibold text-white">{booking.customer}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {booking.whatsapp !== "-" ? booking.whatsapp : "Walk-in"}
          </p>
        </div>

        {/* Timer — counts up for open, down for fixed */}
        <div className={`${theme.countdownBg} rounded-xl py-3 px-2 text-center`}>
          <p className={`text-[2.6rem] font-mono font-black leading-none tracking-wider ${theme.countdown} ${isOverstay ? "animate-pulse" : ""}`}>
            {isWaiting ? "--:--" : isOpen ? formatCountdown(elapsed) : formatCountdown(remaining)}
          </p>
          {isOpen && (
            <p className="text-[10px] text-neon-blue/60 font-mono mt-0.5">
              ~Rp {Math.round((Math.ceil(elapsed / 60_000) / 60) * booking.pricePerHour).toLocaleString("id-ID")}
            </p>
          )}
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            {theme.subLabel}
          </p>
        </div>

        {/* Actions */}
        {booking.status === "active" && (
          <div className="flex gap-2">
            {!isOpen && (
              <button
                onClick={() => onAddTime(booking.rawId)}
                className="flex-1 py-2 rounded-xl border border-neon-blue/30 text-neon-blue text-xs font-bold flex items-center justify-center gap-1 hover:bg-neon-blue/10 hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] transition-all"
              >
                <SvgPlus />
                Waktu
              </button>
            )}
            <button
              onClick={() => onAddMenu(booking.rawId, booking.facility)}
              className="flex-1 py-2 rounded-xl border border-neon-purple/30 text-neon-purple text-xs font-bold flex items-center justify-center gap-1 hover:bg-neon-purple/10 hover:shadow-[0_0_8px_rgba(168,85,247,0.2)] transition-all"
            >
              <SvgPlus />
              F&amp;B
            </button>
            <button
              onClick={() =>
                onCheckout(booking.rawId, {
                  roomName: booking.facility,
                  customerName: booking.customer,
                  base_amount: booking.base_amount,
                  startTime: booking.startTime,
                  endTime: booking.endTime,
                  isOpenSession: booking.isOpenSession,
                  pricePerHour: booking.pricePerHour,
                })
              }
              className={`flex-[2] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${theme.checkoutCls}`}
            >
              <SvgCheck />
              Checkout
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Add Time Modal ───────────────────────────────────────────

function AddTimeModal({
  bookingId,
  bookingLabel,
  onConfirm,
  onClose,
}: {
  bookingId: string;
  bookingLabel: string;
  onConfirm: (id: string, minutes: number) => Promise<void>;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onConfirm(bookingId, minutes);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!submitting ? onClose : undefined}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Tambah Waktu</h3>
            <p className="text-xs text-slate-400 mt-0.5">{bookingLabel}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors">
            <SvgClose />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick picks */}
          <div className="grid grid-cols-3 gap-2">
            {[30, 60, 120].map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  minutes === m
                    ? "bg-neon-blue/15 border-neon-blue/50 text-neon-blue"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                {m < 60 ? `+${m} min` : `+${m / 60} jam`}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Atau masukkan manual
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={480}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, Math.min(480, Number(e.target.value))))}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-neon-blue/50 outline-none transition-colors"
              />
              <span className="text-sm text-slate-400 font-medium">menit</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || minutes < 1}
            className="flex-[2] py-2.5 rounded-xl bg-neon-blue/15 border border-neon-blue/40 text-neon-blue text-sm font-bold flex items-center justify-center gap-2 hover:bg-neon-blue/25 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <><SvgLoader /> Menyimpan...</> : <><SvgPlus /> Tambah {minutes} Menit</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function BookingAktifPage() {
  const { activeBranchId, activeShift } = useUser();
  const { bookings: rawBookings, loading } = useRealtimeBookings(activeBranchId, ["scheduled", "active"]);

  // Map raw DB rows to lightweight card state
  const bookings: BookingCard[] = rawBookings.map((b) => {
    const raw = b as unknown as {
      id: string;
      base_amount: number;
      start_time: string;
      end_time: string;
      status: string;
      is_open_session: boolean;
    };
    return {
      rawId: raw.id,
      displayId: raw.id.slice(0, 8).toUpperCase(),
      customer: b.member?.full_name || "Walk-in Guest",
      whatsapp: b.member?.whatsapp || "-",
      facility: b.facility?.name || "Unknown",
      boothNumber: b.facility?.booth_number ?? null,
      category: b.facility?.category || "Unknown",
      durationMin: Math.round(
        (new Date(raw.end_time).getTime() - new Date(raw.start_time).getTime()) / 60_000
      ),
      startTime: new Date(raw.start_time).getTime(),
      endTime: new Date(raw.end_time).getTime(),
      status: raw.status === "scheduled" ? "waiting" : "active",
      base_amount: raw.base_amount ?? 0,
      isOpenSession: raw.is_open_session ?? false,
      pricePerHour: b.facility?.price_per_hour ?? 0,
    };
  });

  // Shared live clock
  const [now, setNow] = useState(0);

  // Audio alert tracking
  const warned10minRef = useRef<Set<string>>(new Set());
  const overstayIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Modal state
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "waiting">("all");
  const [addTimeId, setAddTimeId] = useState<string | null>(null);
  const [addTimeLabel, setAddTimeLabel] = useState("");
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutBookingInfo | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  // F&B menu
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [addMenuTarget, setAddMenuTarget] = useState<{ bookingId: string; facilityName: string } | null>(null);
  const supabase = createClient();

  // ── Clock tick ──────────────────────────────────────────
  useEffect(() => {
    const t0 = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearTimeout(t0); clearInterval(timer); };
  }, []);

  // ── Register focus → stop title flash on this tab ────────
  useEffect(() => {
    const unregister = registerFocusStop();
    return unregister;
  }, []);

  // ── Audio alerts ────────────────────────────────────────
  // Runs on every second tick; refs prevent duplicate alerts
  useEffect(() => {
    if (now === 0) return;

    bookings.forEach((b) => {
      if (b.status !== "active") return;
      const remaining = b.endTime - now;

      // Single chime when crossing into the 10-min warning zone
      if (remaining > 0 && remaining <= 10 * 60 * 1000 && !warned10minRef.current.has(b.rawId)) {
        warned10minRef.current.add(b.rawId);
        playWarningChime();
        addTitleAlert(`warn:${b.facility}`);
        broadcast({ type: "warning-10min", bookingId: b.rawId, roomName: b.facility });
      }

      // Repeating beep every 30 s for overstay rooms
      if (remaining <= 0 && !overstayIntervalsRef.current.has(b.rawId)) {
        playOverstayBeep();
        addTitleAlert(`over:${b.facility}`);
        broadcast({ type: "overstay-start", bookingId: b.rawId, roomName: b.facility });
        const interval = setInterval(() => {
          playOverstayBeep();
          broadcast({ type: "overstay-start", bookingId: b.rawId, roomName: b.facility });
        }, 30_000);
        overstayIntervalsRef.current.set(b.rawId, interval);
      }
    });

    // Clear stale overstay intervals for bookings that are no longer active
    overstayIntervalsRef.current.forEach((interval, rawId) => {
      const booking = bookings.find((b) => b.rawId === rawId);
      if (!booking || booking.status !== "active") {
        clearInterval(interval);
        overstayIntervalsRef.current.delete(rawId);
        removeTitleAlert(`over:${booking?.facility ?? rawId}`);
        broadcast({ type: "overstay-stop", bookingId: rawId });
      }
    });
  }, [now, bookings]);

  // Cleanup all intervals on unmount
  useEffect(() => {
    const intervals = overstayIntervalsRef.current;
    return () => { intervals.forEach(clearInterval); };
  }, []);

  // ── Add-time handler ────────────────────────────────────
  const handleAddTimeConfirm = useCallback(async (id: string, minutes: number) => {
    const res = await fetch(`/api/bookings/${id}/extend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Gagal menambah waktu");
      return;
    }
    // Reset audio state so alerts can re-trigger if needed
    warned10minRef.current.delete(id);
    const interval = overstayIntervalsRef.current.get(id);
    if (interval) {
      clearInterval(interval);
      overstayIntervalsRef.current.delete(id);
      broadcast({ type: "overstay-stop", bookingId: id });
    }
    warned10minRef.current.delete(id);
    setAddTimeId(null);
  }, []);

  const handleOpenAddTime = useCallback((id: string) => {
    const booking = bookings.find((b) => b.rawId === id);
    setAddTimeLabel(booking ? `${booking.facility} · ${booking.customer}` : id);
    setAddTimeId(id);
  }, [bookings]);

  const handleOpenCheckout = useCallback((id: string, info: CheckoutBookingInfo) => {
    setCheckoutId(id);
    setCheckoutInfo(info);
  }, []);

  // ── F&B menu ────────────────────────────────────────────
  useEffect(() => {
    if (!activeBranchId) return;
    supabase
      .from("menu_items")
      .select("id, name, category, price")
      .eq("branch_id", activeBranchId)
      .eq("is_available", true)
      .eq("category", "fnb")
      .order("name")
      .then(({ data }) => { if (data) setMenuItems(data as MenuItem[]); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const handleOpenAddMenu = useCallback((bookingId: string, facilityName: string) => {
    setAddMenuTarget({ bookingId, facilityName });
  }, []);

  const handleCheckoutSuccess = useCallback((bookingId: string) => {
    setReceiptId(bookingId);
    warned10minRef.current.delete(bookingId);
    const interval = overstayIntervalsRef.current.get(bookingId);
    if (interval) {
      clearInterval(interval);
      overstayIntervalsRef.current.delete(bookingId);
      broadcast({ type: "overstay-stop", bookingId });
    }
  }, []);

  const filtered = bookings
    .filter((b) => filterStatus === "all" || b.status === filterStatus)
    .sort((a, b) => boothSortKey(a.boothNumber) - boothSortKey(b.boothNumber));

  const activeCount = bookings.filter((b) => b.status === "active").length;
  const waitingCount = bookings.filter((b) => b.status === "waiting").length;
  const overstayCount = bookings.filter((b) => b.status === "active" && b.endTime - now <= 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Memuat data booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Shift revenue summary */}
      <ShiftSummaryBar branchId={activeBranchId} shiftId={activeShift?.id} />

      {/* Incoming self-service orders */}
      <PendingOrdersPanel branchId={activeBranchId} />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Monitor Ruangan</h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau sesi berjalan, overstay, dan proses checkout.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {overstayCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
              ⚠ {overstayCount} Overstay
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neon-purple/10 text-neon-purple border border-neon-purple/20">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
            {activeCount} Aktif
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <SvgClock />
            {waitingCount} Menunggu
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "active", "waiting"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              filterStatus === s
                ? "bg-white/10 text-white border-white/20"
                : "bg-transparent text-slate-500 border-white/5 hover:text-white hover:border-white/15"
            }`}
          >
            {s === "all" ? "Semua" : s === "active" ? "Aktif" : "Menunggu"}
          </button>
        ))}
      </div>

      {/* Room card grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <SvgClock className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">Tidak ada sesi ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((booking) => (
              <RoomCard
                key={booking.rawId}
                booking={booking}
                now={now}
                onAddTime={handleOpenAddTime}
                onAddMenu={handleOpenAddMenu}
                onCheckout={handleOpenCheckout}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {addTimeId && (
          <AddTimeModal
            key="add-time"
            bookingId={addTimeId}
            bookingLabel={addTimeLabel}
            onConfirm={handleAddTimeConfirm}
            onClose={() => setAddTimeId(null)}
          />
        )}
      </AnimatePresence>

      <CheckoutModal
        isOpen={!!checkoutId}
        bookingId={checkoutId}
        bookingInfo={checkoutInfo}
        onClose={() => { setCheckoutId(null); setCheckoutInfo(null); }}
        onSuccess={handleCheckoutSuccess}
      />

      {addMenuTarget && (
        <AddMenuModal
          bookingId={addMenuTarget.bookingId}
          facilityName={addMenuTarget.facilityName}
          menuItems={menuItems}
          onClose={() => setAddMenuTarget(null)}
        />
      )}

      <BookingReceiptModal
        isOpen={!!receiptId}
        bookingId={receiptId}
        onClose={() => setReceiptId(null)}
      />
    </div>
  );
}
