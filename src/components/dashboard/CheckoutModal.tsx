"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────

interface OrderItemRow {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CheckoutBookingInfo {
  roomName: string;
  customerName: string;
  base_amount: number;
  startTime: number;
  endTime: number;
  isOpenSession?: boolean;
  pricePerHour?: number;
}

interface Props {
  isOpen: boolean;
  bookingId: string | null;
  bookingInfo: CheckoutBookingInfo | null;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

type PaymentMethod = "CASH" | "QRIS_STATIC";

// ── Helpers ──────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function fmtDuration(startMs: number, endMs: number) {
  const mins = Math.max(0, Math.round((endMs - startMs) / 60_000));
  if (mins < 60) return `${mins} menit`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} mnt`;
}

// ── SVG Icons ────────────────────────────────────────────────

const SvgClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SvgLoader = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const SvgCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const SvgAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 mt-0.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ── Component ────────────────────────────────────────────────

export default function CheckoutModal({ isOpen, bookingId, bookingInfo, onClose, onSuccess }: Props) {
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  // true by default: modal always shows a loading state until the first fetch resolves
  const [loadingItems, setLoadingItems] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);

  // Fetch accepted F&B items for this booking
  useEffect(() => {
    if (!isOpen || !bookingId) return;
    const supabase = createClient();
    supabase
      .from("order_items")
      .select("id, item_name, quantity, unit_price, subtotal")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setOrderItems((data as OrderItemRow[]) ?? []);
        setLoadingItems(false);
      });
    // Reset to loading=true so the next booking open starts clean
    return () => { setOrderItems([]); setLoadingItems(true); };
  }, [isOpen, bookingId]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen || !bookingId || !bookingInfo) return null;

  const isOpenSession = bookingInfo.isOpenSession ?? false;
  const nowMs = Date.now();

  // For open sessions: estimate actual amount from elapsed time × price/hour
  const elapsedMinutes = isOpenSession
    ? Math.ceil((nowMs - bookingInfo.startTime) / 60_000)
    : 0;
  const estimatedRoomAmount = isOpenSession && bookingInfo.pricePerHour
    ? Math.round((elapsedMinutes / 60) * bookingInfo.pricePerHour)
    : bookingInfo.base_amount;

  const fbTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const grandTotal = estimatedRoomAmount + fbTotal;

  // Subtitle: open sessions show elapsed time, fixed sessions show pre-paid duration
  const actualDuration = isOpenSession
    ? fmtDuration(bookingInfo.startTime, nowMs)
    : fmtDuration(bookingInfo.startTime, bookingInfo.endTime);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/end-session`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: paymentMethod }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Gagal memproses checkout");
        return;
      }
      onSuccess(bookingId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!submitting ? onClose : undefined}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
            <div>
              <h2 className="text-base font-bold text-white">Checkout &amp; Pembayaran</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {bookingInfo.roomName} · {bookingInfo.customerName} · {actualDuration}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
            >
              <SvgClose />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Bill Breakdown */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1">Rincian Tagihan</p>

              {/* Base rental */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm text-slate-300">Sewa ruangan</span>
                  {isOpenSession && (
                    <p className="text-[10px] text-neon-blue mt-0.5">
                      Open · {elapsedMinutes} mnt · dihitung saat konfirmasi
                    </p>
                  )}
                </div>
                <span className="text-sm font-mono font-semibold text-white flex-shrink-0">
                  {isOpenSession ? `~${fmt(estimatedRoomAmount)}` : fmt(bookingInfo.base_amount)}
                </span>
              </div>

              {/* F&B items */}
              {loadingItems ? (
                <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                  <SvgLoader /> Memuat tagihan F&amp;B...
                </div>
              ) : orderItems.length > 0 ? (
                <>
                  <div className="border-t border-slate-800/80 pt-2 space-y-1.5">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{item.item_name} <span className="text-slate-600">×{item.quantity}</span></span>
                        <span className="font-mono text-slate-300">{fmt(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-600 italic py-1">Tidak ada pesanan F&amp;B</p>
              )}

              {/* Grand Total */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-2xl font-mono font-extrabold text-neon-purple drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                  {fmt(grandTotal)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metode Pembayaran</p>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["CASH", "Tunai", "💵", "Pembayaran fisik ke kasir"],
                    ["QRIS_STATIC", "QRIS Statis", "📱", "Transfer via QR code statis"],
                  ] as const
                ).map(([value, label, icon, desc]) => (
                  <button
                    key={value}
                    onClick={() => setPaymentMethod(value)}
                    className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl border text-center transition-all ${
                      paymentMethod === value
                        ? "bg-neon-purple/10 border-neon-purple/50 text-neon-purple shadow-[0_0_18px_rgba(168,85,247,0.15)]"
                        : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {paymentMethod === value && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-neon-purple flex items-center justify-center">
                        <SvgCheck />
                      </span>
                    )}
                    <span className="text-2xl">{icon}</span>
                    <span className="text-sm font-bold">{label}</span>
                    <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                  </button>
                ))}
              </div>

              {/* QRIS Cashier Reminder */}
              {paymentMethod === "QRIS_STATIC" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl"
                >
                  <SvgAlert />
                  <p className="text-xs text-amber-300 leading-relaxed">
                    <span className="font-bold block mb-0.5">Verifikasi Wajib</span>
                    Pastikan pelanggan sudah menunjukkan bukti transfer sukses di HP mereka senilai{" "}
                    <strong className="text-amber-200">{fmt(grandTotal)}</strong> sebelum memproses checkout!
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/50 flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold uppercase tracking-wide hover:bg-slate-800 hover:text-white disabled:opacity-40 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <><SvgLoader /> Memproses...</>
              ) : (
                <><SvgCheck /> Konfirmasi {paymentMethod === "CASH" ? "Tunai" : "QRIS"}</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
