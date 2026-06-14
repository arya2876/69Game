"use client";

import { useState } from "react";

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface Props {
  bookingId: string;
  facilityName: string;
  menuItems: MenuItem[];
  onClose: () => void;
}

const SvgLoader = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function AddMenuModal({ bookingId, facilityName, menuItems, onClose }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fnbItems = menuItems.filter((m) => m.category === "fnb");
  const setQty = (id: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
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
      const itemNames = toAdd
        .map(([id, qty]) => `${menuItems.find((m) => m.id === id)?.name} ×${qty}`)
        .join(", ");
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Tambah F&amp;B</h3>
            <p className="text-xs text-slate-400 mt-0.5">{facilityName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Item list */}
        <div className="p-4 space-y-1 max-h-72 overflow-y-auto">
          {fnbItems.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6 leading-relaxed">
              Belum ada item menu yang tersedia.<br />Tambahkan menu di halaman Pengaturan.
            </p>
          ) : fnbItems.map((item) => {
            const qty = quantities[item.id] ?? 0;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">Rp {item.price.toLocaleString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setQty(item.id, -1)} disabled={qty === 0}
                    className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 transition-all">
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-mono text-white">{qty}</span>
                  <button onClick={() => setQty(item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-neon-purple/20 border border-neon-purple/40 text-neon-purple text-sm font-bold flex items-center justify-center hover:bg-neon-purple/30 transition-all">
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        {success && (
          <div className="mx-4 mb-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">{success}</div>
        )}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>
        )}

        {/* Footer */}
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
