"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroBackground from "@/components/HeroBackground";

export default function HeroSection() {
  const [activeBranches, setActiveBranches] = useState<{name: string, is_active: boolean}[]>([]);
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);

  useEffect(() => {
    const fetchBranches = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from("branches")
          .select("name, is_active")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        const sorted = (data ?? []).sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName.includes("manyaran") && !bName.includes("manyaran")) return -1;
          if (!aName.includes("manyaran") && bName.includes("manyaran")) return 1;
          return aName.localeCompare(bName);
        });

        if (sorted.length > 0) setActiveBranches(sorted);
      } catch {
        // fail silently — branch badge is non-critical
      }
    };
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeBranches.length <= 1) return;
    const id = setInterval(
      () => setCurrentBranchIndex((prev) => (prev + 1) % activeBranches.length),
      4000
    );
    return () => clearInterval(id);
  }, [activeBranches]);

  const currentBranch = activeBranches[currentBranchIndex] ?? { name: "Cabang Manyaran", is_active: true };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* ── CSS Warp Background ─────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <HeroBackground />
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-24">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2.5 glass rounded-full px-4 py-2 mb-8 overflow-hidden"
        >
          <span className="px-2 py-0.5 rounded-full bg-neon-purple text-[10px] font-bold text-white uppercase tracking-wider font-[family-name:var(--font-rajdhani)] shrink-0">
            Open
          </span>
          <div className="relative flex items-center h-5 overflow-hidden min-w-[200px]">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={currentBranch.name}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 text-xs sm:text-sm font-medium text-slate-300 font-[family-name:var(--font-rajdhani)] tracking-wider whitespace-nowrap text-left flex items-center"
              >
                {currentBranch.name} — {currentBranch.is_active ? "Buka Sekarang" : "Tutup"}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] font-[family-name:var(--font-rajdhani)] tracking-tight text-white"
        >
          Level Up Your
          <br />
          <span className="gradient-text-animated">Gaming Experience</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-[family-name:var(--font-inter)]"
        >
          Rental PS &amp; Gaming Lounge Terlengkap. Cek ketersediaan bilik secara real-time dan booking sekarang tanpa ribet.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/fasilitas"
            className="px-8 py-3.5 rounded-xl bg-white text-slate-900 font-bold text-base font-[family-name:var(--font-rajdhani)] tracking-wider uppercase hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300"
          >
            Cek Ketersediaan
          </a>
          <a
            href="/fasilitas"
            className="px-8 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-slate-200 font-bold text-base font-[family-name:var(--font-rajdhani)] tracking-wider uppercase hover:bg-white/20 hover:border-white/30 transition-all duration-300"
          >
            Lihat Fasilitas
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto"
        >
          {[
            { value: "2+", label: "Cabang" },
            { value: "8+", label: "Fasilitas" },
            { value: "5K+", label: "Gamers" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold gradient-text font-[family-name:var(--font-rajdhani)]">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-[family-name:var(--font-inter)]">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll Indicator (CSS bounce — no JS animation loop) ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-slate-500 font-[family-name:var(--font-rajdhani)] tracking-widest uppercase">
          Scroll
        </span>
        <div className="animate-bounce">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neon-purple/60" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </motion.div>

    </section>
  );
}
