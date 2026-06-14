"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AnimatedSection from "./AnimatedSection";

export default function BranchSelector({
  activeBranchId,
  setActiveBranchId
}: {
  activeBranchId: string | null;
  setActiveBranchId: (id: string) => void;
}) {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from("branches")
          .select("*")
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

        setBranches(sortedBranches);
        
        // Select the first branch by default if none is selected
        if (sortedBranches.length > 0 && !activeBranchId) {
          setActiveBranchId(sortedBranches[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [activeBranchId, setActiveBranchId]);

  return (
    <AnimatedSection id="cabang" className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* ── Section Header ──────────────────────────── */}
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs sm:text-sm font-semibold text-neon-purple uppercase tracking-[0.25em] font-[family-name:var(--font-rajdhani)]"
          >
            Kunjungi Kami
          </motion.span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-rajdhani)] section-heading">
            Lokasi Kami
          </h2>
          <p className="mt-6 text-slate-400 max-w-xl mx-auto font-[family-name:var(--font-inter)]">
            Pilih cabang terdekat dan mulai pengalaman gaming terbaik bersama 69Game.
          </p>
        </div>

        {/* ── Branch Cards ────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {branches.map((branch, idx) => (
              <motion.div
                key={branch.id}
                onClick={() => setActiveBranchId(branch.id)}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className={`glass rounded-2xl p-6 sm:p-8 glow-card group relative overflow-hidden cursor-pointer transition-all duration-300 ${
                  activeBranchId === branch.id ? 'ring-2 ring-neon-purple scale-[1.02]' : 'hover:scale-[1.02]'
                }`}
              >
                {/* Decorative gradient corner */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-neon-purple/10 to-transparent rounded-bl-full" />

                {/* Status Badge & Selection Indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        branch.is_active
                          ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                          : "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                      } animate-pulse`}
                    />
                    <span
                      className={`text-xs sm:text-sm font-semibold tracking-wider uppercase font-[family-name:var(--font-rajdhani)] ${
                        branch.is_active ? "text-green-400" : "text-yellow-400"
                      }`}
                    >
                      {branch.is_active ? "Buka Sekarang" : "Tutup"}
                    </span>
                  </div>
                  {activeBranchId === branch.id && (
                    <span className="text-xs font-bold text-neon-purple uppercase tracking-widest bg-neon-purple/10 px-2 py-1 rounded-full">Terpilih</span>
                  )}
                </div>

                {/* Branch Name */}
                <h3 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-rajdhani)] mb-1">
                  {branch.name}
                </h3>
                <p className="text-sm text-neon-purple font-medium font-[family-name:var(--font-rajdhani)] tracking-wider mb-4">
                  Cabang Utama
                </p>

                {/* Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3 text-slate-400">
                    <MapPin size={16} className="text-neon-blue mt-0.5 shrink-0" />
                    <span className="text-sm font-[family-name:var(--font-inter)]">
                      {branch.address || "Alamat belum ditambahkan"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Clock size={16} className="text-neon-blue shrink-0" />
                    <span className="text-sm font-[family-name:var(--font-inter)]">
                      {branch.operating_hours || "08:00 - 24:00"}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                {branch.google_maps_url && (
                  <a
                    href={branch.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 btn-outline text-sm px-6 py-2.5 font-[family-name:var(--font-rajdhani)] tracking-wider uppercase"
                  >
                    <ExternalLink size={14} />
                    Rute Lokasi
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatedSection>
  );
}
