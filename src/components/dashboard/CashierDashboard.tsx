"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useRealtimeFacilities } from "@/lib/hooks/useRealtimeFacilities";
import { useRealtimeBookings } from "@/lib/hooks/useRealtimeBookings";
import {
  useRealtimeOrderRequests,
  type OrderRequestDetail,
} from "@/lib/hooks/useRealtimeOrderRequests";
import BookingReceiptModal from "@/components/dashboard/BookingReceiptModal";
import {
  broadcast,
  addTitleAlert,
  removeTitleAlert,
} from "@/lib/notifications/tabNotifier";
import { playNTimes } from "@/lib/notifications/soundPlayer";
import type { Facility, Booking } from "@/lib/types/database";

// ── Local extended booking type ──────────────────────────────────
interface BookingRow extends Booking {
  member?: { full_name: string; whatsapp: string | null } | null;
  facility?: {
    name: string;
    category: string;
    price_per_hour: number;
    booth_number: string | null;
  } | null;
}

// ── Sound constants ───────────────────────────────────────────────
const SND_WARN10   = "/sounds/Peringatan 10 menit.wav";
const SND_WARN5    = "/sounds/Waktu Tersisa 5 Menit.wav";
const SND_OVERSTAY = "/sounds/Waktu Habis.wav";

// ── SVG Icons ────────────────────────────────────────────────────
const IconBanknote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);
const IconGrid2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function timeAgo(isoString: string): string {
  const diffMins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000);
  if (diffMins < 1) return "baru saja";
  if (diffMins < 60) return `${diffMins} mnt lalu`;
  return `${Math.floor(diffMins / 60)} jam lalu`;
}

function isOpenSentinel(endTimeIso: string | null): boolean {
  if (!endTimeIso) return true;
  return new Date(endTimeIso).getTime() - Date.now() > 23 * 60 * 60 * 1000;
}

function formatCountdown(remainingMs: number): string {
  const absMs = Math.abs(remainingMs);
  const totalSec = Math.floor(absMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return remainingMs < 0 ? `+${base}` : base;
}

// ── Shift totals shape ───────────────────────────────────────────
interface ShiftTotals {
  cash: number;
  qris: number;
  deposit: number;
  transfer: number;
  sessions: number;
}

// ── Add Time Mini-Modal ──────────────────────────────────────────
function AddTimeModal({
  bookingId,
  onClose,
  onSuccess,
}: {
  bookingId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customMin, setCustomMin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function extend(minutes: number) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Gagal menambah waktu");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[320px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-base">Tambah Waktu Sesi</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[15, 30, 60].map(min => (
            <button
              key={min}
              onClick={() => extend(min)}
              disabled={loading}
              className="py-3 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-neon-purple font-bold text-sm hover:bg-neon-purple/20 transition-all disabled:opacity-50"
            >
              +{min} min
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="480"
            placeholder="Menit custom..."
            value={customMin}
            onChange={e => setCustomMin(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-neon-purple"
          />
          <button
            onClick={() => {
              const m = parseInt(customMin);
              if (m >= 1 && m <= 480) extend(m);
            }}
            disabled={loading || !customMin}
            className="px-4 py-2 bg-neon-purple text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-neon-purple/80 transition-all"
          >
            OK
          </button>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}

// ── Checkout Mini-Modal ──────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: "CASH",     label: "Cash",     activeCls: "border-emerald-500 bg-emerald-500/15 text-emerald-400" },
  { key: "QRIS",     label: "QRIS",     activeCls: "border-neon-blue bg-neon-blue/15 text-neon-blue" },
  { key: "DEPOSIT",  label: "Deposit",  activeCls: "border-amber-500 bg-amber-500/15 text-amber-400" },
  { key: "TRANSFER", label: "Transfer", activeCls: "border-purple-500 bg-purple-500/15 text-purple-400" },
] as const;

function CheckoutModal({
  bookingId,
  total,
  memberName,
  facilityName,
  onClose,
  onDone,
}: {
  bookingId: string;
  total: number;
  memberName: string | null;
  facilityName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<string>("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/end-session`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: method }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Gagal checkout");
        return;
      }
      onDone();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[340px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-white text-base">Checkout Sesi</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <IconX />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          {facilityName}{memberName ? ` · ${memberName}` : ""}
        </p>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Tagihan</p>
          <p className="text-3xl font-extrabold text-white tabular-nums">{fmt(total)}</p>
        </div>

        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">
          Metode Pembayaran
        </p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {PAYMENT_METHODS.map(pm => (
            <button
              key={pm.key}
              onClick={() => setMethod(pm.key)}
              className={`py-3 rounded-xl border font-bold text-sm transition-all
                ${method === pm.key
                  ? pm.activeCls
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
            >
              {pm.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <button
          onClick={checkout}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-neon-purple text-white font-bold hover:bg-neon-purple/80 transition-all disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Konfirmasi Checkout →"}
        </button>
      </div>
    </div>
  );
}

// ── Room Card ────────────────────────────────────────────────────
function RoomCard({
  facility,
  booking,
  now,
  onAddTime,
  onCheckout,
}: {
  facility: Facility;
  booking?: BookingRow;
  now: number;
  onAddTime: (bookingId: string) => void;
  onCheckout: (
    bookingId: string,
    total: number,
    memberName: string | null,
    facilityName: string
  ) => void;
}) {
  const isActive = facility.status === "active";
  const endTimeIso = facility.active_booking_end_time;
  const isOpen = isActive && (booking?.is_open_session ?? isOpenSentinel(endTimeIso));

  let remaining: number | null = null;
  let zone: "safe" | "warning" | "critical" | "overtime" = "safe";

  if (isActive && !isOpen && endTimeIso) {
    remaining = new Date(endTimeIso).getTime() - now;
    if (remaining > 10 * 60 * 1000)      zone = "safe";
    else if (remaining > 5 * 60 * 1000)  zone = "warning";
    else if (remaining > 0)              zone = "critical";
    else                                  zone = "overtime";
  }

  const zoneTheme = {
    safe:     { wrapCls: "border-slate-700 bg-slate-900/60",    timerCls: "text-slate-200" },
    warning:  { wrapCls: "border-amber-500 bg-amber-500/10",    timerCls: "text-amber-400" },
    critical: { wrapCls: "border-orange-500 bg-orange-500/10",  timerCls: "text-orange-400" },
    overtime: { wrapCls: "border-red-500 bg-red-500/10",        timerCls: "text-red-400" },
  };

  const idleTheme =
    facility.status === "available"
      ? { wrapCls: "border-emerald-900/40 bg-emerald-950/20", timerCls: "text-emerald-700" }
      : { wrapCls: "border-slate-700/40 bg-slate-900/30",     timerCls: "text-slate-600" };

  const theme = isActive ? zoneTheme[zone] : idleTheme;

  const statusBadge = {
    available:    { label: "Tersedia",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    active:       { label: "Aktif",       cls: "bg-neon-blue/15 text-neon-blue border-neon-blue/30" },
    waiting_next: { label: "Booking",     cls: "bg-amber-400/15 text-amber-400 border-amber-400/30" },
    maintenance:  { label: "Maintenance", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  }[facility.status];

  const memberName = booking?.member?.full_name;

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300
        ${theme.wrapCls}
        ${isActive && zone === "overtime" ? "animate-pulse" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {facility.booth_number && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-white/10 text-white/50 text-[9px] font-black border border-white/10">
              #{facility.booth_number}
            </span>
          )}
          <p className="font-bold text-white text-sm truncate">{facility.name}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Player name */}
      {isActive && memberName && (
        <p className="text-xs text-slate-400 truncate -mt-1">{memberName}</p>
      )}

      {/* Center: timer or idle indicator */}
      <div className="flex-1 flex items-center justify-center py-3 min-h-[56px]">
        {facility.status === "available" && (
          <p className="text-lg font-bold text-emerald-600/50">Siap</p>
        )}
        {facility.status === "maintenance" && (
          <p className="text-sm font-bold text-red-500/50">Perbaikan</p>
        )}
        {facility.status === "waiting_next" && (
          <p className="text-sm font-bold text-amber-400/60">Booking Berikutnya</p>
        )}
        {isActive && isOpen && (
          <p className={`text-3xl font-mono font-black ${theme.timerCls}`}>∞</p>
        )}
        {isActive && !isOpen && remaining !== null && (
          <p className={`text-3xl font-mono font-black tabular-nums ${theme.timerCls}`}>
            {formatCountdown(remaining)}
          </p>
        )}
      </div>

      {/* Action buttons (active rooms only) */}
      {isActive && booking && (
        <div className="flex gap-2">
          <button
            onClick={() => onAddTime(booking.id)}
            className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 hover:border-white/20 transition-all"
          >
            + Waktu
          </button>
          <button
            onClick={() =>
              onCheckout(
                booking.id,
                booking.total_amount,
                memberName ?? null,
                facility.name
              )
            }
            className="flex-1 py-2 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs font-bold hover:bg-neon-purple/20 transition-all"
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );
}

// ── F&B Order Item ───────────────────────────────────────────────
function FnbOrderItem({
  order,
  accept,
  actionLoading,
}: {
  order: OrderRequestDetail;
  accept: (id: string) => Promise<void>;
  actionLoading: string | null;
}) {
  const foodItems = order.order_request_items.filter(i => i.menu_items != null);
  if (foodItems.length === 0) return null;

  const total = foodItems.reduce(
    (sum, i) => sum + (i.menu_items?.price ?? 0) * i.quantity,
    0
  );
  const boothPart = order.facilities?.booth_number
    ? ` · #${order.facilities.booth_number}`
    : "";
  const roomLabel = order.facilities ? `${order.facilities.name}${boothPart}` : "—";
  const isLoading = actionLoading === order.id;

  return (
    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-white truncate">{roomLabel}</p>
        <span className="shrink-0 text-[10px] text-slate-500 ml-2">{timeAgo(order.created_at)}</span>
      </div>
      <div className="space-y-0.5 mb-3">
        {foodItems.map(item => (
          <div key={item.id} className="flex justify-between text-xs">
            <span className="text-slate-400 truncate">
              {item.quantity}× {item.menu_items?.name}
            </span>
            <span className="text-slate-300 tabular-nums shrink-0 ml-2">
              {fmt(item.quantity * (item.menu_items?.price ?? 0))}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-slate-700/50 pt-2">
        <span className="text-sm font-bold text-white tabular-nums">{fmt(total)}</span>
        <button
          onClick={() => accept(order.id)}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          <IconCheck /> {isLoading ? "..." : "Selesai"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function CashierDashboard() {
  const { activeBranchId, activeShift, profile } = useUser();
  const supabaseRef = useRef(createClient());

  // Data hooks
  const { facilities } = useRealtimeFacilities(activeBranchId);
  const { bookings, refetch: refetchBookings } = useRealtimeBookings(activeBranchId, ["active"]);
  const { orders, accept, actionLoading } = useRealtimeOrderRequests(activeBranchId);

  // Live clock (1-second tick)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Threshold detection: 10-min, 5-min, overtime warnings
  const warned10minRef      = useRef<Set<string>>(new Set());
  const warned5minRef       = useRef<Set<string>>(new Set());
  const overstayRef         = useRef<Set<string>>(new Set());
  const overstayIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    const activeIds = new Set<string>();

    for (const f of facilities) {
      if (f.status !== "active" || !f.active_booking_id) continue;
      const endIso = f.active_booking_end_time;
      if (!endIso || isOpenSentinel(endIso)) continue;

      const id = f.active_booking_id;
      activeIds.add(id);
      const remaining = new Date(endIso).getTime() - now;
      const roomName  = f.name + (f.booth_number ? ` #${f.booth_number}` : "");

      if (remaining > 0 && remaining <= 10 * 60_000 && !warned10minRef.current.has(id)) {
        warned10minRef.current.add(id);
        playNTimes(SND_WARN10, 3).catch(() => {});
        addTitleAlert(`warn:${roomName}`);
        broadcast({ type: "warning-10min", bookingId: id, roomName });
        setTimeout(() => removeTitleAlert(`warn:${roomName}`), 15 * 60_000);
      }

      if (remaining > 0 && remaining <= 5 * 60_000 && !warned5minRef.current.has(id)) {
        warned5minRef.current.add(id);
        playNTimes(SND_WARN5, 3).catch(() => {});
        addTitleAlert(`warn5:${roomName}`);
        broadcast({ type: "warning-5min", bookingId: id, roomName });
        setTimeout(() => removeTitleAlert(`warn5:${roomName}`), 10 * 60_000);
      }

      if (remaining <= 0 && !overstayRef.current.has(id)) {
        overstayRef.current.add(id);
        playNTimes(SND_OVERSTAY, 3).catch(() => {});
        broadcast({ type: "overstay-start", bookingId: id, roomName });
        // Repeat every 30s on THIS tab — GlobalOrderNotifier on other tabs plays once via BC
        const interval = setInterval(() => {
          playNTimes(SND_OVERSTAY, 3).catch(() => {});
        }, 30_000);
        overstayIntervalsRef.current.set(id, interval);
      }
    }

    // Clean up refs for sessions that ended
    for (const id of Array.from(warned10minRef.current)) {
      if (!activeIds.has(id)) warned10minRef.current.delete(id);
    }
    for (const id of Array.from(warned5minRef.current)) {
      if (!activeIds.has(id)) warned5minRef.current.delete(id);
    }
    for (const id of Array.from(overstayRef.current)) {
      if (!activeIds.has(id)) {
        overstayRef.current.delete(id);
        const interval = overstayIntervalsRef.current.get(id);
        if (interval !== undefined) {
          clearInterval(interval);
          overstayIntervalsRef.current.delete(id);
        }
        broadcast({ type: "overstay-stop", bookingId: id });
      }
    }
  }, [now, facilities]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear overstay intervals on unmount
  useEffect(() => {
    const intervals = overstayIntervalsRef.current;
    return () => { intervals.forEach(clearInterval); };
  }, []);

  // Shift totals
  const [shiftTotals, setShiftTotals] = useState<ShiftTotals>({
    cash: 0, qris: 0, deposit: 0, transfer: 0, sessions: 0,
  });

  const fetchShiftTotals = useCallback(async () => {
    if (!activeShift?.id || !activeBranchId) return;
    const { data } = await supabaseRef.current
      .from("bookings")
      .select("payment_method, total_amount")
      .eq("branch_id", activeBranchId)
      .eq("shift_id", activeShift.id)
      .eq("status", "completed");
    if (!data) return;
    const totals: ShiftTotals = { cash: 0, qris: 0, deposit: 0, transfer: 0, sessions: data.length };
    for (const b of data) {
      const m = ((b.payment_method as string | null) ?? "").toUpperCase();
      const amt = (b.total_amount as number) ?? 0;
      if (m === "CASH" || m === "TUNAI") totals.cash += amt;
      else if (m === "QRIS")             totals.qris += amt;
      else if (m === "DEPOSIT")          totals.deposit += amt;
      else if (m === "TRANSFER")         totals.transfer += amt;
    }
    setShiftTotals(totals);
  }, [activeShift?.id, activeBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchShiftTotals();
    if (!activeBranchId) return;
    const channel = supabaseRef.current
      .channel(`cashier-shift-totals-${activeBranchId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "bookings",
        filter: `branch_id=eq.${activeBranchId}`,
      }, () => fetchShiftTotals())
      .subscribe();
    return () => { supabaseRef.current.removeChannel(channel); };
  }, [fetchShiftTotals, activeBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge active bookings by facility_id for room card data
  const bookingByFacilityId = useMemo(
    () => Object.fromEntries(bookings.map(b => [b.facility_id, b as unknown as BookingRow])),
    [bookings]
  );

  // Derived metrics
  const activeCount = facilities.filter(f => f.status === "active").length;
  const totalFacilities = facilities.length;
  const foodOrderCount = orders.filter(o =>
    o.order_request_items.some(i => i.menu_items != null)
  ).length;
  const attentionCount = facilities.filter(f => {
    if (f.status !== "active") return false;
    const et = f.active_booking_end_time;
    if (!et || isOpenSentinel(et)) return false;
    const rem = new Date(et).getTime() - now;
    return rem > 0 && rem <= 10 * 60 * 1000;
  }).length;
  const shiftTotal =
    shiftTotals.cash + shiftTotals.qris + shiftTotals.deposit + shiftTotals.transfer;

  // Modal state
  const [addTimeBookingId, setAddTimeBookingId] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<{
    bookingId: string;
    total: number;
    memberName: string | null;
    facilityName: string;
  } | null>(null);
  const [receiptBookingId, setReceiptBookingId] = useState<string | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Kasir";

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard Kasir</h1>
        <p className="text-sm text-slate-400 mt-1">
          Halo, {firstName.toUpperCase()} — Shift sedang berjalan
        </p>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Setoran Shift */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-5 right-5 text-slate-600 group-hover:text-neon-purple transition-colors">
            <IconBanknote />
          </div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Setoran Shift Ini</h3>
          <p className="text-2xl font-extrabold text-white mt-2 tracking-wide">{fmt(shiftTotal)}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            Cash: <span className="text-emerald-400">{fmt(shiftTotals.cash)}</span>
            {" · "}
            QRIS: <span className="text-neon-blue">{fmt(shiftTotals.qris)}</span>
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">{shiftTotals.sessions} sesi selesai</p>
        </div>

        {/* Keterisian */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-5 right-5 text-slate-600 group-hover:text-neon-purple transition-colors">
            <IconGrid2 />
          </div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Keterisian</h3>
          <p className="text-2xl font-extrabold text-white mt-2 tracking-wide">
            {activeCount} / {totalFacilities}
          </p>
          <p className={`text-xs mt-1.5 font-medium ${activeCount > 0 ? "text-neon-blue" : "text-slate-500"}`}>
            {totalFacilities === 0
              ? "—"
              : `${Math.round((activeCount / totalFacilities) * 100)}% terpakai`}
          </p>
        </div>

        {/* Antrean F&B */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-5 right-5 text-slate-600 group-hover:text-neon-purple transition-colors">
            <IconCart />
          </div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Antrean F&B</h3>
          <p className="text-2xl font-extrabold text-white mt-2 tracking-wide">{foodOrderCount}</p>
          <p className={`text-xs mt-1.5 font-medium ${foodOrderCount > 0 ? "text-amber-400" : "text-slate-500"}`}>
            {foodOrderCount > 0 ? "Segera diproses" : "Tidak ada pesanan"}
          </p>
        </div>

        {/* Perhatian */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-5 right-5 text-slate-600 group-hover:text-neon-purple transition-colors">
            <IconAlert />
          </div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perhatian</h3>
          <p className={`text-2xl font-extrabold mt-2 tracking-wide ${attentionCount > 0 ? "text-amber-400" : "text-white"}`}>
            {attentionCount}
          </p>
          <p className={`text-xs mt-1.5 font-medium ${attentionCount > 0 ? "text-amber-400/80" : "text-slate-500"}`}>
            {attentionCount > 0 ? `${attentionCount} ruangan ≤ 10 menit` : "Semua aman"}
          </p>
        </div>
      </div>

      {/* ── Body: Room Grid + F&B Sidebar ───────────────────── */}
      <div className="flex gap-5 items-start">
        {/* Room Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Room Grid</h2>
            <span className="text-xs text-slate-500">
              {activeCount} aktif · {totalFacilities} total
            </span>
          </div>

          {totalFacilities === 0 ? (
            <div className="flex items-center justify-center h-40 bg-slate-900/30 rounded-2xl border border-slate-800">
              <p className="text-slate-600 text-sm">Tidak ada ruangan terdaftar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map(f => (
                <RoomCard
                  key={f.id}
                  facility={f}
                  booking={bookingByFacilityId[f.id]}
                  now={now}
                  onAddTime={setAddTimeBookingId}
                  onCheckout={(bookingId, total, memberName, facilityName) =>
                    setCheckoutState({ bookingId, total, memberName, facilityName })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* F&B Orders Sidebar */}
        <div className="w-72 xl:w-80 shrink-0 sticky top-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pesanan F&B</h2>
              {foodOrderCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                  {foodOrderCount}
                </span>
              )}
            </div>
            <div className="p-3 space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto">
              {foodOrderCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="text-slate-700"><IconCart /></div>
                  <p className="text-xs text-slate-600 text-center">
                    Tidak ada pesanan F&B saat ini
                  </p>
                </div>
              ) : (
                orders
                  .filter(o => o.order_request_items.some(i => i.menu_items != null))
                  .map(order => (
                    <FnbOrderItem
                      key={order.id}
                      order={order}
                      accept={accept}
                      actionLoading={actionLoading}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {addTimeBookingId && (
        <AddTimeModal
          bookingId={addTimeBookingId}
          onClose={() => setAddTimeBookingId(null)}
          onSuccess={() => {
            // Reset warning refs so they re-fire when the extended session approaches thresholds again
            warned10minRef.current.delete(addTimeBookingId);
            warned5minRef.current.delete(addTimeBookingId);
            overstayRef.current.delete(addTimeBookingId);
            const overstayInterval = overstayIntervalsRef.current.get(addTimeBookingId);
            if (overstayInterval !== undefined) {
              clearInterval(overstayInterval);
              overstayIntervalsRef.current.delete(addTimeBookingId);
            }
            refetchBookings();
          }}
        />
      )}

      {checkoutState && (
        <CheckoutModal
          bookingId={checkoutState.bookingId}
          total={checkoutState.total}
          memberName={checkoutState.memberName}
          facilityName={checkoutState.facilityName}
          onClose={() => setCheckoutState(null)}
          onDone={() => {
            setReceiptBookingId(checkoutState.bookingId);
            setCheckoutState(null);
          }}
        />
      )}

      <BookingReceiptModal
        isOpen={!!receiptBookingId}
        bookingId={receiptBookingId}
        onClose={() => setReceiptBookingId(null)}
      />
    </div>
  );
}
