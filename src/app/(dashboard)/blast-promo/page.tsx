"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/lib/supabase/client";











const SvgSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SvgWarning = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SvgImageUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SvgVerified = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400">
    <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm-2-6l6-6-1.41-1.41L10 13.17 7.41 10.59 6 12l4 4z" />
  </svg>
);

// ── TEMPLATES ───────────────────────────────────────────────
const templates = [
  {
    id: "promo-happy-hour",
    label: "Promo Happy Hour",
    text: "Halo Kak! 👋\nAda promo Happy Hour di 69Game khusus hari ini!\nDiskon 30% untuk main PS5 VIP dari jam 10.00 - 14.00.\nYuk langsung ke lokasi atau balas pesan ini untuk booking! 🎮🔥",
  },
  {
    id: "info-jam-sepi",
    label: "Info Jam Sepi",
    text: "Hai Gamers! 🕹️\nPS4 dan Racing Simulator saat ini kosong lho! Buat kamu yang mau main tanpa antre, ini waktu yang pas banget.\nLangsung datang ke 69Game sekarang ya! 🚀",
  },
  {
    id: "turnamen",
    label: "Turnamen",
    text: "🏆 TURNAMEN FIFA 26 @ 69Game! 🏆\nDaftarkan dirimu sekarang dan menangkan total hadiah Rp 2.000.000!\nSlot terbatas. Balas pesan ini dengan 'DAFTAR' untuk info lebih lanjut. ⚽🔥",
  },
  {
    id: "kustom",
    label: "Kustom",
    text: "",
  },
];

const SvgMegaphone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const SvgCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// ── MAIN PAGE COMPONENT ─────────────────────────────────────

export default function BlastPromoPage() {
  const { profile } = useUser();

  const [message, setMessage] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateClick = (id: string, text: string) => {
    setActiveTemplate(id);
    if (text) setMessage(text);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setImageFile(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const supabase = createClient();

  const handleSend = async () => {
    if ((!message.trim() && !imagePreview) || isLoading) return;
    setIsLoading(true);
    
    try {
      let finalBrochureUrl = null;
      
      // Upload image to Supabase if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `${profile?.branch_id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("brochures")
          .upload(filePath, imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("brochures")
          .getPublicUrl(filePath);
          
        finalBrochureUrl = publicUrl;
      }
      
      // Send broadcast API call
      const res = await fetch("/api/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_body: message,
          brochure_url: finalBrochureUrl,
          template_key: activeTemplate
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim broadcast");
      
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      
      // Reset form
      setMessage("");
      removeImage();
      setActiveTemplate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white tracking-wide">
          <span className="p-2 bg-neon-purple/20 text-neon-purple rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <SvgMegaphone />
          </span>
          Broadcast Center
        </h1>
        <p className="text-sm text-slate-400 mt-2">Kirim promo, brosur, atau jadwalkan pesan massal ke member.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── COLUMN 1: COMPOSER ───────────────────────── */}
        <div className="space-y-6">

          {/* Template Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Template Pesan</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateClick(tpl.id, tpl.text)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${
                    activeTemplate === tpl.id
                      ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600"
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Editor */}
          <div className="space-y-2">
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ketik caption atau pesan broadcast di sini..." className="w-full h-32 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-neon-purple/60 transition-all resize-none" />
            <div className="flex items-center justify-end text-xs font-mono text-slate-500">{message.length} karakter</div>
          </div>

          {/* Brochure Uploader */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Brosur / Gambar (Opsional)</label>
            {imagePreview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-700 group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                <button onClick={removeImage} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="bg-red-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500 backdrop-blur-md">
                    Hapus Gambar
                  </span>
                </button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-slate-700 hover:border-neon-purple/60 bg-slate-900/40 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-neon-purple group-hover:bg-neon-purple/10 transition-colors mb-3">
                  <SvgImageUpload />
                </div>
                <p className="text-sm font-semibold text-slate-300">Klik untuk upload gambar</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, max 5MB</p>
              </div>
            )}
          </div>

          {/* Scheduling Widget */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4">
            <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 mb-4">
              <button
                onClick={() => setScheduleType("now")}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${
                  scheduleType === "now" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Kirim Sekarang
              </button>
              <button
                onClick={() => setScheduleType("later")}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${
                  scheduleType === "later" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Jadwalkan Pesan
              </button>
            </div>

            <AnimatePresence>
              {scheduleType === "later" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5"><SvgCalendar /> Tanggal</label>
                      <input 
                        type="date" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-purple/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5"><SvgClock /> Waktu</label>
                      <input 
                        type="time" 
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-purple/50"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Button */}
          <button onClick={handleSend} disabled={(!message.trim() && !imagePreview) || isLoading} className={`relative w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 ${(!message.trim() && !imagePreview) || isLoading ? "bg-slate-800 text-slate-600 cursor-not-allowed" : isSuccess ? "bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]" : "bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-[1.01] active:scale-[0.99]"}`}>
            {isLoading ? (<><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Memproses...</>) : isSuccess ? (<><SvgVerified /> Broadcast Terkirim!</>) : (<><SvgSend /> {scheduleType === "later" ? "Jadwalkan Broadcast" : "Kirim Broadcast Sekarang"}</>)}
          </button>
        </div>

        {/* ── COLUMN 2: LIVE PREVIEW ──────────────────── */}
        <div className="flex flex-col items-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Live Preview</p>
          <div className="w-72 bg-gradient-to-b from-slate-800 to-slate-900 rounded-[2rem] p-3 border border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="bg-emerald-800 rounded-[1.4rem] overflow-hidden">
              <div className="bg-emerald-900 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-xs font-bold">69</div>
                <div><p className="text-sm font-semibold text-white">69Game Official</p><p className="text-[10px] text-emerald-300 flex items-center gap-1"><SvgVerified /> Business Account</p></div>
              </div>
              <div className="p-3 min-h-[280px] flex flex-col justify-end gap-2">
                {(message || imagePreview) && (
                  <div className="self-start max-w-[85%]">
                    <div className="bg-white rounded-xl rounded-tl-none shadow-lg overflow-hidden">
                      {imagePreview && <img src={imagePreview} alt="Brosur" className="w-full h-28 object-cover" />}
                      {message && <p className="text-xs text-slate-800 p-3 whitespace-pre-wrap leading-relaxed">{message}</p>}
                      <div className="text-right px-3 pb-1.5"><span className="text-[9px] text-slate-400">{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
