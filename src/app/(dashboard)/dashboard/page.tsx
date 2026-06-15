"use client";

import { useUser } from "@/contexts/UserContext";
import { useRealtimeDashboard } from "@/lib/hooks/useRealtimeDashboard";
import { useRealtimeFacilities } from "@/lib/hooks/useRealtimeFacilities";
import CashierDashboard from "@/components/dashboard/CashierDashboard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── SVG ICONS ───────────────────────────────────────────────
const IconWallet   = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>);
const IconGamepad  = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" /><rect x="2" y="6" width="20" height="12" rx="2" /></svg>);
const IconTarget   = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>);
const IconClock    = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const IconReceipt  = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M14 8H8M16 12H8M12 16H8" /></svg>);

function fmt(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function fmtEndTime(iso: string | null) {
  if (!iso) return "Open";
  const end = new Date(iso);
  // sentinel: booking end_time set 24h ahead for open sessions
  if (end.getTime() - Date.now() > 23 * 60 * 60 * 1000) return "Open";
  return end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_CONFIG = {
  available:    { label: "Tersedia",    color: "bg-emerald-500", bar: "bg-emerald-500", text: "text-emerald-400" },
  active:       { label: "Aktif",       color: "bg-neon-blue",   bar: "bg-neon-blue",   text: "text-neon-blue"  },
  waiting_next: { label: "Menunggu",    color: "bg-amber-400",   bar: "bg-amber-400",   text: "text-amber-400"  },
  maintenance:  { label: "Maintenance", color: "bg-red-500",     bar: "bg-red-500",     text: "text-red-400"    },
} as const;

const METHOD_BADGE: Record<string, string> = {
  CASH:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  TUNAI: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  QRIS:  "bg-neon-blue/15 text-neon-blue border-neon-blue/30",
};

function methodBadge(m: string | null) {
  const key = (m ?? "").toUpperCase();
  const cls = METHOD_BADGE[key] ?? "bg-slate-700 text-slate-300 border-slate-600";
  const label = key.startsWith("QRIS") ? "QRIS" : key || "—";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{label}</span>;
}

export default function DashboardPage() {
  const { profile, activeBranchId, isCashier } = useUser();
  // Pass null for cashier: prevents duplicate channel subscriptions since
  // CashierDashboard mounts its own hooks with the real branchId.
  const ownerBranchId = isCashier ? null : activeBranchId;
  const { metrics, loading } = useRealtimeDashboard(ownerBranchId);
  const { facilities } = useRealtimeFacilities(ownerBranchId);

  if (isCashier) return <CashierDashboard />;

  const firstName = profile?.full_name.split(" ")[0] ?? "User";

  // Facility status breakdown
  const statusCounts = facilities.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1;
    return acc;
  }, {});
  const total = facilities.length || 1;

  // Active rooms sorted by end time
  const activeRooms = facilities
    .filter(f => f.status === "active" || f.status === "waiting_next")
    .sort((a, b) => {
      const at = a.active_booking_end_time ? new Date(a.active_booking_end_time).getTime() : Infinity;
      const bt = b.active_booking_end_time ? new Date(b.active_booking_end_time).getTime() : Infinity;
      return at - bt;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Selamat datang, {firstName.toUpperCase()}!</p>
      </div>

      {/* ── ROW 1: KPI CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Pendapatan",
            value: fmt(metrics.totalIncome),
            sub: "7 hari terakhir",
            Icon: IconWallet,
            accent: "text-neon-purple",
          },
          {
            title: "Booking Aktif",
            value: `${metrics.activeBookings} Ruangan`,
            sub: `dari ${metrics.totalFacilities} total`,
            Icon: IconGamepad,
            accent: "text-neon-blue",
          },
          {
            title: "Keterisian",
            value: `${metrics.occupancyRate}%`,
            sub: metrics.occupancyRate > 75 ? "Hampir penuh" : metrics.occupancyRate > 40 ? "Normal" : "Sepi",
            Icon: IconTarget,
            accent: metrics.occupancyRate > 75 ? "text-amber-400" : "text-emerald-400",
          },
          {
            title: "Deposit Member",
            value: `${metrics.totalDepositMinutes.toLocaleString("id-ID")} Menit`,
            sub: "Total seluruh member",
            Icon: IconClock,
            accent: "text-slate-400",
          },
        ].map((m, i) => (
          <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-5 right-5 text-slate-600 group-hover:text-neon-purple transition-colors"><m.Icon /></div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.title}</h3>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-white tracking-wide">{m.value}</span>
            </div>
            <div className="mt-1.5">
              <span className={`text-xs font-medium ${m.accent}`}>{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: REVENUE CHART + ACTIVE ROOMS ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-3 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Tren Pendapatan (7 Hari Terakhir)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.revenueTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", color: "#fff" }}
                  itemStyle={{ color: "#A855F7" }}
                  formatter={(val: unknown) => [fmt(Number(val)), "Pendapatan"]}
                />
                <Area type="monotone" dataKey="total" stroke="#A855F7" strokeWidth={2} fill="url(#areaGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active rooms panel */}
        <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Ruangan Aktif</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neon-blue/15 text-neon-blue border border-neon-blue/30">
              {activeRooms.length}
            </span>
          </div>

          {activeRooms.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-600 text-xs text-center">Tidak ada ruangan aktif saat ini</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {activeRooms.map((f) => {
                const cfg = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
                const endLabel = fmtEndTime(f.active_booking_end_time ?? null);
                return (
                  <div key={f.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${cfg.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-white truncate">
                          {f.name}{f.booth_number ? ` · ${f.booth_number}` : ""}
                        </p>
                        {f.status === "waiting_next" && (
                          <span className="text-[9px] font-bold text-amber-400 shrink-0">NEXT</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Selesai: <span className={cfg.text}>{endLabel}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: STATUS RUANGAN + TRANSAKSI TERBARU ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Facility status breakdown */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Status Ruangan</h2>
          <div className="space-y-4">
            {(["available", "active", "waiting_next", "maintenance"] as const).map((status) => {
              const count = statusCounts[status] ?? 0;
              const pct = Math.round((count / total) * 100);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
                      <span className="text-xs text-slate-300 font-medium">{cfg.label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Ruangan</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{facilities.length}</p>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <IconReceipt />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Transaksi Hari Ini</h2>
          </div>

          {metrics.recentBookings.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-600 text-sm">Belum ada transaksi hari ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.recentBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {b.memberName} <span className="font-normal text-slate-500">·</span> {b.facilityName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{fmtTime(b.completedAt)}</p>
                  </div>
                  <div className="shrink-0">{methodBadge(b.paymentMethod)}</div>
                  <div className="text-sm font-bold text-white shrink-0 tabular-nums">
                    {fmt(b.totalAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
