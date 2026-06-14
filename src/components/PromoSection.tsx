"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { promos } from "@/data/siteData";
import AnimatedSection from "./AnimatedSection";

export default function PromoSection({ activeBranchId }: { activeBranchId: string | null }) {
  const [dynamicPromos, setDynamicPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const fetchPromos = async () => {
      if (!activeBranchId) {
        setDynamicPromos([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from("broadcast_messages")
          .select("*")
          .eq("branch_id", activeBranchId)
          .not("brochure_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        setDynamicPromos(data || []);
      } catch (err) {
        console.error("Failed to fetch promos", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, [activeBranchId]);

  if (!loading && dynamicPromos.length === 0) {
    return null; // Hide section completely if no promos
  }

  const displayPromos = dynamicPromos.map(p => ({
    id: p.id,
    title: p.template_key ? p.template_key.replace(/_/g, ' ').toUpperCase() : "PROMO SPESIAL",
    description: p.message_body,
    image: p.brochure_url,
    badge: "NEW",
    validUntil: "TERBATAS"
  }));

  return (
    <AnimatedSection id="promo" className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* ── Section Header ──────────────────────────── */}
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs sm:text-sm font-semibold text-neon-purple uppercase tracking-[0.25em] font-[family-name:var(--font-rajdhani)]"
          >
            Jangan Lewatkan
          </motion.span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-rajdhani)] section-heading">
            Promo Terkini
          </h2>
          <p className="mt-6 text-slate-400 max-w-xl mx-auto font-[family-name:var(--font-inter)]">
            Dapatkan penawaran terbaik dan mainkan game favoritmu dengan harga
            spesial.
          </p>
        </div>

        {/* ── Scroll Buttons (Desktop) ────────────────── */}
        <div className="hidden md:flex justify-end gap-2 mb-6">
          <button
            onClick={() => handleScroll("left")}
            className="p-2.5 rounded-full glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => handleScroll("right")}
            className="p-2.5 rounded-full glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* ── Promo Cards — Horizontal Scroll ─────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-5 sm:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 md:grid md:grid-cols-3 md:overflow-visible"
          >
            {displayPromos.map((promo, idx) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className="flex-none w-[85vw] sm:w-[70vw] md:w-auto snap-center group"
              >
                <div className="relative rounded-2xl overflow-hidden h-full border-2 border-transparent bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900 hover:from-neon-purple/5 hover:to-neon-blue/5 transition-all duration-500" style={{ backgroundImage: "linear-gradient(#0F172A, #0F172A), linear-gradient(135deg, rgba(168,85,247,0.4), rgba(59,130,246,0.4))", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}>
                  {/* Image */}
                  <div className="relative h-48 sm:h-56 overflow-hidden">
                    <Image
                      src={promo.image}
                      alt={promo.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                    {/* Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue text-white text-xs font-bold font-[family-name:var(--font-rajdhani)] tracking-wider uppercase shadow-lg shadow-neon-purple/30">
                      <Sparkles size={12} />
                      {promo.badge}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-rajdhani)] mb-2 line-clamp-1">
                      {promo.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-3 leading-relaxed font-[family-name:var(--font-inter)]">
                      {promo.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neon-blue font-medium font-[family-name:var(--font-rajdhani)] tracking-wider uppercase">
                        {promo.validUntil}
                      </span>
                      <a
                        href="https://wa.me/6281234567890"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-gradient text-xs px-5 py-2 font-[family-name:var(--font-rajdhani)] tracking-wider uppercase"
                      >
                        <span>Klaim</span>
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatedSection>
  );
}
