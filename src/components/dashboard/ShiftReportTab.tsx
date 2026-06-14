"use client";

import { useState, useEffect } from "react";

interface ShiftRow {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: "open" | "closed";
  cashier: { full_name: string } | null;
  summary: {
    total_sessions: number;
    total_cash: number;
    total_qris: number;
    total_deposit: number;
    total_omzet: number;
  };
}

function fmt(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function duration(openedAt: string, closedAt: string | null) {
  const end = closedAt ? new Date(closedAt) : new Date();
  const ms = end.getTime() - new Date(openedAt).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

interface Props {
  branchId: string | null;
  dateFrom: string;
  dateTo: string;
}

export default function ShiftReportTab({ branchId, dateFrom, dateTo }: Props) {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    fetch(`/api/shifts?branch_id=${branchId}&date_from=${dateFrom}T00:00:00&date_to=${dateTo}T23:59:59`)
      .then((r) => r.json())
      .then(({ shifts }) => { setShifts(shifts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [branchId, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 text-sm">
        Tidak ada shift dalam periode ini.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <div
          key={shift.id}
          className={`rounded-xl border p-4 ${shift.status === "open" ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800 bg-slate-900/50"}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: kasir + time */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${shift.status === "open" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${shift.status === "open" ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
                  {shift.status === "open" ? "AKTIF" : "SELESAI"}
                </span>
                <span className="text-sm font-bold text-white">{shift.cashier?.full_name ?? "—"}</span>
              </div>
              <p className="text-xs text-slate-500">
                {fmtDateTime(shift.opened_at)}
                {" → "}
                {shift.closed_at ? fmtDateTime(shift.closed_at) : <span className="text-amber-400">Masih berjalan</span>}
                <span className="ml-2 text-slate-600">({duration(shift.opened_at, shift.closed_at)})</span>
              </p>
            </div>

            {/* Right: summary pills */}
            <div className="flex flex-wrap gap-3 text-right">
              <div>
                <p className="text-[10px] text-slate-500">Sesi</p>
                <p className="text-sm font-bold text-white">{shift.summary.total_sessions}</p>
              </div>
              {shift.summary.total_cash > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500">Cash</p>
                  <p className="text-sm font-bold text-emerald-400">{fmt(shift.summary.total_cash)}</p>
                </div>
              )}
              {shift.summary.total_qris > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500">QRIS</p>
                  <p className="text-sm font-bold text-neon-blue">{fmt(shift.summary.total_qris)}</p>
                </div>
              )}
              <div className="border-l border-slate-700 pl-3">
                <p className="text-[10px] text-slate-500">Omzet</p>
                <p className="text-sm font-bold text-neon-purple">{fmt(shift.summary.total_omzet)}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
