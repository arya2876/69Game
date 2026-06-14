"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────

interface BookingDetail {
  id: string;
  base_amount: number;
  total_amount: number;
  payment_method: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
  member: { full_name: string } | null;
  facility: { name: string; category: string } | null;
}

interface OrderItemDetail {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Props {
  isOpen: boolean;
  bookingId: string | null;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function fmtDt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(startIso: string, endIso: string) {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (mins < 60) return `${mins} menit`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

// ── Print Receipt ────────────────────────────────────────────

function printReceipt(booking: BookingDetail, items: OrderItemDetail[], grandTotal: number) {
  const w = window.open("", "_blank");
  if (!w) { alert("Izinkan popup untuk mencetak struk."); return; }

  const facilityName = booking.facility?.name ?? "Unknown";
  const customerName = booking.member?.full_name ?? "Walk-in Guest";
  const duration = fmtDuration(booking.start_time, booking.end_time);
  const bookingId = booking.id.slice(0, 8).toUpperCase();

  const itemRows = items.map(i => `
    <tr>
      <td>${i.item_name}</td>
      <td style="text-align:center">${i.quantity}×</td>
      <td style="text-align:right">${fmt(i.unit_price)}</td>
      <td style="text-align:right">${fmt(i.subtotal)}</td>
    </tr>`).join("");

  w.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Struk 69Game #${bookingId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', monospace; }
    body { max-width: 320px; margin: 0 auto; padding: 20px 10px; font-size: 12px; color: #111; }
    .center { text-align: center; }
    .brand { font-size: 22px; font-weight: 900; letter-spacing: 2px; margin-bottom: 2px; }
    .sub { font-size: 10px; color: #555; margin-bottom: 12px; }
    .divider { border-top: 1px dashed #aaa; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .row-label { color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 0; border-bottom: 1px solid #ddd; }
    td { padding: 4px 0; vertical-align: top; }
    .total-row { font-size: 14px; font-weight: 900; }
    .method { display: inline-block; border: 1px solid #000; padding: 2px 8px; border-radius: 3px; font-weight: 700; font-size: 11px; margin-top: 4px; }
    .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: center; }
    @media print { button { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">69GAME</div>
    <div class="sub">Gaming Lounge Semarang</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="row-label">No. Struk</span><span><b>#${bookingId}</b></span></div>
  <div class="row"><span class="row-label">Tanggal</span><span>${fmtDt(booking.created_at)}</span></div>
  <div class="row"><span class="row-label">Pelanggan</span><span>${customerName}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="row-label">Fasilitas</span><span>${facilityName}</span></div>
  <div class="row"><span class="row-label">Durasi</span><span>${duration}</span></div>
  <div class="row"><span class="row-label">Mulai</span><span>${fmtDt(booking.start_time)}</span></div>
  <div class="row"><span class="row-label">Selesai</span><span>${fmtDt(booking.end_time)}</span></div>
  <div class="divider"></div>
  <table>
    <thead><tr>
      <th style="text-align:left">Item</th>
      <th style="text-align:center">Qty</th>
      <th style="text-align:right">Harga</th>
      <th style="text-align:right">Subtotal</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>Sewa ${facilityName}</td>
        <td style="text-align:center">1×</td>
        <td style="text-align:right">${fmt(booking.base_amount)}</td>
        <td style="text-align:right">${fmt(booking.base_amount)}</td>
      </tr>
      ${itemRows}
    </tbody>
  </table>
  <div class="divider"></div>
  <div class="row total-row"><span>TOTAL</span><span>${fmt(grandTotal)}</span></div>
  ${booking.payment_method ? `<div class="center"><span class="method">${booking.payment_method}</span></div>` : ""}
  <div class="divider"></div>
  <div class="footer">
    Terima kasih telah bermain di 69Game!<br>
    Sampai jumpa lagi 🎮
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
  w.document.close();
}

// ── Main Modal ───────────────────────────────────────────────

export default function BookingReceiptModal({ isOpen, bookingId, onClose }: Props) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !bookingId) { setTimeout(() => { setBooking(null); setItems([]); }, 0); return; }
    setTimeout(() => setLoading(true), 0);

    (async () => {
      const [{ data: b }, { data: oi }] = await Promise.all([
        supabase
          .from("bookings")
          .select(`
            id, base_amount, total_amount, payment_method, start_time, end_time, created_at,
            member:profiles!bookings_member_id_fkey(full_name),
            facility:facilities!bookings_facility_id_fkey(name, category)
          `)
          .eq("id", bookingId)
          .single(),
        supabase
          .from("order_items")
          .select("id, item_name, category, quantity, unit_price, subtotal")
          .eq("booking_id", bookingId)
          .order("created_at"),
      ]);

      setBooking(b as unknown as BookingDetail);
      setItems((oi ?? []) as OrderItemDetail[]);
      setLoading(false);
    })();
  }, [isOpen, bookingId]); // eslint-disable-line

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  // The RPC inserts an order_item for the room rental (starts with "Sewa") in addition to
  // setting base_amount — exclude those to avoid double-counting in the receipt display.
  const extraItems = items.filter((i) => !i.item_name.startsWith("Sewa "));
  const grandTotal = booking
    ? booking.base_amount + extraItems.reduce((s, i) => s + i.subtotal, 0)
    : 0;

  const facilityName = booking?.facility?.name ?? "Unknown";
  const customerName = booking?.member?.full_name ?? "Walk-in Guest";
  const duration = booking ? fmtDuration(booking.start_time, booking.end_time) : "";
  const bookingShortId = booking?.id.slice(0, 8).toUpperCase() ?? "";

  const paymentColor: Record<string, string> = {
    QRIS: "bg-neon-blue/15 text-neon-blue border-neon-blue/30",
    Cash: "bg-slate-800 text-slate-300 border-slate-600",
    Transfer: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Struk Pembayaran</h2>
                {bookingShortId && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">#{bookingShortId}</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Memuat data...</p>
                </div>
              ) : !booking ? (
                <p className="text-center text-sm text-slate-500 py-10">Data tidak ditemukan.</p>
              ) : (
                <>
                  {/* Customer & Facility Info */}
                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-white">{facilityName}</p>
                        <p className="text-sm text-neon-purple font-semibold mt-0.5">{customerName}</p>
                      </div>
                      {booking.payment_method && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${paymentColor[booking.payment_method] ?? "bg-slate-800 text-slate-300 border-slate-600"}`}>
                          {booking.payment_method}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-slate-700/60 text-xs">
                      <div className="text-slate-500">Durasi</div>
                      <div className="text-slate-200 font-semibold text-right">{duration}</div>
                      <div className="text-slate-500">Mulai</div>
                      <div className="text-slate-200 text-right">{fmtDt(booking.start_time)}</div>
                      <div className="text-slate-500">Selesai</div>
                      <div className="text-slate-200 text-right">{fmtDt(booking.end_time)}</div>
                    </div>
                  </div>

                  {/* Bill Breakdown */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Rincian Tagihan</p>

                    {/* Rental base */}
                    <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
                      <div>
                        <p className="text-sm text-white">Sewa {facilityName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{duration}</p>
                      </div>
                      <span className="text-sm font-semibold text-white font-mono">{fmt(booking.base_amount)}</span>
                    </div>

                    {/* Order items (F&B / extra time — room rental excluded, covered by base_amount) */}
                    {extraItems.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-2 pb-1">Tambahan F&B / Extra</p>
                        {extraItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                {item.quantity}×
                              </span>
                              <p className="text-sm text-slate-200">{item.item_name}</p>
                            </div>
                            <span className="text-sm font-mono text-slate-300">{fmt(item.subtotal)}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Grand Total */}
                    <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Total</span>
                      <span className="text-xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]">{fmt(grandTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!loading && booking && (
              <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => printReceipt(booking, extraItems, grandTotal)}
                  className="flex-[2] py-2.5 rounded-xl bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-sm font-bold flex items-center justify-center gap-2 hover:bg-neon-purple/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Cetak Struk
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
