"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  facilities,
  facilityCategories,
  type FacilityCategory,
} from "@/data/siteData";
import AnimatedSection from "./AnimatedSection";

export default function FacilitiesSection({ activeBranchId }: { activeBranchId: string | null }) {
  const [facilitiesData, setFacilitiesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [categories, setCategories] = useState<string[]>(["Semua"]);

  useEffect(() => {
    const fetchFacilities = async () => {
      if (!activeBranchId) {
        setFacilitiesData([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      try {
        const { data, error } = await supabase
          .from("facilities")
          .select("*")
          .eq("branch_id", activeBranchId)
          .order("category");

        if (error) throw error;
        
        if (data) {
          setFacilitiesData(data);
          const cats = Array.from(new Set(data.map(f => f.category)));
          setCategories(["Semua", ...cats]);
          // Reset category if not available in this branch
          setActiveCategory((prev) => cats.includes(prev) ? prev : "Semua");
        }
      } catch (err) {
        console.error("Failed to fetch facilities", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, [activeBranchId]);

  const filtered =
    activeCategory === "Semua"
      ? facilitiesData
      : facilitiesData.filter((f) => f.category === activeCategory);

  return (
    <AnimatedSection
      id="fasilitas"
      className="py-20 sm:py-28 px-4 sm:px-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* ── Section Header ──────────────────────────── */}
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs sm:text-sm font-semibold text-neon-blue uppercase tracking-[0.25em] font-[family-name:var(--font-rajdhani)]"
          >
            Apa Yang Kami Tawarkan
          </motion.span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-rajdhani)] section-heading">
            Fasilitas &amp; Layanan
          </h2>
          <p className="mt-6 text-slate-400 max-w-xl mx-auto font-[family-name:var(--font-inter)]">
            Temukan ruangan dan fasilitas gaming terbaik sesuai kebutuhanmu.
          </p>
        </div>

        {/* ── Filter Tabs ─────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all duration-300 font-[family-name:var(--font-rajdhani)] ${
                    activeCategory === cat
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200 glass hover:border-white/20"
                  }`}
                >
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-blue rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      style={{ boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)" }}
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              ))}
            </div>

            {/* ── Facility Cards Grid ─────────────────────── */}
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((facility) => (
                  <motion.div
                    key={facility.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35 }}
                    className="glass rounded-2xl overflow-hidden glow-card group"
                  >
                    {/* Image */}
                    <div className="relative h-44 sm:h-48 overflow-hidden">
                      <Image
                        src={facility.image_url || (() => {
                          switch(facility.category) {
                            case "PS5 VIP": return "/images/ps5-vip.png";
                            case "PS4": return "/images/ps4-room.png";
                            case "PS3": return "/images/ps3-room.png";
                            case "Racing": return "/images/racing-sim.png";
                            default: return "/images/ps4-room.png";
                          }
                        })()}
                        alt={facility.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />

                      {/* Category Badge */}
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-neon-purple to-neon-blue text-white font-[family-name:var(--font-rajdhani)]">
                        {facility.category}
                      </span>
                    </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white font-[family-name:var(--font-rajdhani)] mb-2">
                    {facility.name}
                  </h3>

                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 font-[family-name:var(--font-inter)]">
                    Rasakan sensasi bermain dengan fasilitas terbaik di kelasnya.
                  </p>

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-bold gradient-text font-[family-name:var(--font-rajdhani)]">
                      Rp {facility.price_per_hour.toLocaleString("id-ID")} / Jam
                    </span>
                    <a
                      href="/fasilitas"
                      className="text-xs px-3 py-1.5 rounded-full bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-colors font-semibold font-[family-name:var(--font-rajdhani)] tracking-wider uppercase"
                    >
                      Cek Ketersediaan
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
          </>
        )}
      </div>
    </AnimatedSection>
  );
}
