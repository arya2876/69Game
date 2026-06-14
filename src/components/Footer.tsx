"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MessageCircle, Clock, Phone } from "lucide-react";
import { socialLinks } from "@/data/siteData";
import { createClient } from "@/lib/supabase/client";

interface BranchInfo {
  id: string;
  name: string;
  phone: string | null;
  operating_hours: string | null;
  address: string | null;
}

const WA_MESSAGE = encodeURIComponent("Halo 69Game! Saya ingin reservasi.");

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2 6.34 6.34 0 0 0 9.49 21.6a6.34 6.34 0 0 0 6.34-6.34V8.78a8.18 8.18 0 0 0 3.76.92V6.69Z" />
    </svg>
  );
}

export default function Footer() {
  const [branches, setBranches] = useState<BranchInfo[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("branches")
      .select("id, name, phone, operating_hours, address")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setBranches(data as BranchInfo[]);
      });
  }, []);

  // Primary branch for the WhatsApp button (first active branch with a phone)
  const primaryPhone = branches.find((b) => b.phone)?.phone ?? null;
  const whatsappUrl = primaryPhone
    ? `https://wa.me/${primaryPhone.replace(/\D/g, "")}?text=${WA_MESSAGE}`
    : null;

  return (
    <footer className="relative border-t border-white/5">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Column 1: Logo & Description */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-neon-purple/30">
                <Image src="/logo69.jpg" alt="69Game Logo" fill sizes="48px" className="object-cover" />
              </div>
              <span className="text-xl font-bold font-[family-name:var(--font-rajdhani)] tracking-wider neon-text">
                69Game
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs font-[family-name:var(--font-inter)]">
              Pusat hiburan dan gaming lounge premium di Semarang. Nikmati pengalaman gaming terbaik dengan fasilitas berkualitas tinggi.
            </p>
          </div>

          {/* Column 2: Operational Hours */}
          <div>
            <h4 className="text-base font-bold text-white font-[family-name:var(--font-rajdhani)] tracking-wider uppercase mb-5 flex items-center gap-2">
              <Clock size={16} className="text-neon-blue" />
              Jam Operasional
            </h4>

            {branches.length > 0 ? (
              <div className="space-y-4">
                {branches.map((branch) => (
                  <div key={branch.id}>
                    <p className="text-sm font-semibold text-slate-200 font-[family-name:var(--font-rajdhani)] tracking-wide mb-1">
                      {branch.name}
                    </p>
                    <p className="text-xs text-slate-400 font-[family-name:var(--font-inter)]">
                      {branch.operating_hours ?? "Lihat info cabang"}
                    </p>
                    {branch.address && (
                      <p className="text-xs text-slate-500 font-[family-name:var(--font-inter)] mt-0.5 leading-relaxed">
                        {branch.address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-4 bg-slate-800/60 rounded animate-pulse w-3/4" />
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Social & Contact */}
          <div>
            <h4 className="text-base font-bold text-white font-[family-name:var(--font-rajdhani)] tracking-wider uppercase mb-5 flex items-center gap-2">
              <Phone size={16} className="text-neon-purple" />
              Hubungi Kami
            </h4>

            <div className="space-y-3 mb-6">
              {socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group"
                >
                  <span className="p-2 rounded-lg glass group-hover:bg-white/10 transition-colors">
                    {link.platform === "Instagram" ? <InstagramIcon size={16} /> : <TikTokIcon size={16} />}
                  </span>
                  <span className="text-sm font-[family-name:var(--font-inter)]">{link.label}</span>
                </a>
              ))}
            </div>

            {/* WhatsApp buttons — one per branch with phone */}
            {branches.some((b) => b.phone) ? (
              <div className="flex flex-col gap-2">
                {branches.filter((b) => b.phone).map((b) => (
                  <a
                    key={b.id}
                    href={`https://wa.me/${b.phone!.replace(/\D/g, "")}?text=${WA_MESSAGE}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 hover:text-green-300 hover:shadow-[0_0_16px_rgba(34,197,94,0.2)] transition-all duration-300 text-xs font-semibold font-[family-name:var(--font-rajdhani)] tracking-wider uppercase"
                  >
                    <MessageCircle size={14} />
                    <span className="truncate">{b.name.replace(/69Game\s*[-–]?\s*/i, "")}</span>
                    <span className="text-green-600 font-normal normal-case tracking-normal">
                      {b.phone}
                    </span>
                  </a>
                ))}
              </div>
            ) : whatsappUrl === null ? (
              <div className="flex flex-col gap-2">
                {[1].map((i) => (
                  <div key={i} className="h-10 w-48 bg-slate-800/60 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 hover:text-green-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all duration-300 text-sm font-semibold font-[family-name:var(--font-rajdhani)] tracking-wider uppercase"
              >
                <MessageCircle size={16} />
                Chat WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-[family-name:var(--font-inter)]">
            &copy; {new Date().getFullYear()} 69Game Semarang. All rights reserved.
          </p>
          <p className="text-xs text-slate-600 font-[family-name:var(--font-inter)]">
            Built with ❤️ for gamers
          </p>
        </div>
      </div>
    </footer>
  );
}
