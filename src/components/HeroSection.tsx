"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";

// Dynamically import Hyperspeed (it uses window/WebGL, so no SSR)
const Hyperspeed = dynamic(
  () => import("@/components/Hyperspeed/Hyperspeed"),
  { ssr: false }
);

export default function HeroSection() {
  // Memoize effectOptions to avoid unnecessary WebGL scene recreations
  const effectOptions = useMemo(
    () => ({
      onSpeedUp: () => {},
      onSlowDown: () => {},
      distortion: "turbulentDistortion",
      length: 400,
      roadWidth: 10,
      islandWidth: 2,
      lanesPerRoad: 3,
      fov: 90,
      fovSpeedUp: 150,
      speedUp: 2,
      carLightsFade: 0.4,
      totalSideLightSticks: 20,
      lightPairsPerRoadWay: 40,
      shoulderLinesWidthPercentage: 0.05,
      brokenLinesWidthPercentage: 0.1,
      brokenLinesLengthPercentage: 0.5,
      lightStickWidth: [0.12, 0.5] as [number, number],
      lightStickHeight: [1.3, 1.7] as [number, number],
      movingAwaySpeed: [60, 80] as [number, number],
      movingCloserSpeed: [-120, -160] as [number, number],
      carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
      carLightsRadius: [0.05, 0.14] as [number, number],
      carWidthPercentage: [0.3, 0.5] as [number, number],
      carShiftX: [-0.8, 0.8] as [number, number],
      carFloorSeparation: [0, 5] as [number, number],
      colors: {
        roadColor: 0x080808,
        islandColor: 0x0a0a0a,
        background: 0x000000,
        shoulderLines: 0x131318,
        brokenLines: 0x131318,
        leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
        rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
        sticks: 0x03b3c3,
      },
    }),
    []
  );

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

        let sortedBranches = data || [];
        sortedBranches.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          const isManyaranA = nameA.includes("manyaran");
          const isManyaranB = nameB.includes("manyaran");
          if (isManyaranA && !isManyaranB) return -1;
          if (!isManyaranA && isManyaranB) return 1;
          
          const isKeduaA = nameA.includes("kedua") || nameA.includes("2");
          const isKeduaB = nameB.includes("kedua") || nameB.includes("2");
          if (isKeduaA && !isKeduaB) return -1;
          if (!isKeduaA && isKeduaB) return 1;
          
          return nameA.localeCompare(nameB);
        });

        if (sortedBranches.length > 0) {
          setActiveBranches(sortedBranches);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      }
    };
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeBranches.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBranchIndex((prev) => (prev + 1) % activeBranches.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeBranches]);

  const currentBranch = activeBranches[currentBranchIndex] || { name: "Cabang Manyaran", is_active: true };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ── Hyperspeed WebGL Background ──────────────── */}
      <div className="absolute inset-0 z-0">
        <Hyperspeed effectOptions={effectOptions} />

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-24">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
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
          transition={{ duration: 0.8, delay: 0.5 }}
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
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-[family-name:var(--font-inter)]"
        >
          Rental PS &amp; Gaming Lounge Terlengkap. Cek ketersediaan bilik secara real-time dan booking sekarang tanpa ribet.
        </motion.p>

        {/* CTA Buttons — matching screenshot style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
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
          transition={{ duration: 0.8, delay: 1.3 }}
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

      {/* ── Scroll Indicator ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-slate-500 font-[family-name:var(--font-rajdhani)] tracking-widest uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown size={20} className="text-neon-purple/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
