"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/data/siteData";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 sm:pt-5">
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`w-full max-w-5xl rounded-2xl transition-all duration-500 ${
            scrolled
              ? "glass-strong shadow-xl shadow-black/30"
              : "bg-white/[0.07] backdrop-blur-xl border border-white/[0.12]"
          }`}
        >
          <div className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6">
            {/* ── Left Side: Logo ──────────────────────── */}
            <a href="/" className="flex items-center gap-2.5 group shrink-0 md:w-[200px]">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-1 ring-white/20 group-hover:ring-neon-purple/60 transition-all duration-300">
                <Image
                  src="/logo69.jpg"
                  alt="69Game Logo"
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <span className="text-lg sm:text-xl font-bold font-[family-name:var(--font-rajdhani)] tracking-wider text-white">
                69Game
              </span>
            </a>

            {/* ── Center: Navigation Links ─────────────── */}
            <div className="hidden md:flex items-center justify-center gap-8 flex-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="relative text-[14px] font-medium text-slate-300 hover:text-white transition-colors duration-300 font-[family-name:var(--font-rajdhani)] tracking-wide uppercase group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-purple to-neon-blue rounded-full group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </div>

            {/* ── Right Side: Action Buttons ───────────── */}
            <div className="hidden lg:flex items-center justify-end gap-3 flex-1">

              <a
                href="/member/login"
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[13px] font-bold font-[family-name:var(--font-rajdhani)] tracking-wider uppercase hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-300"
              >
                Login Member
              </a>
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-xl btn-gradient text-[13px] tracking-wider uppercase shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                <span>Dashboard Kasir</span>
              </a>
            </div>

            {/* ── Mobile Menu Button ───────────────────── */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden relative z-50 p-2 text-slate-300 hover:text-white transition-colors ml-auto"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </motion.nav>
      </div>

      {/* ── Mobile Menu Overlay ────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-72 glass-strong bg-slate-900/95 backdrop-blur-xl flex flex-col pt-24 px-8"
            >
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="text-lg font-semibold text-slate-200 hover:text-neon-purple py-4 border-b border-white/10 font-[family-name:var(--font-rajdhani)] tracking-wider uppercase transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}

              <motion.a
                href="/member/login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-base font-bold font-[family-name:var(--font-rajdhani)] tracking-wider uppercase"
              >
                Login Member
              </motion.a>

              <motion.a
                href="/dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 py-3 rounded-xl btn-gradient text-center text-base font-[family-name:var(--font-rajdhani)] tracking-wider uppercase shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                <span>Dashboard Kasir</span>
              </motion.a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
