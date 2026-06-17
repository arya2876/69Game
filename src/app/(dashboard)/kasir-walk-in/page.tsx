"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRealtimeFacilities } from "@/lib/hooks/useRealtimeFacilities";
import { useRealtimeBookings } from "@/lib/hooks/useRealtimeBookings";
import { createClient } from "@/lib/supabase/client";
import { processCashierBooking, endSessionAndSaveTime } from "@/app/actions/cashier";
import type { Facility, Booking } from "@/lib/types/database";

// ── RAW SVG ICONS ───────────────────────────────────────────
const SvgUser = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
const SvgPhone = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>);
const SvgMonitor = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>);
const SvgZap = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>);
const SvgSave = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>);
const SvgCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12" /></svg>);
const SvgPlay = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="5 3 19 12 5 21 5 3" /></svg>);
const SvgPower = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>);
const SvgWarn = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
const SvgLoader = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>);

// ── SORT BY BOOTH NUMBER ───────────────────────────────────
function boothSortKey(booth: string | null | undefined): number {
  if (!booth) return Infinity;
  const m = booth.match(/\d+/);
  return m ? parseInt(m[0]) : Infinity;
}

// ── COUNTDOWN FORMATTER ────────────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Count-up formatter for open sessions
function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface BookingWithDetails extends Booking {
  member?: { full_name: string; whatsapp: string | null } | null;
  facility?: { name: string; category: string; price_per_hour: number } | null;
}

function getActiveBooking(bookings: BookingWithDetails[], facilityId: string) {
  return bookings.find(b => b.facility_id === facilityId && b.status === "active");
}

function getNextScheduledBooking(bookings: BookingWithDetails[], facilityId: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  return bookings
    .filter(b => b.facility_id === facilityId && b.status === "scheduled" && new Date(b.start_time) >= today && new Date(b.start_time) < tomorrow)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
}

// ── ADD MENU MODAL ──────────────────────────────────────────
interface MenuItem { id: string; name: string; category: string; price: number; }

function AddMenuModal({
  bookingId, facilityName, menuItems, onClose,
}: {
  bookingId: string; facilityName: string; menuItems: MenuItem[]; onClose: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fnbItems = menuItems.filter(m => m.category === "fnb");

  const setQty = (id: string, delta: number) =>
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleAdd = async () => {
    const toAdd = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (toAdd.length === 0) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      for (const [menuItemId, quantity] of toAdd) {
        const res = await fetch(`/api/bookings/${bookingId}/add-item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menu_item_id: menuItemId, quantity }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      }
      const itemNames = toAdd.map(([id, qty]) => {
        const item = menuItems.find(m => m.id === id);
        return `${item?.name} ×${qty}`;
      }).join(", ");
      setSuccess(`Ditambahkan: ${itemNames}`);
      setQuantities({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Tambah F&amp;B</h3>
            <p className="text-xs text-slate-400 mt-0.5">{facilityName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {fnbItems.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Belum ada item menu yang tersedia.<br/>Tambahkan menu di halaman Pengaturan.</p>
          ) : fnbItems.map(item => {
            const qty = quantities[item.id] ?? 0;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">Rp {item.price.toLocaleString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setQty(item.id, -1)} disabled={qty === 0}
                    className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 transition-all">−</button>
                  <span className="w-5 text-center text-sm font-mono text-white">{qty}</span>
                  <button onClick={() => setQty(item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-neon-purple/20 border border-neon-purple/40 text-neon-purple text-sm font-bold flex items-center justify-center hover:bg-neon-purple/30 transition-all">+</button>
                </div>
              </div>
            );
          })}
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">{success}</div>
        )}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>
        )}

        <div className="px-4 pb-4">
          <button onClick={handleAdd} disabled={totalItems === 0 || loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-neon-purple to-neon-blue text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2">
            {loading
              ? <><SvgLoader />Menambahkan...</>
              : totalItems > 0
                ? `Tambahkan ${totalItems} Item`
                : "Pilih Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LIVE ROOM CARD ──────────────────────────────────────────
function RoomCard({ facility, activeBooking, nextBooking, now, onQuickBook, onEndSession, onStartEarly, onStartNext, onAddMenu, actionLoading }: {
  facility: Facility; activeBooking?: BookingWithDetails; nextBooking?: BookingWithDetails; now: number;
  onQuickBook: (id: string) => void; onEndSession: (id: string) => void; onStartEarly: (id: string) => void; onStartNext: (id: string) => void;
  onAddMenu: (bookingId: string, facilityName: string) => void; actionLoading: string | null;
}) {
  const isActive = facility.status === "active";
  const isWaitingNext = facility.status === "waiting_next";
  const isMaintenance = facility.status === "maintenance";
  const isOpen = isActive && !!activeBooking?.is_open_session;
  const startTimeMs = activeBooking ? new Date(activeBooking.start_time).getTime() : 0;
  const endTimeMs = activeBooking ? new Date(activeBooking.end_time).getTime() : 0;
  const elapsed = isOpen ? now - startTimeMs : 0;
  const remaining = isActive && !isOpen ? endTimeMs - now : 0;
  const isExpired = isActive && !isOpen && remaining <= 0;
  const isUrgent = isActive && !isOpen && remaining > 0 && remaining < 10 * 60 * 1000;
  const openEstimate = isOpen && activeBooking
    ? Math.round((Math.ceil(elapsed / 60_000) / 60) * (activeBooking.facility?.price_per_hour ?? 0))
    : 0;
  const hasUpcoming = facility.status === "available" && nextBooking;
  const customerName = activeBooking?.member?.full_name || "Walk-in";
  const customerWa = activeBooking?.member?.whatsapp;
  const waitingCustomer = isWaitingNext && nextBooking ? nextBooking.member?.full_name || "Pelanggan" : null;

  if (isMaintenance) {
    return (
      <div className="relative rounded-xl p-4 border border-slate-700/30 bg-slate-900/30 opacity-50">
        <div className="flex items-center justify-between mb-3">
          {facility.booth_number
            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/60 text-slate-500 border border-slate-700/50">{facility.booth_number}</span>
            : <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{facility.category}</span>
          }
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400/60 border border-red-500/10">Maintenance</span>
        </div>
        <h3 className="font-bold text-slate-500 text-sm mb-0.5">{facility.name}</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">{facility.category}</p>
        <p className="text-xs text-slate-600">Fasilitas sedang dalam perbaikan.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl p-4 border transition-all duration-300 overflow-hidden ${
      isActive ? isExpired ? "border-amber-500/40 bg-amber-500/5" : isUrgent ? "border-red-500/40 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-red-500/30 bg-slate-900/50"
      : isWaitingNext ? "border-neon-purple/50 bg-neon-purple/5 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
      : "border-emerald-500/30 bg-slate-900/50 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
    }`}>
      <div className="flex items-center justify-between mb-3">
        {facility.booth_number
          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{facility.booth_number}</span>
          : <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{facility.category}</span>
        }
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isActive ? isExpired ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"
          : isWaitingNext ? "bg-neon-purple/15 text-neon-purple border border-neon-purple/30" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
        }`}>
          {isActive && !isExpired && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
          {isWaitingNext && <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />}
          {isActive ? (isExpired ? "Waktu Habis" : "Aktif") : isWaitingNext ? "Menunggu Sesi" : "Tersedia"}
        </span>
      </div>
      
      <div className="mb-3">
        <h3 className="font-bold text-white text-sm">{facility.name}</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{facility.category}</p>
      </div>

      {isActive && activeBooking ? (
        <>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400"><SvgUser /><span>{customerName}</span></div>
            {customerWa && <div className="flex items-center gap-2 text-xs text-slate-400"><SvgPhone /><span>{customerWa}</span></div>}
          </div>
          {isOpen ? (
            <div className="rounded-lg p-3 mb-3 border bg-neon-blue/5 border-neon-blue/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Berjalan</span>
                <span className="text-[10px] font-bold text-neon-blue uppercase tracking-wider">Open</span>
              </div>
              <span className="text-2xl font-bold font-mono tracking-wider text-neon-blue block text-center">
                {formatElapsed(elapsed)}
              </span>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <span className="text-[10px] text-slate-500">Estimasi Tagihan</span>
                <span className="text-xs font-bold text-white">Rp {openEstimate.toLocaleString("id-ID")}</span>
              </div>
            </div>
          ) : (
            <div className={`rounded-lg p-3 mb-3 text-center border ${isExpired ? "bg-amber-500/10 border-amber-500/20" : isUrgent ? "bg-red-500/10 border-red-500/20" : "bg-slate-800/50 border-slate-700/50"}`}>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Sisa Waktu</span>
              <span className={`text-2xl font-bold font-mono tracking-wider ${isExpired ? "text-amber-400" : isUrgent ? "text-red-400 animate-pulse" : "text-white"}`}>
                {isExpired ? "HABIS" : formatCountdown(remaining)}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onAddMenu(activeBooking.id, facility.name)}
              className="flex-shrink-0 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-neon-purple/10 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/20 transition-all"
            >
              <SvgZap />F&amp;B
            </button>
            <button onClick={() => onEndSession(activeBooking.id)} disabled={actionLoading === activeBooking.id} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
              {actionLoading === activeBooking.id ? <SvgLoader /> : <SvgSave />} {isOpen ? "Checkout" : "Selesai"}
            </button>
          </div>
        </>
      ) : isWaitingNext ? (
        <>
          <div className="space-y-1.5 mb-3"><div className="flex items-center gap-2 text-xs text-slate-400"><SvgUser /><span className="font-semibold text-white">{waitingCustomer}</span><span className="text-neon-purple ml-1">(Next)</span></div></div>
          <button onClick={() => nextBooking && onStartNext(nextBooking.id)} disabled={!nextBooking || actionLoading === nextBooking?.id} className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-neon-purple/10 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/20 transition-all disabled:opacity-50">
            {actionLoading === nextBooking?.id ? <SvgLoader /> : <SvgPower />} Nyalakan TV &amp; Mulai Sesi
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1 mb-3">
            <div className="text-xs text-slate-500">Rp {facility.price_per_hour.toLocaleString("id-ID")}/jam</div>
            {hasUpcoming && (
              <div className="mt-2 p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs">
                <p className="text-slate-400"><span className="text-white font-semibold">Booking:</span> {nextBooking.member?.full_name || "Walk-in"} <span className="text-neon-blue">({new Date(nextBooking.start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})</span></p>
              </div>
            )}
          </div>
          {hasUpcoming ? (
            <button onClick={() => onStartEarly(nextBooking.id)} disabled={actionLoading === nextBooking.id} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
              {actionLoading === nextBooking.id ? <SvgLoader /> : <SvgPlay />} Mulai Lebih Awal
            </button>
          ) : (
            <button onClick={() => onQuickBook(facility.id)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
              <SvgZap /> Booking Cepat
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────
export default function KasirWalkInPage() {
  const { activeBranchId } = useUser();
  const { facilities, loading: facilitiesLoading } = useRealtimeFacilities(activeBranchId);
  const { bookings } = useRealtimeBookings(activeBranchId, ["scheduled", "active"]);

  const [now, setNow] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerWa, setCustomerWa] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number | 'MAX' | 'custom' | null>(null);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [useDepositMinutes, setUseDepositMinutes] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "QRIS" | "Cash+Cash" | "Cash+QRIS" | "QRIS+QRIS">("Cash");
  const [splitAmount1, setSplitAmount1] = useState<number>(0);

  // Status State
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Member Search State
  const [memberLoading, setMemberLoading] = useState(false);
  const [foundMember, setFoundMember] = useState<{ id: string; full_name: string; whatsapp: string | null } | null>(null);
  const [memberBalances, setMemberBalances] = useState<{ facility_category: string; balance_minutes: number }[]>([]);

  // Add Menu Modal State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [addMenuTarget, setAddMenuTarget] = useState<{ bookingId: string; facilityName: string } | null>(null);

  // Discount promo from room_rates (percentage / fixed price)
  const [activePromo, setActivePromo] = useState<{
    label: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
  } | null>(null);

  // Bonus-jam promo: "main X jam gratis Y jam"
  const [bonusPromo, setBonusPromo] = useState<{
    id: string;
    name: string;
    buy_hours: number;
    free_hours: number;
  } | null>(null);

  useEffect(() => {
    const t0 = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);

  const selectedRoom = facilities.find(f => f.id === selectedFacility);
  const isRoomActive = selectedRoom?.status === "active";

  const supabase = createClient();

  // Search Member Effect
  useEffect(() => {
    const formattedWa = customerWa.replace(/\D/g, "");
    if (formattedWa.length >= 10) {
      const searchMember = async () => {
        setMemberLoading(true);
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, whatsapp")
            .eq("whatsapp", formattedWa)
            .single();

          if (profile) {
            setFoundMember(profile);
            setCustomerName(profile.full_name);
            
            const { data: balances } = await supabase
              .from("member_deposit_balances")
              .select("facility_category, balance_minutes")
              .eq("member_id", profile.id);
            setMemberBalances(balances || []);
          } else {
            setFoundMember(null);
            setMemberBalances([]);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setMemberLoading(false);
        }
      };
      
      const timeoutId = setTimeout(searchMember, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setTimeout(() => { setFoundMember(null); setMemberBalances([]); }, 0);
    }
  }, [customerWa, supabase]);

  // Derived Values
  const availableDeposit = selectedRoom
    ? memberBalances.find(b => b.facility_category === selectedRoom.category)?.balance_minutes || 0 
    : 0;

  const isOpenSession = selectedDuration === 0;

  let maxDurationMinutes = 0;
  if (selectedDuration === 'MAX') {
    maxDurationMinutes = availableDeposit;
  } else if (selectedDuration === 'custom') {
    maxDurationMinutes = customHours * 60 + customMinutes;
  } else if (isOpenSession) {
    maxDurationMinutes = 0; // no fixed duration — paid at checkout
  } else if (typeof selectedDuration === 'number' && selectedDuration > 0) {
    maxDurationMinutes = selectedDuration * 60;
  }
  
  // Auto-adjust useDepositMinutes if duration changes
  useEffect(() => {
    if (selectedDuration === 'MAX') {
      setTimeout(() => setUseDepositMinutes(availableDeposit), 0);
    } else {
      const clamped = Math.min(useDepositMinutes, maxDurationMinutes, availableDeposit);
      if (clamped !== useDepositMinutes) setTimeout(() => setUseDepositMinutes(clamped), 0);
    }
  }, [maxDurationMinutes, availableDeposit, selectedDuration, useDepositMinutes]);

  // Total actual duration (includes free bonus hours from promo)
  const totalDurationMinutes = maxDurationMinutes + (bonusPromo ? bonusPromo.free_hours * 60 : 0);

  const remainingMinutesToPay = Math.max(0, maxDurationMinutes - useDepositMinutes);
  const basePaidAmount = selectedRoom && !isOpenSession
    ? Math.round((remainingMinutesToPay / 60) * selectedRoom.price_per_hour)
    : 0;
  const paidAmount = activePromo
    ? activePromo.discount_type === "percentage"
      ? Math.round(basePaidAmount * (1 - activePromo.discount_value / 100))
      : Math.max(0, basePaidAmount - activePromo.discount_value)
    : basePaidAmount;

  const isSplitMethod = paymentMethod.includes("+");
  const splitAmount2 = isSplitMethod ? paidAmount - splitAmount1 : 0;

  const handleSubmit = useCallback(async () => {
    if (!customerName || !selectedFacility || selectedDuration === null || isRoomActive || !activeBranchId) return;
    if (!isOpenSession && maxDurationMinutes === 0) return;
    if (isSplitMethod && (splitAmount1 <= 0 || splitAmount1 >= paidAmount)) {
      setSubmitError("Jumlah split tidak valid. Pastikan setiap metode > 0.");
      return;
    }
    setSubmitLoading(true); setSubmitError(null); setSubmitSuccess(null);
    try {
      const res = await processCashierBooking({
        branchId: activeBranchId,
        facilityId: selectedFacility,
        customerName,
        customerWa,
        durationMinutes: totalDurationMinutes,
        useDepositMinutes,
        paidAmount,
        paymentMethod,
        splitAmount1: isSplitMethod ? splitAmount1 : undefined,
      });

      if (res.success) {
        setCustomerName(""); setCustomerWa(""); setSelectedFacility(""); setSelectedDuration(null); setUseDepositMinutes(0);
        setPaymentMethod("Cash"); setSplitAmount1(0);
        setSubmitSuccess(res.memberCreated ? "Booking sukses! Akun member otomatis dibuat (Password = Nomor WA)." : "Booking sukses diproses!");
        setTimeout(() => setSubmitSuccess(null), 5000);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitLoading(false);
    }
  }, [activeBranchId, customerName, customerWa, selectedFacility, selectedDuration, isRoomActive, isOpenSession, maxDurationMinutes, totalDurationMinutes, useDepositMinutes, paidAmount, paymentMethod, isSplitMethod, splitAmount1]);

  const handleQuickBook = useCallback((id: string) => { setSelectedFacility(id); setSelectedDuration(null); document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" }); }, []);

  const handleStartEarly = useCallback(async (bookingId: string) => {
    setActionLoading(bookingId);
    try { const r = await fetch(`/api/bookings/${bookingId}/start-early`, { method: "PATCH" }); if (!r.ok) { const d = await r.json(); alert(d.error); } } catch { alert("Network error"); }
    finally { setActionLoading(null); }
  }, []);

  const handleStartNext = useCallback(async (bookingId: string) => {
    setActionLoading(bookingId);
    try { const r = await fetch(`/api/bookings/${bookingId}/start-next`, { method: "PATCH" }); if (!r.ok) { const d = await r.json(); alert(d.error); } } catch { alert("Network error"); }
    finally { setActionLoading(null); }
  }, []);

  const handleEndSession = useCallback(async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const res = await endSessionAndSaveTime(bookingId);
      if (res.success) {
        if (res.refundedMinutes > 0) alert(`✅ Sesi dihentikan!\n\n${res.refundedMinutes} menit disimpan ke deposit waktu member.`);
        else alert("✅ Sesi selesai.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error");
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Lookup discount promo from room_rates
  useEffect(() => {
    if (!activeBranchId || !selectedRoom || typeof selectedDuration !== "number" || selectedDuration <= 0) {
      setTimeout(() => setActivePromo(null), 0);
      return;
    }
    supabase
      .from("room_rates")
      .select("label, discount_type, discount_value")
      .eq("branch_id", activeBranchId)
      .eq("facility_category", selectedRoom.category)
      .eq("duration_hours", selectedDuration)
      .eq("is_active", true)
      .eq("is_discount_active", true)
      .maybeSingle()
      .then(({ data }) => { setActivePromo(data as typeof activePromo ?? null); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, selectedRoom?.category, selectedDuration]);

  // Lookup bonus-jam promo from promos table
  useEffect(() => {
    if (!activeBranchId || !selectedRoom || typeof selectedDuration !== "number" || selectedDuration <= 0) {
      setTimeout(() => setBonusPromo(null), 0);
      return;
    }
    const now = new Date().toISOString();
    supabase
      .from("promos")
      .select("id, name, buy_hours, free_hours")
      .eq("branch_id", activeBranchId)
      .eq("is_active", true)
      .eq("buy_hours", selectedDuration)
      .or(`facility_category.eq.${selectedRoom.category},facility_category.is.null`)
      .or(`valid_from.is.null,valid_from.lte.${now}`)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .maybeSingle()
      .then(({ data }) => { setBonusPromo(data ?? null); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, selectedRoom?.category, selectedDuration]);

  // Fetch menu items once per branch
  useEffect(() => {
    if (!activeBranchId) return;
    supabase
      .from("menu_items")
      .select("id, name, category, price")
      .eq("branch_id", activeBranchId)
      .eq("is_available", true)
      .eq("category", "fnb")
      .order("name")
      .then(({ data }) => { if (data) setMenuItems(data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const handleOpenAddMenu = useCallback((bookingId: string, facilityName: string) => {
    setAddMenuTarget({ bookingId, facilityName });
  }, []);

  const sortedFacilities = [...facilities].sort((a, b) => boothSortKey(a.booth_number) - boothSortKey(b.booth_number));
  const activeCount = sortedFacilities.filter(f => f.status === "active").length;
  const availableCount = sortedFacilities.filter(f => f.status === "available").length;
  const availableFacilities = sortedFacilities.filter(f => f.status !== "maintenance");

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Kasir Walk-in</h1>
          <p className="text-sm text-slate-400 mt-1">Input transaksi walk-in & monitor ketersediaan ruangan secara real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{availableCount} Tersedia</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />{activeCount} Aktif</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* BOOKING FORM */}
        <div id="booking-form" className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6"><div className="p-1.5 bg-neon-purple/20 rounded-lg"><SvgZap /></div><h2 className="text-base font-bold text-white">Input Transaksi Walk-in</h2></div>
            <div className="space-y-5">
              
              {/* Member Auto Search Input */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Nomor WhatsApp <span className="text-slate-600 normal-case font-normal">(opsional)</span>
                  {memberLoading && <SvgLoader />}
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 focus-within:border-neon-purple/50 transition-colors">
                  <SvgPhone />
                  <input type="tel" placeholder="08xxxxxxxxxx (opsional)" value={customerWa} onChange={e => setCustomerWa(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600" />
                </div>
                {foundMember && <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><SvgCheck /> Member terdeteksi.</p>}
                {!foundMember && customerWa.length >= 10 && !memberLoading && <p className="text-[10px] text-neon-blue mt-1">Bukan member. Akun baru akan otomatis dibuat.</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Nama Pelanggan</label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 focus-within:border-neon-purple/50 transition-colors">
                  <SvgUser />
                  <input type="text" placeholder="Masukkan nama..." value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={!!foundMember} className={`bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600 ${foundMember ? 'opacity-50 cursor-not-allowed' : ''}`} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Fasilitas</label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 focus-within:border-neon-purple/50 transition-colors">
                  <SvgMonitor />
                  <select value={selectedFacility} onChange={e => { setSelectedFacility(e.target.value); setSelectedDuration(null); setUseDepositMinutes(0); }} className="bg-transparent border-none outline-none text-sm text-white w-full appearance-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white">
                    <option value="">— Pilih ruangan —</option>
                    {availableFacilities.map(f => (<option key={f.id} value={f.id}>{f.name}{f.booth_number ? ` [${f.booth_number}]` : ""} {f.status === "active" ? " (Digunakan)" : ` — Rp ${f.price_per_hour.toLocaleString("id-ID")}/jam`}</option>))}
                  </select>
                </div>
                {selectedRoom && foundMember && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Saldo deposit {selectedRoom.category}: <span className="font-bold text-white">{availableDeposit} menit</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Durasi</label>
                {isRoomActive ? (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"><span className="text-red-400"><SvgWarn /></span><span className="text-xs text-red-400 font-medium">Fasilitas sedang digunakan.</span></div>
                ) : (
                  <div className="space-y-2">
                    {/* Preset buttons: 1/2/3 jam + Open + Custom */}
                    <div className="grid grid-cols-5 gap-2">
                      {([1, 2, 3] as const).map(hr => (
                        <button key={hr} onClick={() => setSelectedDuration(hr)} disabled={!selectedFacility || isRoomActive}
                          className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${selectedDuration === hr ? "bg-neon-purple/20 text-neon-purple border-neon-purple/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : !selectedFacility ? "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed" : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"}`}>
                          {hr} Jam
                        </button>
                      ))}
                      <button onClick={() => setSelectedDuration(0)} disabled={!selectedFacility || isRoomActive}
                        className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${selectedDuration === 0 ? "bg-neon-purple/20 text-neon-purple border-neon-purple/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : !selectedFacility ? "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed" : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"}`}>
                        Open
                      </button>
                      <button onClick={() => setSelectedDuration('custom')} disabled={!selectedFacility || isRoomActive}
                        className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${selectedDuration === 'custom' ? "bg-neon-blue/20 text-neon-blue border-neon-blue/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : !selectedFacility ? "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed" : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"}`}>
                        Custom
                      </button>
                    </div>

                    {/* Custom duration inputs */}
                    {selectedDuration === 'custom' && (
                      <div className="flex items-center gap-2 p-3 bg-neon-blue/5 border border-neon-blue/20 rounded-lg">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex-shrink-0">Durasi:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="23" value={customHours}
                            onChange={e => setCustomHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                            className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white text-center outline-none font-mono focus:border-neon-blue/50"
                          />
                          <span className="text-xs text-slate-500 font-bold">jam</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="59" step="5" value={customMinutes}
                            onChange={e => setCustomMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                            className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white text-center outline-none font-mono focus:border-neon-blue/50"
                          />
                          <span className="text-xs text-slate-500 font-bold">menit</span>
                        </div>
                        {maxDurationMinutes > 0 && (
                          <span className="ml-auto text-[11px] font-bold text-neon-blue">
                            = {maxDurationMinutes} mnt
                          </span>
                        )}
                        {maxDurationMinutes === 0 && (
                          <span className="ml-auto text-[11px] text-red-400">Minimal 1 menit</span>
                        )}
                      </div>
                    )}

                    {/* Use all deposit */}
                    {availableDeposit > 0 && (
                      <button onClick={() => setSelectedDuration('MAX')} disabled={!selectedFacility || isRoomActive}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${selectedDuration === 'MAX' ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-slate-900 text-amber-500/70 border-slate-800 hover:border-amber-500/50 hover:text-amber-400"}`}>
                        HABISKAN DEPOSIT ({availableDeposit} MENIT)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Deposit usage & Pricing breakdown */}
              {selectedRoom && selectedDuration !== null && !isRoomActive && (
                <div className="space-y-3">
                  {/* Open session: show "bayar saat selesai" info */}
                  {isOpenSession ? (
                    <div className="p-3 bg-neon-blue/5 border border-neon-blue/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-neon-blue uppercase tracking-wider">Open Session</span>
                        <span className="text-[10px] text-slate-500">— bayar saat selesai</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Tarif</span>
                        <span className="font-bold text-white">Rp {selectedRoom.price_per_hour.toLocaleString("id-ID")}<span className="text-xs font-normal text-slate-400">/jam</span></span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                        Timer mulai dari 0. Harga dihitung dari waktu aktual saat checkout (per menit). Deposit tidak bisa digunakan untuk sesi Open.
                      </p>
                    </div>
                  ) : (
                    <>
                      {availableDeposit > 0 && customerWa.length >= 10 && (
                        <div className="p-3 bg-neon-purple/10 border border-neon-purple/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-neon-purple uppercase tracking-wider">Pakai Deposit</label>
                            <span className="text-xs font-mono text-neon-purple font-bold">{useDepositMinutes} / {Math.min(availableDeposit, maxDurationMinutes)} mnt</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={Math.min(availableDeposit, maxDurationMinutes)}
                            step="1"
                            value={useDepositMinutes}
                            onChange={(e) => setUseDepositMinutes(parseInt(e.target.value))}
                            disabled={selectedDuration === 'MAX'}
                            className="w-full accent-neon-purple disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* Bonus-jam promo banner */}
                      {bonusPromo && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <span className="text-emerald-400 text-lg">🎁</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{bonusPromo.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Bayar {bonusPromo.buy_hours} jam · dapat {bonusPromo.buy_hours + bonusPromo.free_hours} jam total
                            </p>
                          </div>
                          <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black">
                            +{bonusPromo.free_hours} JAM GRATIS
                          </span>
                        </div>
                      )}

                      <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-1.5">
                        {useDepositMinutes > 0 && (
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Sisa Bayar Cash ({remainingMinutesToPay / 60} jam)</span>
                          </div>
                        )}
                        {bonusPromo && (
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Durasi sesi</span>
                            <span className="font-semibold text-emerald-400">{bonusPromo.buy_hours + bonusPromo.free_hours} jam ({totalDurationMinutes} menit)</span>
                          </div>
                        )}
                        {activePromo && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Harga Normal</span>
                            <span className="line-through text-slate-500">Rp {basePaidAmount.toLocaleString("id-ID")}</span>
                          </div>
                        )}
                        {activePromo && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider">
                              🎉 {activePromo.label} —{" "}
                              {activePromo.discount_type === "percentage"
                                ? `-${activePromo.discount_value}%`
                                : `-Rp ${activePromo.discount_value.toLocaleString("id-ID")}`}
                            </span>
                            <span className="text-amber-400 font-semibold">
                              {activePromo.discount_type === "percentage"
                                ? `-Rp ${(basePaidAmount - paidAmount).toLocaleString("id-ID")}`
                                : `-Rp ${activePromo.discount_value.toLocaleString("id-ID")}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-700/50">
                          <span className="text-slate-400">Total Harga</span>
                          <span className={`font-bold text-lg ${activePromo ? "text-amber-400" : "text-white"}`}>
                            Rp {paidAmount.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Metode Bayar</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(["Cash", "QRIS"] as const).map(m => (
                    <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                      className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                        paymentMethod === m
                          ? "bg-neon-purple/20 text-neon-purple border-neon-purple/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
                {!isOpenSession && (
                  <div className="grid grid-cols-3 gap-2">
                    {(["Cash+Cash", "Cash+QRIS", "QRIS+QRIS"] as const).map(m => (
                      <button key={m} type="button"
                        onClick={() => { setPaymentMethod(m); setSplitAmount1(Math.floor(paidAmount / 2)); }}
                        className={`py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          paymentMethod === m
                            ? "bg-neon-blue/20 text-neon-blue border-neon-blue/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {isSplitMethod && !isOpenSession && (
                  <div className="mt-2 p-3 bg-neon-blue/5 border border-neon-blue/20 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold w-20">{paymentMethod.split("+")[0]}</span>
                      <input
                        type="number" min="0" max={paidAmount} step="1000"
                        value={splitAmount1}
                        onChange={e => setSplitAmount1(Math.max(0, Math.min(paidAmount, parseInt(e.target.value) || 0)))}
                        className="w-36 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white text-right outline-none font-mono focus:border-neon-blue/50"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold w-20">{paymentMethod.split("+")[1]}</span>
                      <span className="text-sm font-mono font-bold text-slate-300">
                        Rp {splitAmount2.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {splitAmount2 < 0 && (
                      <p className="text-[10px] text-red-400">Jumlah melebihi total</p>
                    )}
                  </div>
                )}
              </div>

              {submitError && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"><span className="text-red-400"><SvgWarn /></span><span className="text-xs text-red-400 font-medium">{submitError}</span></div>}
              {submitSuccess && <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"><span className="text-emerald-400"><SvgCheck /></span><span className="text-xs text-emerald-400 font-medium">{submitSuccess}</span></div>}
              
              <button
                onClick={handleSubmit}
                disabled={!customerName || !selectedFacility || selectedDuration === null || (!isOpenSession && maxDurationMinutes === 0) || isRoomActive || submitLoading}
                className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                  !customerName || !selectedFacility || selectedDuration === null || (!isOpenSession && maxDurationMinutes === 0) || isRoomActive || submitLoading
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {submitLoading ? <><SvgLoader /> Memproses...</> : isOpenSession ? "Mulai Sesi Open" : "START SESSION"}
              </button>
            </div>
          </div>
        </div>

        {/* LIVE MONITOR */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2"><div className="p-1.5 bg-emerald-500/20 rounded-lg"><SvgMonitor /></div><h2 className="text-base font-bold text-white">Live Monitor Ruangan</h2></div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Real-time</span>
            </div>
            {facilitiesLoading ? (
              <div className="flex items-center justify-center py-12"><SvgLoader /><span className="text-sm text-slate-400 ml-2">Memuat fasilitas...</span></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedFacilities.map(facility => (
                  <RoomCard key={facility.id} facility={facility}
                    activeBooking={getActiveBooking(bookings as BookingWithDetails[], facility.id)}
                    nextBooking={getNextScheduledBooking(bookings as BookingWithDetails[], facility.id)}
                    now={now} onQuickBook={handleQuickBook} onEndSession={handleEndSession}
                    onStartEarly={handleStartEarly} onStartNext={handleStartNext}
                    onAddMenu={handleOpenAddMenu} actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {addMenuTarget && (
      <AddMenuModal
        bookingId={addMenuTarget.bookingId}
        facilityName={addMenuTarget.facilityName}
        menuItems={menuItems}
        onClose={() => setAddMenuTarget(null)}
      />
    )}
    </>
  );
}
