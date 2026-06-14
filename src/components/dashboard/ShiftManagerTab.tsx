"use client";

import { useState, useEffect, useCallback } from "react";

interface OpenShift {
  id: string;
  opened_at: string;
  cashier: { full_name: string } | null;
}

function duration(openedAt: string) {
  const ms = Date.now() - new Date(openedAt).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Props {
  branchId: string | null;
}

export default function ShiftManagerTab({ branchId }: Props) {
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    fetch(`/api/shifts?branch_id=${branchId}&status=open`)
      .then((r) => r.json())
      .then(({ shifts }) => {
        setOpenShifts(shifts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  async function handleForceClose() {
    if (!confirmId) return;
    setClosing(true);
    setCloseError(null);
    const res = await fetch(`/api/shifts/${confirmId}/force-close`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || null }),
    });
    if (res.ok) {
      setConfirmId(null);
      setNotes("");
      load();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Terjadi kesalahan." }));
      setCloseError(error ?? "Gagal menutup shift.");
    }
    setClosing(false);
  }

  if (!branchId) {
    return <p className="text-slate-500 text-sm py-8 text-center">Pilih cabang terlebih dahulu.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Shift Aktif</h3>
          <p className="text-xs text-slate-500 mt-0.5">Shift kasir yang sedang berjalan di cabang ini. Owner dapat force-close jika kasir lupa menutup shift.</p>
        </div>
        <button onClick={load} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:border-slate-500 transition-all">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : openShifts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm border border-slate-800 rounded-xl bg-slate-900/30">
          Tidak ada shift yang sedang aktif.
        </div>
      ) : (
        <div className="space-y-3">
          {openShifts.map((shift) => (
            <div key={shift.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    AKTIF
                  </span>
                  <span className="text-sm font-bold text-white">{shift.cashier?.full_name ?? "—"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Mulai: {fmtDateTime(shift.opened_at)}
                  <span className="ml-2 text-amber-400/70">({duration(shift.opened_at)})</span>
                </p>
              </div>
              <button
                onClick={() => { setConfirmId(shift.id); setNotes(""); setCloseError(null); }}
                className="shrink-0 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all"
              >
                Force Close
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmId(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-1">Force Close Shift?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Shift akan ditutup paksa. Kasir akan melihat layar Mulai Shift saat membuka dashboard.
            </p>

            <label className="block mb-1 text-xs font-semibold text-slate-400">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alasan force close..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-red-500/50 resize-none mb-4"
            />

            {closeError && <p className="text-xs text-red-400 mb-3">{closeError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleForceClose}
                disabled={closing}
                className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                {closing ? "Menutup..." : "Ya, Force Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
