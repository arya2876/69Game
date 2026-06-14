"use client";

import { useState } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/types/database";

const SvgPlay = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const SvgLoader = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

interface ShiftGateProps {
  profile: Profile;
  onOpen: () => Promise<void>;
}

export default function ShiftGate({ profile, onOpen }: ShiftGateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const handleOpen = async () => {
    setLoading(true);
    setError(null);
    try {
      await onOpen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka shift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-purple/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-neon-purple/40 shadow-[0_0_24px_rgba(168,85,247,0.3)]">
            <Image src="/logo69.jpg" alt="69Game" fill sizes="64px" className="object-cover" />
          </div>
          <span className="text-2xl font-bold font-[family-name:var(--font-rajdhani)] tracking-widest neon-text">69Game</span>
        </div>

        {/* Greeting */}
        <div className="space-y-1">
          <p className="text-slate-400 text-sm">Selamat datang,</p>
          <p className="text-xl font-bold text-white font-[family-name:var(--font-rajdhani)] tracking-wide">{profile.full_name}</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Kasir</p>
        </div>

        {/* Clock */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-1">
          <p className="text-4xl font-mono font-bold text-white tracking-wider">{timeStr}</p>
          <p className="text-xs text-slate-500 capitalize">{dateStr}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleOpen}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-neon-purple/15 border border-neon-purple/40 text-neon-purple text-base font-bold font-[family-name:var(--font-rajdhani)] tracking-widest uppercase hover:bg-neon-purple/25 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {loading ? <><SvgLoader /> Membuka shift...</> : <><SvgPlay /> Mulai Shift</>}
        </button>

        <p className="text-[10px] text-slate-600">Buka shift untuk mulai menerima transaksi</p>
      </div>
    </div>
  );
}
