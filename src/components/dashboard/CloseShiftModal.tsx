"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ShiftSummary, Shift } from "@/lib/types/database";

const SvgClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SvgLoader = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const SvgCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function fmt(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

interface CloseShiftModalProps {
  shift: Shift;
  cashierName: string;
  onClose: () => void;
  onConfirm: () => Promise<ShiftSummary>;
}

export default function CloseShiftModal({ shift, cashierName, onClose, onConfirm }: CloseShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const closedAt = done ? new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await onConfirm();
      setSummary(result);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menutup shift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={done ? onClose : undefined}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">{done ? "Shift Ditutup" : "Tutup Shift"}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{cashierName}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors">
              <SvgClose />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Shift time */}
            <div className="bg-slate-800/50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">Mulai</span>
              <span className="font-mono font-bold text-white">{fmtTime(shift.opened_at)}</span>
              <span className="text-slate-600 mx-2">→</span>
              <span className="text-slate-400">Selesai</span>
              <span className="font-mono font-bold text-white">{done ? closedAt : "--:--"}</span>
            </div>

            {done && summary ? (
              <>
                {/* Summary grid */}
                <div className="bg-slate-800/40 rounded-xl divide-y divide-slate-700/50">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-400">Total Sesi</span>
                    <span className="text-sm font-bold text-white">{summary.total_sessions} sesi</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-400">Cash</span>
                    <span className="text-sm font-bold text-white">{fmt(summary.total_cash)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-400">QRIS</span>
                    <span className="text-sm font-bold text-white">{fmt(summary.total_qris)}</span>
                  </div>
                  {summary.total_deposit > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-400">Deposit</span>
                      <span className="text-sm font-bold text-white">{fmt(summary.total_deposit)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-3 bg-neon-purple/5">
                    <span className="text-sm font-bold text-neon-purple">Total Omzet</span>
                    <span className="text-base font-black text-neon-purple">{fmt(summary.total_omzet)}</span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-neon-purple/15 border border-neon-purple/40 text-neon-purple text-sm font-bold flex items-center justify-center gap-2 hover:bg-neon-purple/25 transition-all"
                >
                  <SvgCheck /> Selesai
                </button>
              </>
            ) : (
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <p className="text-sm text-slate-400 text-center">
                  Pastikan semua sesi sudah selesai sebelum menutup shift.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-[2] py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-500/25 disabled:opacity-40 transition-all"
                  >
                    {loading ? <><SvgLoader /> Menutup...</> : "Konfirmasi Tutup Shift"}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
