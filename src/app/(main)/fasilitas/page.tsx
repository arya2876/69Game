"use client";

import { useState, useEffect } from "react";
import { useRealtimeFacilities } from "@/lib/hooks/useRealtimeFacilities";
import { useRealtimeBookings } from "@/lib/hooks/useRealtimeBookings";
import { createClient } from "@/lib/supabase/client";
import type { Facility, Booking } from "@/lib/types/database";

// ── RAW SVG ICONS ───────────────────────────────────────────
const SvgGamepad = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="6" y1="12" x2="10" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="15" y1="13" x2="15.01" y2="13" />
    <line x1="18" y1="11" x2="18.01" y2="11" />
    <rect x="2" y="6" width="20" height="12" rx="2" />
  </svg>
);

const SvgRacing = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="8" />
    <line x1="12" y1="16" x2="12" y2="22" />
    <line x1="2" y1="12" x2="8" y2="12" />
    <line x1="16" y1="12" x2="22" y2="12" />
  </svg>
);

const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SvgStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SvgWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const SvgX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SvgMapPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// ── GAME CATALOG & FACILITY PERKS ───────────────────────────
const GAME_CATALOG: Record<string, string[]> = {
  "PS5 VIP": [
    "EA FC 25", "Spider-Man 2", "God of War Ragnarök", "Tekken 8",
    "Mortal Kombat 1", "Elden Ring", "NBA 2K25", "GTA V Enhanced",
    "Hogwarts Legacy", "RE 4 Remake", "Horizon Forbidden West",
    "Call of Duty MW3", "Gran Turismo 7", "Astro's Playroom",
    "The Last of Us Part I", "Demon's Souls",
  ],
  "PS4": [
    "EA FC 23", "PES 2021", "GTA V", "NBA 2K24", "WWE 2K24",
    "Tekken 7", "Mortal Kombat 11", "Marvel's Spider-Man",
    "God of War", "Naruto Storm 4", "Dragon Ball FighterZ",
    "Need for Speed Payback", "Uncharted 4", "The Last of Us",
    "Bloodborne", "Dark Souls III",
  ],
  "PS3": [
    "PES 2017", "FIFA 16", "Naruto Shippuden UNS 3",
    "WWE 2K15", "Tekken 6", "NBA 2K16",
    "Dragon Ball Z", "GTA V", "Mortal Kombat 9",
    "One Piece Pirate Warriors", "Winning Eleven 2014",
    "Naruto Ultimate Ninja Storm 2",
  ],
  "Racing": [
    "Gran Turismo 7", "Need for Speed Heat", "F1 2023",
    "Project CARS 3", "Assetto Corsa", "DiRT Rally 2.0",
    "Burnout Paradise Remastered", "WRC Generations",
    "Dirt 5", "NASCAR Heat 5",
  ],
};

const FACILITY_PERKS: Record<string, string[]> = {
  "PS5 VIP": [
    "PlayStation 5 Console",
    "DualSense Haptic Controller",
    'TV 55" 4K HDR',
    "Headset Gaming Premium",
    "Bilik VIP Privat ber-AC",
    "Kursi Gaming Ergonomis",
  ],
  "PS4": [
    "PlayStation 4 Pro Console",
    "2× DualShock 4 Controller",
    'TV 43" Full HD',
    "Bilik ber-AC",
    "Kursi Gaming",
  ],
  "PS3": [
    "PlayStation 3 Slim Console",
    "2× Controller",
    'TV 32" HD',
    "Bilik ber-AC",
  ],
  "Racing": [
    "Racing Cockpit Simulator",
    "Steering Wheel + Pedal Set",
    "Monitor Ultrawide",
    "Bilik ber-AC",
    "Kursi Racing",
  ],
};

function getFallbackImage(category: string): string {
  switch (category) {
    case "PS5 VIP": return "/images/ps5-vip.png";
    case "PS4": return "/images/ps4-room.png";
    case "PS3": return "/images/ps3-room.png";
    case "Racing": return "/images/racing-sim.png";
    default: return "/images/ps4-room.png";
  }
}

// ── COUNTDOWN FORMATTER ─────────────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── FACILITY CARD COMPONENT ─────────────────────────────────
function FacilityCard({
  facility,
  activeBooking,
  now,
  onBook,
}: {
  facility: Facility;
  activeBooking?: Booking;
  now: number;
  onBook: (f: Facility) => void;
}) {
  const isActive = facility.status === "active";

  const IconComponent = facility.category === "Racing" ? SvgRacing : SvgGamepad;

  const fallbackImage = getFallbackImage(facility.category);

  const statusLabels = {
    available: "Tersedia",
    active: "Sedang Main",
    waiting_next: "Menunggu Lanjut",
    maintenance: "Perbaikan"
  };

  return (
    <div className="group bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-neon-purple/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] hover:-translate-y-1">
      {/* Card Image Area */}
      <div className="relative h-48 bg-gradient-to-br from-slate-800/80 to-slate-900/80 flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500"
          style={{ backgroundImage: `url(${facility.image_url || fallbackImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        
        <div className={`relative z-10 ${isActive ? "text-slate-400" : "text-white"} transition-colors duration-500`}>
          <IconComponent className="w-16 h-16 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/20 backdrop-blur-sm drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Sedang Digunakan
            </span>
          ) : facility.status === "available" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 backdrop-blur-sm drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Tersedia
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/15 text-slate-400 border border-slate-500/20 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {statusLabels[facility.status as keyof typeof statusLabels] || facility.status}
            </span>
          )}
        </div>

        {/* Category badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
            {facility.category}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        <h3 className="font-bold text-white text-base mb-1">{facility.name}</h3>
        <p className="text-sm font-semibold text-neon-purple mb-4">
          Rp {facility.price_per_hour.toLocaleString("id-ID")} <span className="text-slate-500 font-normal">/ Jam</span>
        </p>

        {/* Status / Action */}
        {isActive ? (
          <div>
            <div className={`rounded-lg p-3 mb-3 text-center border ${facility.active_booking_end_time ? "bg-red-500/10 border-red-500/20" : "bg-slate-800/50 border-slate-700/50"}`}>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-0.5">Sisa Waktu</span>
              <span className={`text-xl font-bold font-mono tracking-wider ${facility.active_booking_end_time ? "text-red-400" : "text-slate-300"}`}>
                {facility.active_booking_end_time ? formatCountdown(new Date(facility.active_booking_end_time).getTime() - now) : "Sedang Dimainkan"}
              </span>
            </div>
            <button disabled className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50">
              Menunggu Kosong...
            </button>
          </div>
        ) : facility.status === "available" ? (
          <button
            onClick={() => onBook(facility)}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Booking Sekarang
          </button>
        ) : (
          <button disabled className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50">
            Tidak Tersedia
          </button>
        )}
      </div>
    </div>
  );
}

// ── BOOKING MODAL COMPONENT ─────────────────────────────────
function BookingModal({
  facility,
  branchPhone,
  onClose,
}: {
  facility: Facility;
  branchPhone?: string | null;
  onClose: () => void;
}) {
  const [duration, setDuration] = useState<number | null>(null);

  const total = duration ? duration * facility.price_per_hour : 0;
  // Prefer DB data; fall back to hardcoded catalog if not yet configured
  const games = (facility.games && facility.games.length > 0) ? facility.games : (GAME_CATALOG[facility.category] || []);
  const perks = (facility.perks && facility.perks.length > 0) ? facility.perks : (FACILITY_PERKS[facility.category] || []);
  const imageSrc = facility.image_url || getFallbackImage(facility.category);

  const phone = branchPhone ? branchPhone.replace(/\D/g, "") : "6281234567890";
  const waMessage = `Halo 69Game! Saya ingin booking:\n\n📌 Fasilitas: ${facility.name}\n⏱ Durasi: ${duration} Jam\n💰 Total: Rp ${total.toLocaleString("id-ID")}\n\nMohon konfirmasi ketersediaan. Terima kasih!`;
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-lg shadow-[0_0_60px_rgba(168,85,247,0.2)] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Hero Image ───────────────────────────────── */}
        <div className="relative h-36 rounded-t-2xl overflow-hidden flex-shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageSrc})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-black/30" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 text-white/70 hover:text-white bg-black/40 backdrop-blur-md rounded-full p-1.5 transition-colors"
          >
            <SvgX />
          </button>

          <div className="absolute top-3 left-3 z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-neon-purple/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-neon-purple/30">
              Booking Online
            </span>
          </div>

          <div className="absolute bottom-4 left-5 right-5 z-10">
            <h2 className="text-xl font-extrabold text-white leading-tight">{facility.name}</h2>
            <p className="text-sm font-semibold text-neon-purple mt-0.5">
              Rp {facility.price_per_hour.toLocaleString("id-ID")}
              <span className="text-slate-400 font-normal"> / Jam</span>
            </p>
          </div>
        </div>

        {/* ── Scrollable Body ──────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Yang Kamu Dapat */}
          {perks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Yang Kamu Dapat</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-neon-purple/15 border border-neon-purple/30 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-neon-purple">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {perk}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daftar Game */}
          {games.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daftar Game</p>
                <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {games.length} judul
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {games.map((game) => (
                  <span
                    key={game}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:border-neon-blue/30 hover:text-white transition-colors cursor-default"
                  >
                    {game}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">*Daftar game dapat berubah sewaktu-waktu</p>
            </div>
          )}

          <div className="border-t border-white/8" />

          {/* Pilih Durasi */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block">Pilih Durasi</label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((hr) => (
                <button
                  key={hr}
                  onClick={() => setDuration(hr)}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all duration-300 ${
                    duration === hr
                      ? "bg-neon-purple/20 text-neon-purple border-neon-purple/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                      : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {hr} Jam
                </button>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          {duration && (
            <div className="p-4 bg-neon-purple/5 border border-neon-purple/20 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{facility.name}</span>
                <span>Rp {facility.price_per_hour.toLocaleString("id-ID")} × {duration} Jam</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">Total Pembayaran</span>
                <span className="text-2xl font-extrabold text-white">
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Fixed Footer ─────────────────────────────── */}
        <div className="p-5 pt-3 flex-shrink-0 border-t border-white/8">
          <a
            href={duration ? waUrl : "#"}
            target={duration ? "_blank" : undefined}
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
              duration
                ? "bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                : "bg-slate-800 text-slate-600 cursor-not-allowed pointer-events-none"
            }`}
          >
            <SvgWhatsApp />
            {duration
              ? `Booking via WhatsApp — ${duration} Jam`
              : "Pilih durasi terlebih dahulu"}
          </a>
          <p className="text-[10px] text-slate-500 text-center mt-2.5">
            Pembayaran dilakukan langsung di tempat saat tiba. Konfirmasi via WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────
export default function FasilitasPage() {
  const [now, setNow] = useState(0);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeBranchPhone, setActiveBranchPhone] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [bookingFacility, setBookingFacility] = useState<Facility | null>(null);

  const [branches, setBranches] = useState<{id: string, name: string, phone: string | null}[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const supabase = createClient();

  // Live ticker
  useEffect(() => {
    const firstTick = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(firstTick);
      clearInterval(timer);
    };
  }, []);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase
          .from("branches")
          .select("id, name, phone")
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
        
        setBranches(sortedBranches as { id: string; name: string; phone: string | null }[]);
        if (sortedBranches.length > 0) {
          setActiveBranchId(sortedBranches[0].id);
          setActiveBranchPhone((sortedBranches[0] as { phone?: string | null }).phone ?? null);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setBranchesLoading(false);
      }
    };
    fetchBranches();
  }, [supabase]);

  // Fetch real-time facilities for the selected branch
  const { facilities, loading: facilitiesLoading } = useRealtimeFacilities(activeBranchId);
  const { bookings } = useRealtimeBookings(activeBranchId, ["active"]);

  // Filter
  const filtered = facilities.filter((f) => {
    if (activeCategory !== "Semua" && f.category !== activeCategory) return false;
    return true;
  });

  const availableCount = facilities.filter((f) => f.status === "available").length;
  const activeCount = facilities.filter((f) => f.status === "active").length;
  
  const categories = ["Semua", ...Array.from(new Set(facilities.map((f) => f.category)))];

  if (branchesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <section className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* ── PAGE HEADER ──────────────────────────────────── */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-[family-name:var(--font-rajdhani)] tracking-tight">
              Pilih Ruangan &amp;{" "}
              <span className="bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                Fasilitas
              </span>
            </h1>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Cek ketersediaan bilik secara real-time. Booking langsung tanpa ribet.
            </p>
          </div>

          {/* ── BRANCH TABS ──────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => { setActiveBranchId(branch.id); setActiveBranchPhone(branch.phone ?? null); setActiveCategory("Semua"); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border ${
                    activeBranchId === branch.id
                      ? "bg-neon-purple/15 text-neon-purple border-neon-purple/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                      : "bg-slate-900/40 text-slate-400 border-white/5 hover:border-white/15 hover:text-white"
                  }`}
                >
                  <SvgMapPin />
                  {branch.name}
                </button>
              ))}
            </div>

            {/* Summary badges */}
            {!facilitiesLoading && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {availableCount} Tersedia
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {activeCount} Aktif
                </span>
              </div>
            )}
          </div>

          {/* ── CATEGORY FILTER ──────────────────────────────── */}
          {!facilitiesLoading && facilities.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border ${
                    activeCategory === cat
                      ? "bg-white/10 text-white border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.08)]"
                      : "bg-transparent text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10"
                  }`}
                >
                  {cat === "Semua" && <SvgStar />}
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ── FACILITY GRID ────────────────────────────────── */}
          {facilitiesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-sm">Tidak ada fasilitas ditemukan di cabang ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((facility) => (
                <FacilityCard
                  key={facility.id}
                  facility={facility}
                  activeBooking={bookings.find(b => b.facility_id === facility.id && b.status === "active")}
                  now={now}
                  onBook={setBookingFacility}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── BOOKING MODAL ────────────────────────────────────── */}
      {bookingFacility && (
        <BookingModal
          facility={bookingFacility}
          branchPhone={activeBranchPhone}
          onClose={() => setBookingFacility(null)}
        />
      )}
    </>
  );
}
