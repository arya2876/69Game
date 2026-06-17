"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Clock,
  Plus,
  Minus,
  X,
  CheckCircle,
  AlertTriangle,
  Gamepad2,
  ChefHat,
  MessageSquare,
  Send,
  Loader2,
  Bell,
} from "lucide-react";

interface Facility {
  id: string;
  name: string;
  category: string;
  branch_id: string;
  status: string;
  booth_number?: string | null;
  price_per_hour?: number | null;
}

interface Booking {
  id: string;
  end_time: string;
  start_time: string;
  is_open_session: boolean;
  total_amount: number | null;
  base_amount: number | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

interface Props {
  facility: Facility;
  booking: Booking | null;
  menuItems: MenuItem[];
}

// ── Helpers ─────────────────────────────────────────────────

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

// ── Inactive State ───────────────────────────────────────────

function InactiveState({ facilityName }: { facilityName: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 relative">
        <div className="w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto">
          <Gamepad2 className="w-10 h-10 text-slate-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Bilik Non-Aktif</h1>
      <p className="text-slate-400 text-sm mb-1">
        <span className="text-white font-semibold">{facilityName}</span> belum memiliki sesi aktif.
      </p>
      <p className="text-slate-500 text-sm mb-8 max-w-xs leading-relaxed">
        Silakan daftar di kasir terlebih dahulu untuk memulai sesi bermain.
      </p>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 max-w-xs w-full text-left space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cara Mulai Sesi</p>
        {["Temui kasir di meja depan", "Pilih durasi bermain & bayar", "Scan QR ini setelah sesi aktif"].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-slate-300">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live Countdown ────────────────────────────────────────────

function LiveCountdown({
  endTimeIso,
  startTimeIso,
  isOpen,
}: {
  endTimeIso: string;
  startTimeIso: string;
  isOpen: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const startMs = new Date(startTimeIso).getTime();
      const tick = () => setValue(Date.now() - startMs);
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    } else {
      const endMs = new Date(endTimeIso).getTime();
      const tick = () => setValue(Math.max(0, endMs - Date.now()));
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [endTimeIso, startTimeIso, isOpen]);

  const h = Math.floor(value / 3_600_000);
  const m = Math.floor((value % 3_600_000) / 60_000);
  const s = Math.floor((value % 60_000) / 1_000);

  if (isOpen) {
    return (
      <div className="text-center">
        <div className="font-mono text-5xl font-black tracking-[0.15em] tabular-nums text-white drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]">
          {padTwo(h)}:{padTwo(m)}:{padTwo(s)}
        </div>
        <p className="text-xs mt-1.5 font-medium text-neon-blue">Sesi open berjalan</p>
      </div>
    );
  }

  const isLow = value < 10 * 60 * 1000 && value > 0;
  const isDone = value === 0;

  return (
    <div className="text-center">
      <div className={`font-mono text-5xl font-black tracking-[0.15em] tabular-nums transition-colors ${
        isDone ? "text-slate-500" : isLow ? "text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.6)]" : "text-white drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]"
      }`}>
        {padTwo(h)}:{padTwo(m)}:{padTwo(s)}
      </div>
      <p className={`text-xs mt-1.5 font-medium ${isLow ? "text-red-400 animate-pulse" : "text-slate-400"}`}>
        {isDone ? "Sesi telah berakhir" : isLow ? "Sisa waktu hampir habis!" : "Sisa waktu sesimu"}
      </p>
    </div>
  );
}

// ── Menu Item Card ────────────────────────────────────────────

function MenuItemCard({
  item,
  cartItem,
  onAdd,
  onRemove,
}: {
  item: MenuItem;
  cartItem: CartItem | undefined;
  onAdd: (item: MenuItem) => void;
  onRemove: (id: string) => void;
}) {
  const qty = cartItem?.quantity ?? 0;

  return (
    <div className={`relative bg-slate-900/60 backdrop-blur-sm border rounded-2xl p-4 transition-all ${
      qty > 0 ? "border-neon-purple/40 bg-neon-purple/5" : "border-slate-800/80"
    }`}>
      {qty > 0 && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-neon-purple text-white text-[10px] font-bold flex items-center justify-center">
          {qty}
        </div>
      )}
      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
        <ChefHat className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-white leading-tight mb-1">{item.name}</p>
      <p className="text-xs text-neon-purple font-bold mb-3">{formatRupiah(item.price)}</p>

      <div className="flex items-center gap-2">
        {qty > 0 ? (
          <>
            <button
              onClick={() => onRemove(item.id)}
              className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-red-400 hover:border-red-500/40 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-white tabular-nums">{qty}</span>
            <button
              onClick={() => onAdd(item)}
              className="w-8 h-8 rounded-lg bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center text-neon-purple hover:bg-neon-purple/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onAdd(item)}
            className="w-full h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-300 hover:bg-neon-purple/20 hover:text-neon-purple hover:border-neon-purple/40 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah
          </button>
        )}
      </div>
    </div>
  );
}

// ── Cart Drawer ───────────────────────────────────────────────

function CartDrawer({
  cart,
  onQuantityChange,
  onNotesChange,
  onRemove,
  onClose,
  onSubmit,
  submitting,
}: {
  cart: CartItem[];
  onQuantityChange: (id: string, delta: number) => void;
  onNotesChange: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[85vh] flex flex-col">
        {/* Handle + Header */}
        <div className="flex-shrink-0 pt-3 pb-4 px-5 border-b border-slate-800">
          <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Pesananku</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.map((item) => (
            <div key={item.menuItemId} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-neon-purple font-bold mt-0.5">{formatRupiah(item.price * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => onQuantityChange(item.menuItemId, -1)} className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-white tabular-nums">{item.quantity}</span>
                  <button onClick={() => onQuantityChange(item.menuItemId, 1)} className="w-7 h-7 rounded-lg bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center text-neon-purple hover:bg-neon-purple/30 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => onRemove(item.menuItemId)} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/60">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Catatan khusus... (opsional)"
                  value={item.notes}
                  onChange={(e) => onNotesChange(item.menuItemId, e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{cart.reduce((s, i) => s + i.quantity, 0)} item</span>
            <span className="font-bold text-white text-base">{formatRupiah(total)}</span>
          </div>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full h-13 rounded-2xl bg-neon-purple text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.4)]"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Mengirim pesanan...</>
            ) : (
              <><Send className="w-4 h-4" />Pesan Sekarang</>
            )}
          </button>
          <p className="text-[10px] text-slate-600 text-center">Pesananmu akan diterima kasir dan ditambahkan ke tagihan sesimu.</p>
        </div>
      </div>
    </>
  );
}

// ── Success Screen ────────────────────────────────────────────

function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6 animate-[pulse_2s_ease-in-out_infinite]">
        <CheckCircle className="w-12 h-12 text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Pesanan Dikirim!</h1>
      <p className="text-slate-400 text-sm mb-2">Kasir sedang memproses pesananmu.</p>
      <p className="text-slate-500 text-xs mb-10 max-w-xs">
        Pesananmu akan segera muncul di layar kasir. Tunggu sebentar ya!
      </p>
      <button
        onClick={onReset}
        className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white font-semibold text-sm hover:bg-slate-700 transition-all"
      >
        Pesan Lagi
      </button>
    </div>
  );
}

// ── Chat Success Screen ───────────────────────────────────────

function ChatSentScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-neon-blue/15 border border-neon-blue/30 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-neon-blue" />
      </div>
      <p className="text-sm font-bold text-white mb-1">Pesan Terkirim!</p>
      <p className="text-xs text-slate-500 mb-5">Kasir akan segera merespons pesananmu.</p>
      <button
        onClick={onReset}
        className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
      >
        Kirim Lagi
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function CustomerOrderPage({ facility, booking, menuItems }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"menu" | "chat">("menu");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatSent, setChatSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayTotal, setDisplayTotal] = useState<number>(booking?.total_amount ?? 0);
  const [liveTimeCost, setLiveTimeCost] = useState<number>(0);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // For open sessions: calculate live time cost every second
  useEffect(() => {
    if (!booking) return;
    const durationMs = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
    const isOpen = Boolean(booking.is_open_session) || durationMs >= 23 * 60 * 60 * 1000;
    if (!isOpen || !facility.price_per_hour) return;

    const pricePerHour = facility.price_per_hour;
    const startMs = new Date(booking.start_time).getTime();
    const tick = () => {
      const elapsedMs = Date.now() - startMs;
      setLiveTimeCost(Math.round((elapsedMs / 3_600_000) * pricePerHour));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [booking, facility.price_per_hour]);

  // Fetch live F&B total from server every 30s
  useEffect(() => {
    if (!booking) return;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}/total`);
        if (res.ok) {
          const data = await res.json();
          setDisplayTotal(data.total_amount ?? 0);
        }
      } catch {}
    };
    refreshIntervalRef.current = setInterval(refresh, 30_000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [booking]);

  // useCallback must be unconditional — declared before any early return
  const handleSubmit = useCallback(async () => {
    if (cart.length === 0 || submitting || !booking) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/order-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facility.id,
          items: cart.map((c) => ({ menu_item_id: c.menuItemId, quantity: c.quantity, notes: c.notes })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Gagal mengirim pesanan");
        return;
      }
      setSubmitted(true);
      setCartOpen(false);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }, [cart, facility.id, submitting, booking]);

  const handleChatSubmit = useCallback(async () => {
    const msg = chatMsg.trim();
    if (!msg || chatSubmitting || !booking) return;
    setChatSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/order-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: facility.id, message: msg }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Gagal mengirim pesan");
        return;
      }
      setChatMsg("");
      setChatSent(true);
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setChatSubmitting(false);
    }
  }, [chatMsg, chatSubmitting, facility.id, booking]);

  const handleAdd = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, notes: "" }];
    });
  };

  const handleRemove = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === id);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((c) => c.menuItemId !== id);
      return prev.map((c) => c.menuItemId === id ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === id);
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter((c) => c.menuItemId !== id);
      return prev.map((c) => c.menuItemId === id ? { ...c, quantity: newQty } : c);
    });
  };

  const handleNotesChange = (id: string, notes: string) => {
    setCart((prev) => prev.map((c) => c.menuItemId === id ? { ...c, notes } : c));
  };

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // Conditional renders after all hooks
  if (!booking) return <InactiveState facilityName={facility.name} />;
  if (submitted) return <SuccessScreen onReset={() => { setSubmitted(false); setCart([]); }} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-transparent to-neon-blue/10" />
        <div className="relative px-5 pt-10 pb-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-[10px] font-bold uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
            Sesi Aktif
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{facility.name}</h1>
          {facility.booth_number && (
            <p className="text-sm font-bold text-neon-purple mb-1">{facility.booth_number}</p>
          )}
          <p className="text-xs text-slate-500 mb-6 uppercase tracking-wider font-semibold">{facility.category}</p>

          {/* Total Pengeluaran */}
          {(() => {
            const durationMs = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
            const isOpenSession = Boolean(booking.is_open_session) || durationMs >= 23 * 60 * 60 * 1000;
            const total = isOpenSession ? liveTimeCost + displayTotal : displayTotal;
            return (
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-slate-900/60 border border-white/10 rounded-xl px-5 py-3 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Total Tagihan</p>
                  <p className="text-lg font-black text-white tabular-nums">
                    {isOpenSession && <span className="text-slate-400 font-normal mr-0.5">~</span>}
                    {formatRupiah(total)}
                  </p>
                  {isOpenSession && displayTotal > 0 && (
                    <p className="text-[10px] text-slate-600 mt-0.5">termasuk F&B {formatRupiah(displayTotal)}</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Countdown — open session detected by flag OR 24h sentinel */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl py-6 px-8 inline-block">
            {(() => {
              const durationMs = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
              const isOpen = Boolean(booking.is_open_session) || durationMs >= 23 * 60 * 60 * 1000;
              return (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {isOpen ? "Waktu Berjalan" : "Sisa Waktu"}
                    </span>
                  </div>
                  <LiveCountdown
                    endTimeIso={booking.end_time}
                    startTimeIso={booking.start_time}
                    isOpen={isOpen}
                  />
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="px-5 mb-5">
        <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "menu"
                ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Pesan Menu
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "chat"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bell className="w-4 h-4" />
            Hubungi Kasir
          </button>
        </div>
      </div>

      {/* Menu Tab */}
      {activeTab === "menu" && (
        <div className="px-5 pb-32">
          <div className="flex items-center gap-2 mb-4">
            <ChefHat className="w-4 h-4 text-neon-purple" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Menu F&B</h2>
            <span className="text-xs text-slate-500">({menuItems.length} item tersedia)</span>
          </div>

          {menuItems.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center">
              <ChefHat className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Belum ada menu F&B tersedia</p>
              <p className="text-xs text-slate-600 mt-1">Gunakan tab <span className="text-neon-blue">Hubungi Kasir</span> untuk menghubungi staf</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {menuItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  cartItem={cart.find((c) => c.menuItemId === item.id)}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="px-5 pb-12">
          <div className="bg-slate-900/60 backdrop-blur-md border border-neon-blue/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-neon-blue" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Hubungi Kasir</p>
                <p className="text-[11px] text-slate-500">Butuh bantuan? Kirim pesan ke kasir kami</p>
              </div>
            </div>

            <div className="p-5">
              {chatSent ? (
                <ChatSentScreen onReset={() => setChatSent(false)} />
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {["Minta tolong bawakan minum", "Ada masalah dengan controller", "Perlu tambahan waktu", "Butuh bantuan teknis"].map((quick) => (
                      <button
                        key={quick}
                        onClick={() => setChatMsg(quick)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                          chatMsg === quick
                            ? "border-neon-blue/50 bg-neon-blue/10 text-neon-blue"
                            : "border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                        }`}
                      >
                        {quick}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-3 mb-4">
                    <MessageSquare className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <textarea
                      value={chatMsg}
                      onChange={(e) => setChatMsg(e.target.value)}
                      placeholder="Atau tulis pesan lain..."
                      rows={3}
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleChatSubmit}
                    disabled={!chatMsg.trim() || chatSubmitting}
                    className="w-full h-12 rounded-2xl bg-neon-blue/20 border border-neon-blue/30 text-neon-blue font-bold text-sm flex items-center justify-center gap-2 hover:bg-neon-blue/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {chatSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</>
                    ) : (
                      <><Send className="w-4 h-4" />Kirim ke Kasir</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-500/20 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Cart Button (menu tab only) */}
      {activeTab === "menu" && totalItems > 0 && !cartOpen && (
        <div className="fixed bottom-6 left-5 right-5 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-14 rounded-2xl bg-neon-purple flex items-center justify-between px-5 shadow-[0_0_24px_rgba(168,85,247,0.5)] hover:bg-purple-500 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-white" />
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-white text-neon-purple text-[9px] font-black flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <span className="text-sm font-bold text-white">Lihat Pesananku</span>
            </div>
            <span className="text-sm font-bold text-white">{formatRupiah(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onQuantityChange={handleQuantityChange}
          onNotesChange={handleNotesChange}
          onRemove={(id) => setCart((prev) => prev.filter((c) => c.menuItemId !== id))}
          onClose={() => setCartOpen(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
