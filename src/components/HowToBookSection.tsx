"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

// ── SVG ICONS ───────────────────────────────────────────────
const SvgSmartphone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);
const SvgStore = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const SvgUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const SvgChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const SvgStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-400">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ── STEP BADGE ───────────────────────────────────────────────
const Step = ({ n, color }: { n: number; color: string }) => (
  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${color}`}>
    {n}
  </span>
);

// ── FAQ ACCORDION ─────────────────────────────────────────────
const faqs = [
  {
    q: "Apakah harus daftar akun member untuk bisa booking?",
    a: "Tidak wajib. Kamu bisa booking langsung di kasir sebagai Walk-in tanpa akun. Namun dengan akun member, kamu bisa cek ketersediaan real-time dari mana saja, lihat riwayat sesi, dan menikmati fitur Time Bank (sisa waktu tersimpan otomatis).",
  },
  {
    q: "Berapa lama sisa waktu tersimpan di Time Bank?",
    a: "Sisa waktu yang berhasil masuk ke Time Bank tidak kedaluwarsa. Kamu bisa menggunakannya kapan saja saat sesi berikutnya, selama akun member masih aktif.",
  },
  {
    q: "Bagaimana cara menggunakan deposit waktu yang tersimpan?",
    a: "Saat booking sesi baru, beritahu kasir bahwa kamu ingin menggunakan deposit waktu. Kasir akan memeriksa saldo deposit-mu di sistem dan menguranginya dari total durasi yang kamu pilih. Kamu cukup bayar untuk kelebihan durasi (jika ada).",
  },
  {
    q: "Bisa pesan lebih dari satu ruangan sekaligus?",
    a: "Bisa! Pemesanan bisa dilakukan per ruangan. Hubungi kasir untuk pemesanan grup (2 ruangan atau lebih secara bersamaan) agar bisa diatur sesuai kebutuhan.",
  },
  {
    q: "Bagaimana kalau ruangan yang saya pesan ternyata sudah dipakai orang lain?",
    a: "Sistem kami mencegah booking ganda secara otomatis (overlap prevention). Jika ruangan sudah dipesan di jam yang sama, tombol konfirmasi akan dinonaktifkan dan kamu akan diminta memilih waktu lain atau ruangan berbeda.",
  },
  {
    q: "Metode pembayaran apa saja yang diterima?",
    a: "Kami menerima QRIS (scan dari semua dompet digital), Transfer Bank, dan Tunai (Cash). Semua metode tersedia di kasir.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-slate-900/40 hover:bg-slate-900/70 transition-colors"
      >
        <span className="text-sm font-semibold text-white leading-snug">{q}</span>
        <span className={`shrink-0 transition-transform duration-300 text-slate-400 ${open ? "rotate-180" : ""}`}>
          <SvgChevronDown />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 py-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 bg-slate-950/30">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── GUIDE CARDS DATA ─────────────────────────────────────────
const guides = [
  {
    id: "online",
    icon: <SvgSmartphone />,
    badge: "Direkomendasikan",
    badgeColor: "bg-neon-purple/20 text-neon-purple border-neon-purple/30",
    title: "Booking Online",
    accent: "neon-purple",
    gradientFrom: "from-neon-purple",
    gradientTo: "to-neon-blue",
    glowColor: "group-hover:bg-neon-purple/20",
    borderHover: "hover:border-neon-purple/40",
    steps: [
      { n: 1, text: <>Buka menu <span className="font-bold text-white">Cek Ketersediaan</span> di Navbar atas.</>, color: "bg-neon-purple/20 text-neon-purple" },
      { n: 2, text: <>Grid real-time menampilkan status setiap ruangan: <span className="text-emerald-400 font-bold">Tersedia</span>, <span className="text-amber-400 font-bold">Aktif</span>, atau <span className="text-red-400 font-bold">Menunggu</span>.</>, color: "bg-neon-purple/20 text-neon-purple" },
      { n: 3, text: <>Klik ruangan yang tersedia, pilih <span className="font-bold text-white">durasi bermain</span>, dan terapkan deposit waktu jika ada.</>, color: "bg-neon-purple/20 text-neon-purple" },
      { n: 4, text: <>Konfirmasi booking — kasir akan menyiapkan ruangan untukmu. Datang sesuai waktu yang dipilih!</>, color: "bg-neon-purple/20 text-neon-purple" },
    ],
    cta: { href: "/member/login", label: "Login & Cek Ketersediaan" },
  },
  {
    id: "register",
    icon: <SvgUser />,
    badge: "Gratis & Cepat",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    title: "Daftar & Login Member",
    accent: "neon-blue",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-neon-blue",
    glowColor: "group-hover:bg-neon-blue/20",
    borderHover: "hover:border-neon-blue/40",
    steps: [
      { n: 1, text: <>Klik <span className="font-bold text-white">Daftar Member</span> di Navbar atau minta kasir mendaftarkan kamu langsung di tempat.</>, color: "bg-neon-blue/20 text-neon-blue" },
      { n: 2, text: <>Isi <span className="font-bold text-white">Nama, No. WhatsApp, Username</span>, dan buat <span className="font-bold text-white">Password</span>. Selesai dalam 30 detik!</>, color: "bg-neon-blue/20 text-neon-blue" },
      { n: 3, text: <>Untuk login, buka <span className="font-bold text-white">Login Member</span> dan masukkan Username + Password yang sudah dibuat.</>, color: "bg-neon-blue/20 text-neon-blue" },
      { n: 4, text: <>Kamu akan diarahkan ke portal member: cek sesi aktif, lihat riwayat, dan pantau saldo deposit waktu.</>, color: "bg-neon-blue/20 text-neon-blue" },
    ],
    cta: { href: "/member/register", label: "Daftar Sekarang — Gratis" },
  },
  {
    id: "walkin",
    icon: <SvgStore />,
    badge: "Tanpa Akun",
    badgeColor: "bg-slate-700/60 text-slate-300 border-slate-600/50",
    title: "Walk-in (Di Tempat)",
    accent: "slate",
    gradientFrom: "from-slate-600",
    gradientTo: "to-slate-500",
    glowColor: "group-hover:bg-white/5",
    borderHover: "hover:border-white/20",
    steps: [
      { n: 1, text: <>Datang langsung ke cabang 69Game terdekat dan hampiri meja kasir.</>, color: "bg-white/10 text-slate-400" },
      { n: 2, text: <>Sebutkan nama dan nomor WhatsApp. Kasir akan membuatkan atau memverifikasi akun member-mu.</>, color: "bg-white/10 text-slate-400" },
      { n: 3, text: <>Kasir mengecek ketersediaan di sistem, mengatur durasi, dan menyiapkan <span className="font-bold text-white">QRIS</span> atau metode bayar lain.</>, color: "bg-white/10 text-slate-400" },
      { n: 4, text: <>Bayar, langsung main! Sisa waktu otomatis masuk ke Time Bank jika kamu pulang lebih awal.</>, color: "bg-white/10 text-slate-400" },
    ],
    cta: null,
  },
];

// ── TIME BANK HIGHLIGHT ──────────────────────────────────────
function TimeBankBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative rounded-3xl overflow-hidden border border-emerald-500/20 bg-emerald-500/5 p-8 sm:p-10"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-neon-blue/10 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <SvgClock />
        </div>

        {/* Text */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em]">Fitur Eksklusif</span>
            <span className="flex items-center gap-0.5"><SvgStar /><SvgStar /><SvgStar /></span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-rajdhani)] mb-3">
            Time Bank — Simpan Sisa Waktu Main
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
            Pulang lebih awal? Tidak ada yang terbuang! Sistem kami secara otomatis menghitung sisa menit bermain
            dan menyimpannya ke akun member-mu sebagai <span className="font-bold text-emerald-400">Deposit Waktu</span>.
            Saldo ini bisa dipakai kapan saja di sesi berikutnya — tidak ada kedaluwarsa, tidak ada kerugian.
          </p>

          {/* How it works */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: "1", label: "Booking 2 jam, tapi pulang 30 menit lebih awal" },
              { step: "2", label: "Kasir tekan \"Akhiri Sesi\" — 30 menit otomatis dikreditkan" },
              { step: "3", label: "Saldo tersimpan di akunmu, gunakan di kunjungan berikutnya" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── MAIN EXPORT ──────────────────────────────────────────────
export default function HowToBookSection() {
  return (
    <AnimatedSection id="how-to-book" className="py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-neon-purple/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-16">

        {/* ── Section Header ───────────────────────────────── */}
        <div className="text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs sm:text-sm font-semibold text-neon-blue uppercase tracking-[0.25em] font-[family-name:var(--font-rajdhani)]"
          >
            Panduan Lengkap
          </motion.span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-rajdhani)] section-heading">
            Semua yang Perlu Kamu Tahu
          </h2>
          <p className="mt-5 text-slate-400 max-w-2xl mx-auto font-[family-name:var(--font-inter)] leading-relaxed">
            Dari cara booking, daftar akun member, sampai fitur Time Bank — semua dijelaskan langkah demi langkah di bawah ini.
          </p>
        </div>

        {/* ── 3 Guide Cards ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {guides.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className={`glass-strong rounded-3xl p-7 sm:p-8 relative overflow-hidden group flex flex-col ${g.borderHover} transition-all duration-500`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-neon-purple/10 rounded-bl-full blur-2xl transition-all duration-500 ${g.glowColor}`} />

              {/* Badge */}
              <span className={`inline-flex self-start mb-5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${g.badgeColor}`}>
                {g.badge}
              </span>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.gradientFrom} ${g.gradientTo} flex items-center justify-center text-white mb-5 shadow-lg`}>
                {g.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white font-[family-name:var(--font-rajdhani)] mb-5">
                {g.title}
              </h3>

              {/* Steps */}
              <ul className="space-y-3.5 flex-1">
                {g.steps.map((s) => (
                  <li key={s.n} className="flex items-start gap-3">
                    <Step n={s.n} color={s.color} />
                    <p className="text-sm text-slate-300 font-[family-name:var(--font-inter)] leading-relaxed">
                      {s.text}
                    </p>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {g.cta && (
                <a
                  href={g.cta.href}
                  className="mt-7 inline-flex items-center justify-center w-full py-3.5 rounded-xl btn-gradient text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
                >
                  {g.cta.label}
                </a>
              )}
              {!g.cta && (
                <div className="mt-7 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 text-xs font-semibold">
                  Langsung datang ke cabang kami
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Time Bank Banner ─────────────────────────────── */}
        <TimeBankBanner />

        {/* ── FAQ ──────────────────────────────────────────── */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="text-xs font-semibold text-neon-purple uppercase tracking-[0.25em] font-[family-name:var(--font-rajdhani)]">
              Pertanyaan Umum
            </span>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-rajdhani)]">
              FAQ
            </h3>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <FaqItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </AnimatedSection>
  );
}
