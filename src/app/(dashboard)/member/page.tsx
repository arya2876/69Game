"use client";

import { useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRealtimeMembers, type MemberProfile } from "@/lib/hooks/useRealtimeMembers";

// ── SVG ICONS ───────────────────────────────────────────────
const SvgPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const SvgWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const SvgEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const SvgUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const SvgSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const SvgX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SvgLoader = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
const SvgCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── ADD MEMBER MODAL ────────────────────────────────────────
function AddMemberModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, whatsapp, username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat member");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Tambah Member Baru</h2>
            <p className="text-xs text-slate-500 mt-0.5">Buat akun member baru untuk pelanggan</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <SvgX />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              placeholder="Nama pelanggan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-neon-purple/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">No. WhatsApp</label>
            <input
              type="tel"
              placeholder="0812xxxx"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-neon-purple/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Username</label>
            <input
              type="text"
              placeholder="Contoh: arya123 (tanpa spasi)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-neon-purple/50 transition-all"
            />
            <p className="text-[10px] text-slate-600 mt-1">Login: {username ? `${username.toLowerCase()}@member.69game.id` : "username@member.69game.id"}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Password</label>
            <input
              type="password"
              placeholder="Min. 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-neon-purple/50 transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-bold text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !fullName || !whatsapp || !username || !password}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><SvgLoader /> Membuat...</> : <><SvgPlus /> Buat Member</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EDIT MEMBER MODAL ───────────────────────────────────────
function EditMemberModal({
  member,
  onClose,
  onSuccess,
}: {
  member: MemberProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState(member.name);
  const [whatsapp, setWhatsapp] = useState(member.whatsapp === "-" ? "" : member.whatsapp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/member/${member.rawId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, whatsapp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui data");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Edit Data Member</h2>
            <p className="text-xs text-slate-500 mt-0.5">ID: {member.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <SvgX />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-neon-blue/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">No. WhatsApp</label>
            <input
              type="tel"
              placeholder="0812xxxx"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-neon-blue/50 transition-all"
            />
          </div>

          {/* Deposit info (read-only) */}
          <div className="px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Deposit Waktu (hanya baca)</span>
            <span className={`text-base font-extrabold ${member.depositMinutes > 0 ? "text-emerald-400" : "text-slate-600"}`}>
              {member.depositMinutes} Menit
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-bold text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !fullName}
              className="flex-1 py-2.5 rounded-xl bg-neon-blue/20 border border-neon-blue/40 text-neon-blue text-sm font-bold uppercase tracking-wider hover:bg-neon-blue/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><SvgLoader /> Menyimpan...</> : <><SvgCheck /> Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── SUCCESS TOAST ───────────────────────────────────────────
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shadow-2xl backdrop-blur-md text-emerald-400 text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300">
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <SvgCheck />
      </div>
      {message}
      <button onClick={onClose} className="ml-2 text-emerald-600 hover:text-emerald-400 transition-colors">
        <SvgX />
      </button>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────
export default function MemberPage() {
  useUser();
  const { members, loading, refetch } = useRealtimeMembers();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState<MemberProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.whatsapp.includes(searchQuery)
  );

  const totalDeposit = members.reduce((acc, curr) => acc + curr.depositMinutes, 0);
  const activeMembersCount = members.filter((m) => m.depositMinutes > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Memuat data member...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Database Member</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola pelanggan dan fitur Time Banking.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
            <SvgUsers />
            {members.length} Member
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <SvgClock />
            {totalDeposit} Mnt Deposit
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Total Member</span>
          <span className="text-3xl font-extrabold text-white">{members.length}</span>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Punya Deposit</span>
          <span className="text-3xl font-extrabold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{activeMembersCount}</span>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Total Deposit Waktu</span>
          <span className="text-3xl font-extrabold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{totalDeposit} <span className="text-base text-slate-400">menit</span></span>
        </div>
      </div>

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2.5 flex-1 max-w-md focus-within:border-neon-purple/50 transition-colors">
          <SvgSearch />
          <input
            type="text"
            placeholder="Cari Nama / No. WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-500"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <SvgPlus />
          Tambah Member
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Nama</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">No. WhatsApp</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Kunjungan</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Deposit Waktu</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Bergabung</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    {searchQuery ? `Tidak ada member dengan "${searchQuery}".` : "Belum ada member terdaftar."}
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr key={member.rawId} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-purple/50 to-neon-blue/50 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white block">{member.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{member.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                        <span className="text-emerald-500"><SvgWhatsApp /></span>
                        {member.whatsapp}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300 font-semibold">{member.totalVisits}x</td>
                    <td className="px-6 py-4">
                      {member.depositMinutes > 0 ? (
                        <span className="text-sm font-extrabold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                          {member.depositMinutes} Menit
                        </span>
                      ) : (
                        <span className="text-sm text-slate-600">0 Menit</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{member.joinDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditMember(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-neon-blue/10 text-neon-blue border border-neon-blue/20 hover:bg-neon-blue/20 transition-all"
                        >
                          <SvgEdit />
                          Edit
                        </button>
                        <a
                          href={`https://wa.me/${member.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                        >
                          <SvgWhatsApp />
                          Chat
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            refetch();
            showToast("Member baru berhasil ditambahkan!");
          }}
        />
      )}
      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSuccess={() => {
            refetch();
            showToast("Data member berhasil diperbarui!");
          }}
        />
      )}

      {/* Toast */}
      {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
