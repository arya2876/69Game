"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRealtimeTransactions, type Transaction } from "@/lib/hooks/useRealtimeTransactions";
import { createClient } from "@/lib/supabase/client";
import BookingReceiptModal from "@/components/dashboard/BookingReceiptModal";
import ShiftReportTab from "@/components/dashboard/ShiftReportTab";

// ── SVG ICONS ───────────────────────────────────────────────
const SvgCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SvgDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const SvgTrendingUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-400">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const SvgTrendingDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-400">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
  </svg>
);
const SvgDollarSign = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-neon-blue">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const SvgUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const SvgEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const SvgX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SvgTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const SvgPencil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

// ── DATE HELPERS ────────────────────────────────────────────
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
function formatDisplay(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ── EXPORT PDF ──────────────────────────────────────────────
function exportToPDF(
  filtered: Transaction[],
  totalIncome: number,
  totalExpense: number,
  netProfit: number,
  dateFrom: string,
  dateTo: string,
  branchName: string
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup diblokir browser. Izinkan popup untuk mengekspor laporan.");
    return;
  }

  const rows = filtered
    .map(
      (tx) => `
    <tr>
      <td>${tx.id}</td>
      <td>${tx.date}</td>
      <td>${tx.description}</td>
      <td>${tx.method || "-"}</td>
      <td class="${tx.type}" style="text-align:right">
        ${tx.type === "income" ? "+" : "-"}Rp ${tx.amount.toLocaleString("id-ID")}
      </td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Keuangan 69Game</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    .sub { color: #555; font-size: 11px; margin-bottom: 24px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; min-width: 140px; }
    .card-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    .card-value { font-size: 16px; font-weight: 800; }
    .income-val { color: #059669; }
    .expense-val { color: #dc2626; }
    .net-val { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; border: 1px solid #e5e7eb; }
    td { padding: 7px 10px; border: 1px solid #e5e7eb; vertical-align: middle; }
    tr:nth-child(even) { background: #fafafa; }
    .income { color: #059669; font-weight: 700; }
    .expense { color: #dc2626; font-weight: 700; }
    .footer { margin-top: 24px; font-size: 10px; color: #999; }
    @media print { button { display: none !important; } }
  </style>
</head>
<body>
  <h1>Laporan Keuangan — 69Game</h1>
  <p class="sub">Cabang: ${branchName} &nbsp;|&nbsp; Periode: ${formatDisplay(dateFrom)} s/d ${formatDisplay(dateTo)} &nbsp;|&nbsp; Dicetak: ${new Date().toLocaleString("id-ID")}</p>
  <div class="summary">
    <div class="card"><div class="card-label">Total Pemasukan</div><div class="card-value income-val">Rp ${totalIncome.toLocaleString("id-ID")}</div></div>
    <div class="card"><div class="card-label">Total Pengeluaran</div><div class="card-value expense-val">Rp ${totalExpense.toLocaleString("id-ID")}</div></div>
    <div class="card"><div class="card-label">Laba Bersih</div><div class="card-value net-val">Rp ${netProfit.toLocaleString("id-ID")}</div></div>
    <div class="card"><div class="card-label">Jumlah Transaksi</div><div class="card-value">${filtered.length}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Tanggal</th><th>Deskripsi</th><th>Metode</th><th style="text-align:right">Nominal</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">Tidak ada transaksi pada periode ini</td></tr>'}</tbody>
  </table>
  <div class="footer">Laporan ini dibuat secara otomatis oleh sistem 69Game Management System.</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

// ── MAIN PAGE ───────────────────────────────────────────────
export default function LaporanKeuanganPage() {
  const { profile, activeBranchId, activeBranch } = useUser();
  const currentUserRole = profile?.role || "cashier";
  const { transactions, loading } = useRealtimeTransactions(activeBranchId);

  // ── Date Range State ────────────────────────────────────
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(toDateStr(firstOfMonth));
  const [dateTo, setDateTo] = useState(toDateStr(today));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── OPEX Form State ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"overview" | "opex" | "shifts">("overview");
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  const [opexCategory, setOpexCategory] = useState("Listrik & Air");
  const [opexNominal, setOpexNominal] = useState("");
  const [opexDesc, setOpexDesc] = useState("");
  const [opexReceiptPreview, setOpexReceiptPreview] = useState<string | null>(null);
  const [opexFile, setOpexFile] = useState<File | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  // ── Filtered Transactions ───────────────────────────────
  const filtered = useMemo(() => {
    const from = new Date(dateFrom + "T00:00:00");
    const to = new Date(dateTo + "T23:59:59");
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= from && d <= to;
    });
  }, [transactions, dateFrom, dateTo]);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((a, c) => a + c.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((a, c) => a + c.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // ── OPEX Handlers ───────────────────────────────────────
  const handleOpexImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOpexReceiptPreview(URL.createObjectURL(file));
      setOpexFile(file);
      setUploadError(false);
    }
  };

  const handleSaveOpex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opexReceiptPreview) { setUploadError(true); }
    if (!opexCategory || !opexNominal || !opexDesc || !opexReceiptPreview) {
      alert("Harap lengkapi semua field dan unggah bukti nota.");
      return;
    }
    setIsSubmitting(true);
    try {
      let finalReceiptUrl = opexReceiptPreview;
      if (opexFile) {
        const fileExt = opexFile.name.split(".").pop();
        const fileName = `${activeBranchId}-${opexFile.name}-${fileExt}`;
        const filePath = `${activeBranchId}/${fileName}`;
        const { error: uploadErr } = await supabase.storage.from("expenses_receipts").upload(filePath, opexFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("expenses_receipts").getPublicUrl(filePath);
        finalReceiptUrl = publicUrl;
      }
      if (editingTxId) {
        alert("Pembaruan data berhasil.");
        setEditingTxId(null);
      } else {
        const res = await fetch("/api/expenses/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: opexCategory,
            amount: parseInt(opexNominal.replace(/\D/g, "")),
            description: opexDesc,
            receipt_url: finalReceiptUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengeluaran");
      }
      setOpexCategory("Listrik & Air");
      setOpexNominal("");
      setOpexDesc("");
      setOpexReceiptPreview(null);
      setOpexFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setOpexCategory(tx.category || "Lainnya");
    setOpexNominal(tx.amount.toString());
    setOpexDesc(tx.description);
    setOpexReceiptPreview(tx.receipt || null);
    setUploadError(false);
    setActiveTab("opex");
  };

  const handleDelete = async (tx: Transaction) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    if (tx.type === "expense") {
      const { error } = await supabase.from("expenses").delete().eq("id", tx.raw_id);
      if (error) alert(error.message);
    } else {
      alert("Pemasukan dari sistem tidak dapat dihapus secara manual.");
    }
  };

  // ── Quick date presets ──────────────────────────────────
  const applyPreset = (preset: "today" | "week" | "month" | "all") => {
    const t = new Date();
    if (preset === "today") {
      setDateFrom(toDateStr(t));
      setDateTo(toDateStr(t));
    } else if (preset === "week") {
      const start = new Date(t);
      start.setDate(t.getDate() - 6);
      setDateFrom(toDateStr(start));
      setDateTo(toDateStr(t));
    } else if (preset === "month") {
      setDateFrom(toDateStr(new Date(t.getFullYear(), t.getMonth(), 1)));
      setDateTo(toDateStr(t));
    } else {
      setDateFrom("2020-01-01");
      setDateTo(toDateStr(t));
    }
    setShowDatePicker(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Memuat data laporan keuangan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header: Title + Date Range + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Laporan Keuangan</h1>
          <p className="text-sm text-slate-400 mt-1">Pantau arus kas, pendapatan, dan pengeluaran harian.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">

          {/* Date Picker */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              <SvgCalendar />
              {formatDisplay(dateFrom)} — {formatDisplay(dateTo)}
            </button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 p-4 space-y-4">
                {/* Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(["today", "week", "month", "all"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => applyPreset(p)}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-md bg-slate-800 text-slate-400 hover:bg-neon-purple/20 hover:text-neon-purple transition-all"
                    >
                      {p === "today" ? "Hari Ini" : p === "week" ? "7 Hari" : p === "month" ? "Bulan Ini" : "Semua"}
                    </button>
                  ))}
                </div>
                {/* Custom range */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={dateFrom}
                      max={dateTo}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-purple/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-purple/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-full py-2 rounded-lg bg-neon-purple/20 text-neon-purple text-sm font-bold hover:bg-neon-purple/30 transition-all"
                >
                  Terapkan
                </button>
              </div>
            )}
          </div>

          {/* Export */}
          <button
            onClick={() =>
              exportToPDF(
                filtered,
                totalIncome,
                totalExpense,
                netProfit,
                dateFrom,
                dateTo,
                activeBranch?.name || "Semua Cabang"
              )
            }
            className="flex items-center gap-2 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-neon-purple/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            <SvgDownload />
            Export PDF
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 px-1 border-b-2 font-bold text-sm transition-all uppercase tracking-wider ${
            activeTab === "overview"
              ? "border-neon-blue text-neon-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Overview & Pemasukan
        </button>
        <button
          onClick={() => setActiveTab("opex")}
          className={`pb-2 px-1 border-b-2 font-bold text-sm transition-all uppercase tracking-wider ${
            activeTab === "opex"
              ? "border-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Kelola Pengeluaran (OPEX)
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          className={`pb-2 px-1 border-b-2 font-bold text-sm transition-all uppercase tracking-wider ${
            activeTab === "shifts"
              ? "border-neon-purple text-neon-purple drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Laporan Shift
        </button>
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Pemasukan</span>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><SvgTrendingUp /></div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">Rp {totalIncome.toLocaleString("id-ID")}</div>
              <div className="mt-2 text-xs text-emerald-400 font-semibold">{filtered.filter(t => t.type === "income").length} transaksi</div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full blur-2xl group-hover:bg-red-500/10 transition-all" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Pengeluaran</span>
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><SvgTrendingDown /></div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">Rp {totalExpense.toLocaleString("id-ID")}</div>
              <div className="mt-2 text-xs text-slate-500 font-semibold">{filtered.filter(t => t.type === "expense").length} transaksi</div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 relative overflow-hidden group border-neon-blue/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/5 rounded-bl-full blur-2xl group-hover:bg-neon-blue/10 transition-all" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-neon-blue">Laba Bersih</span>
                <div className="w-10 h-10 rounded-full bg-neon-blue/10 flex items-center justify-center"><SvgDollarSign /></div>
              </div>
              <div className={`text-3xl font-extrabold font-mono tracking-tight ${netProfit >= 0 ? "text-white" : "text-red-400"}`}>
                Rp {netProfit.toLocaleString("id-ID")}
              </div>
              <div className="mt-2 text-xs text-neon-blue font-semibold">{formatDisplay(dateFrom)} — {formatDisplay(dateTo)}</div>
            </div>
          </div>

          {/* Transaction Log */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-wide">Riwayat Transaksi</h2>
              <span className="text-xs text-slate-500 font-mono">{filtered.length} transaksi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">ID & Tanggal</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Deskripsi</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Metode</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                        Tidak ada transaksi pada periode {formatDisplay(dateFrom)} — {formatDisplay(dateTo)}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((tx) => (
                      <tr
                        key={tx.id + tx.date}
                        onClick={() => tx.type === "income" && tx.raw_id && setDetailBookingId(tx.raw_id)}
                        className={`border-b border-slate-800/50 transition-colors ${tx.type === "income" ? "hover:bg-white/[0.03] cursor-pointer" : "hover:bg-white/[0.02]"}`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-slate-300 block">{tx.id}</span>
                          <span className="text-xs text-slate-500">{tx.date}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {tx.description}
                          {tx.type === "income" && (
                            <span className="ml-2 text-[10px] text-slate-600 font-medium">Klik untuk detail →</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {tx.method ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              tx.method === "QRIS" ? "bg-neon-blue/10 text-neon-blue" :
                              tx.method === "Transfer" ? "bg-neon-purple/10 text-neon-purple" :
                              "bg-slate-800 text-slate-300"
                            }`}>{tx.method}</span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-bold font-mono tracking-wider ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                            {tx.type === "income" ? "+" : "-"}Rp {tx.amount.toLocaleString("id-ID")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: OPEX */}
      {activeTab === "opex" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-bold text-white tracking-wide mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {editingTxId ? "Edit Pengeluaran" : "Input Pengeluaran"}
              </h2>
              <form onSubmit={handleSaveOpex} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Kategori</label>
                  <div className="relative">
                    <select
                      value={opexCategory}
                      onChange={(e) => setOpexCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white appearance-none focus:border-amber-500/50 outline-none transition-all"
                    >
                      <option>Listrik & Air</option>
                      <option>Restok F&B</option>
                      <option>Maintenance Alat</option>
                      <option>Lainnya</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Nominal (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 150000"
                    value={opexNominal}
                    onChange={(e) => setOpexNominal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-amber-500/50 outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Deskripsi</label>
                  <textarea
                    placeholder="Misal: Beli Indomie Goreng 2 Kardus"
                    value={opexDesc}
                    onChange={(e) => setOpexDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-amber-500/50 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Unggah Nota / Foto (Wajib)</label>
                  {opexReceiptPreview ? (
                    <div className="relative w-full h-32 rounded-lg border border-slate-700 overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={opexReceiptPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => { setOpexReceiptPreview(null); setOpexFile(null); }}
                          className="px-3 py-1.5 bg-red-500/80 text-white rounded-md text-xs font-bold flex items-center gap-2">
                          <SvgX /> Hapus Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`relative w-full bg-slate-950/50 border border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer group ${uploadError ? "border-red-500 text-red-500" : "border-slate-700 text-slate-500 hover:text-amber-500 hover:border-amber-500/50"}`}>
                      <input type="file" accept="image/*" onChange={handleOpexImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <SvgUpload />
                      <span className="text-xs font-semibold mt-2 text-center">{uploadError ? "Nota/Foto Produk wajib diisi!" : "Klik / Tarik foto ke sini"}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {editingTxId && (
                    <button type="button" onClick={() => { setEditingTxId(null); setOpexCategory("Listrik & Air"); setOpexNominal(""); setOpexDesc(""); setOpexReceiptPreview(null); setOpexFile(null); }}
                      className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold hover:text-white transition-all">
                      Batal
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all ${isSubmitting ? "bg-amber-500/5 text-amber-500/50 border-amber-500/10 cursor-not-allowed" : "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20"}`}>
                    {isSubmitting ? "Menyimpan..." : editingTxId ? "Perbarui" : "Simpan Pengeluaran"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Expense Log */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-base font-bold text-white tracking-wide">Log Pengeluaran</h2>
                <span className="text-xs text-slate-500 font-mono">{formatDisplay(dateFrom)} — {formatDisplay(dateTo)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/30">
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tanggal</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Bukti</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Detail</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Nominal</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter((t) => t.type === "expense").length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Tidak ada pengeluaran pada periode ini</td></tr>
                    ) : (
                      filtered.filter((t) => t.type === "expense").map((tx) => (
                        <tr key={tx.id + tx.date} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-slate-300 block">{tx.date.split(" ")[0]}</span>
                            <span className="text-[10px] text-slate-500">{tx.id}</span>
                          </td>
                          <td className="px-4 py-3">
                            {tx.receipt ? (
                              <button onClick={() => setLightboxImg(tx.receipt!)}
                                className="w-12 h-12 rounded border border-slate-700 overflow-hidden hover:border-amber-500 transition-all relative group block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={tx.receipt} alt="Nota" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><SvgEye /></div>
                              </button>
                            ) : (
                              <div className="w-12 h-12 rounded border border-dashed border-slate-800 flex items-center justify-center bg-slate-950/50">
                                <span className="text-[9px] font-semibold text-slate-600 text-center leading-tight">No<br />Pic</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-white block">{tx.description}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">{tx.category || "Lainnya"} • Oleh: {tx.by || "Admin"}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold font-mono tracking-wider text-amber-400">Rp {tx.amount.toLocaleString("id-ID")}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2 relative group/action">
                              {currentUserRole === "cashier" && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded opacity-0 group-hover/action:opacity-100 pointer-events-none z-10">
                                  Hanya Owner yang dapat mengubah
                                </div>
                              )}
                              <button disabled={currentUserRole === "cashier"} onClick={() => handleEdit(tx)}
                                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <SvgPencil />
                              </button>
                              <button disabled={currentUserRole === "cashier"} onClick={() => handleDelete(tx)}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <SvgTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: LAPORAN SHIFT */}
      {activeTab === "shifts" && (
        <ShiftReportTab branchId={activeBranchId} dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {/* Transaction Detail Receipt */}
      <BookingReceiptModal
        isOpen={!!detailBookingId}
        bookingId={detailBookingId}
        onClose={() => setDetailBookingId(null)}
      />

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><SvgX /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImg} alt="Preview Nota" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
