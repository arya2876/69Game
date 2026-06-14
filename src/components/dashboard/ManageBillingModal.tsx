"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── RAW SVG ICONS ───────────────────────────────────────────
const SvgClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SvgPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SvgTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const SvgPrinter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const SvgFood = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SvgReceipt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ── TYPES ───────────────────────────────────────────────────
interface BillItem {
  id: string;
  name: string;
  price: number;
}

interface ManageBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingInfo: {
    id: string;
    roomName: string;
    customerName: string;
    baseRentCost: number;
    baseRentDuration: number; // minutes
    endTime: number; // unix ms
  } | null;
}

// ── COMPONENT ───────────────────────────────────────────────
export default function ManageBillingModal({ isOpen, onClose, bookingInfo }: ManageBillingModalProps) {
  const [items, setItems] = useState<BillItem[]>([]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [now, setNow] = useState(Date.now());

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Start clock for live countdown
      const timer = setInterval(() => setNow(Date.now()), 1000);
      return () => {
        document.body.style.overflow = "unset";
        clearInterval(timer);
      };
    }
  }, [isOpen]);

  if (!isOpen || !bookingInfo) return null;

  // Countdown Calculation
  const remainingMs = Math.max(0, bookingInfo.endTime - now);
  const h = Math.floor(remainingMs / 3600000);
  const m = Math.floor((remainingMs % 3600000) / 60000);
  const s = Math.floor((remainingMs % 60000) / 1000);
  const countdownStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // Totals
  const additionalTotal = items.reduce((acc, curr) => acc + curr.price, 0);

  const handleQuickAdd = (name: string, price: number) => {
    setItems((prev) => [...prev, { id: Date.now().toString() + Math.random(), name, price }]);
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice) return;
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), name: customName, price: parseInt(customPrice) },
    ]);
    setCustomName("");
    setCustomPrice("");
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePrint = () => {
    alert(`Mencetak nota untuk ${bookingInfo.customerName}...\nTotal Tagihan F&B: Rp ${additionalTotal.toLocaleString('id-ID')}`);
    onClose();
    setItems([]); // reset
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-neon-purple/20 text-neon-purple rounded-xl border border-neon-purple/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <SvgReceipt />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Kelola Tagihan & Open Tab</h2>
                <p className="text-xs text-slate-400 font-medium">Tambah pesanan ke sesi berjalan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <SvgClose />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 scrollbar-hide">
            
            {/* Section A: Session Summary */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-200">{bookingInfo.roomName}</h3>
                <p className="text-sm font-semibold text-neon-blue mt-0.5">{bookingInfo.customerName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-400">Sewa Utama ({bookingInfo.baseRentDuration} Menit) - Rp {bookingInfo.baseRentCost.toLocaleString('id-ID')}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">Lunas</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg shrink-0">
                <span className="text-slate-400"><SvgClock /></span>
                <span className="font-mono text-sm font-bold text-white tracking-widest">{countdownStr}</span>
              </div>
            </div>

            {/* Section B: Manual Item Input Form */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <SvgFood /> Tambah Item Baru
              </h4>
              
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleQuickAdd("Indomie Goreng Telur", 12000)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                  🍜 Indomie - Rp 12k
                </button>
                <button onClick={() => handleQuickAdd("Es Teh Manis", 5000)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                  🧃 Es Teh - Rp 5k
                </button>
                <button onClick={() => handleQuickAdd("Nasi Goreng Spesial", 20000)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                  🍛 Nasi Goreng - Rp 20k
                </button>
                <button onClick={() => handleQuickAdd("Tambah Waktu (1 Jam)", 15000)} className="px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/30 rounded-lg text-xs font-semibold text-neon-purple hover:bg-neon-purple/20 transition-colors">
                  🕹️ Tambah 1 Jam - Rp 15k
                </button>
              </div>

              {/* Custom Input */}
              <form onSubmit={handleCustomAdd} className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Nama Item Kustom..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 outline-none transition-all"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">Rp</span>
                  <input
                    type="number"
                    placeholder="Harga"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customName.trim() || !customPrice}
                  className="w-10 h-10 shrink-0 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg flex items-center justify-center hover:bg-neon-blue/20 hover:text-neon-blue hover:border-neon-blue/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <SvgPlus />
                </button>
              </form>
            </div>

            {/* Section C: Live Bill Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                Daftar Open Tab (Belum Lunas)
              </h4>
              
              <div className="min-h-[120px]">
                <AnimatePresence initial={false}>
                  {items.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <SvgReceipt />
                      <p className="text-xs mt-2">Belum ada tambahan tagihan.</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg group hover:bg-slate-800/80 transition-colors"
                        >
                          <span className="text-sm text-slate-200 font-medium">{item.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-mono font-bold text-white">Rp {item.price.toLocaleString('id-ID')}</span>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-all"
                            >
                              <SvgTrash />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Grand Total */}
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 mt-4 flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                <span className="text-sm font-bold text-amber-500/80 uppercase tracking-widest">Sisa Tagihan Belum Dibayar</span>
                <span className="text-xl font-mono font-extrabold text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                  Rp {additionalTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

          </div>

          {/* Section D: Action Footer */}
          <div className="p-5 border-t border-slate-700/50 bg-slate-950/50 flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-all"
            >
              Simpan & Tutup
            </button>
            <button
              onClick={handlePrint}
              disabled={items.length === 0}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
            >
              <SvgPrinter />
              Selesaikan & Cetak Nota
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
