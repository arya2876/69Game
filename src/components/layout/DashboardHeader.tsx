"use client";

import { useUser } from "@/contexts/UserContext";
import { useState, useRef, useEffect } from "react";
import CloseShiftModal from "@/components/dashboard/CloseShiftModal";

// ── RAW SVG ICONS ───────────────────────────────────────────
const SvgSearch = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
const SvgBell = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>);
const SvgChevronDown = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="6 9 12 15 18 9" /></svg>);
const SvgBuilding = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></svg>);
const SvgCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12" /></svg>);

function useShiftDuration(openedAt: string | undefined) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!openedAt) return;
    const tick = () => {
      const ms = Date.now() - new Date(openedAt).getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(h > 0 ? `${h}j ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [openedAt]);
  return label;
}

export default function DashboardHeader() {
  const { profile, activeBranchId, setActiveBranchId, branches, canSwitchBranch, activeBranch, isCashier, activeShift, closeShift } = useUser();
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const shiftDuration = useShiftDuration(activeShift?.opened_at);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowBranchMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = profile
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <>
    <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-10 shrink-0">
      {/* Left: Search Bar */}
      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 w-64 sm:w-80 focus-within:border-neon-purple/50 transition-colors">
        <SvgSearch />
        <input
          type="text"
          placeholder="Cari transaksi, member..."
          className="bg-transparent border-none outline-none text-sm text-slate-200 ml-2 w-full placeholder:text-slate-500"
        />
      </div>

      {/* Right: Branch Switcher + Live Badge + Bell + Profile */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* ── BRANCH SWITCHER (Owner only) ──────────────────── */}
        {canSwitchBranch && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-neon-blue/50 transition-all group"
            >
              <span className="text-neon-blue"><SvgBuilding /></span>
              <span className="text-xs font-semibold text-white max-w-[120px] truncate">
                {activeBranch?.name || "Pilih Cabang"}
              </span>
              <span className={`text-slate-400 transition-transform ${showBranchMenu ? "rotate-180" : ""}`}>
                <SvgChevronDown />
              </span>
            </button>

            {/* Dropdown */}
            {showBranchMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ganti Cabang</p>
                </div>
                <div className="max-h-60 overflow-y-auto p-1.5">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setActiveBranchId(branch.id);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        activeBranchId === branch.id
                          ? "bg-neon-blue/10 border border-neon-blue/20"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        branch.is_active ? "bg-emerald-400" : "bg-red-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          activeBranchId === branch.id ? "text-neon-blue" : "text-white"
                        }`}>
                          {branch.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{branch.address || branch.slug}</p>
                      </div>
                      {activeBranchId === branch.id && (
                        <span className="text-neon-blue shrink-0"><SvgCheck /></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shift indicator + Tutup Shift (cashier only) */}
        {isCashier && activeShift && (
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-300">Shift {shiftDuration}</span>
            </div>
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all"
            >
              Tutup Shift
            </button>
          </div>
        )}

        {/* Live Badge (owner only) */}
        {!isCashier && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">Live</span>
          </div>
        )}

        {/* Notification Bell */}
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <SvgBell />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-slate-900" />
        </button>

        {/* Profile */}
        {profile && (
          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-white tracking-wide">
                {profile.full_name.toUpperCase()}
              </span>
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
                {profile.role}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(168,85,247,0.4)]">
              {initials}
            </div>
          </div>
        )}
      </div>
    </header>

    {/* Close Shift Modal */}
    {showCloseModal && activeShift && profile && (
      <CloseShiftModal
        shift={activeShift}
        cashierName={profile.full_name}
        onClose={() => setShowCloseModal(false)}
        onConfirm={closeShift}
      />
    )}
  </>
  );
}
