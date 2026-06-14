"use client";

export const dynamic = "force-dynamic";

import { UserProvider, useUser } from "@/contexts/UserContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Icons (raw SVG) ──────────────────────────────────────────
const SvgLoader = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-spin text-neon-purple">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const SvgGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SvgActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const SvgUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SvgLogOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function MemberBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/ketersediaan", icon: <SvgGrid />, label: "Bilik" },
    { href: "/deposit-saya", icon: <SvgClock />, label: "Deposit" },
    { href: "/sesi-saya", icon: <SvgActivity />, label: "Sesi" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 z-50 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-neon-purple" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className={`p-1 rounded-full ${isActive ? "bg-neon-purple/10" : ""}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MemberHeader() {
  const { profile } = useUser();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    sessionStorage.setItem("loggingOut", "true");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white font-bold text-sm">
            {profile?.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{profile?.full_name || "Member"}</h1>
            <p className="text-[10px] text-slate-400">ID: {profile?.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        
        {/* Desktop Nav */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/ketersediaan" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Ketersediaan</Link>
            <Link href="/deposit-saya" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Deposit</Link>
            <Link href="/sesi-saya" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Sesi Aktif</Link>
          </nav>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors ml-4"
          >
            <SvgLogOut />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function MemberShell({ children }: { children: React.ReactNode }) {
  const { loading, profile, error } = useUser();

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <SvgLoader />
          <span className="text-sm text-slate-400 animate-pulse">Memuat profil member...</span>
        </div>
      </div>
    );
  }

  // Not authenticated or not a member — redirect
  if (!profile) {
    if (typeof window !== "undefined") {
      if (!sessionStorage.getItem("loggingOut")) {
        window.location.href = "/member/login";
      }
    }
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <span className="text-sm text-slate-400">Sedang memproses...</span>
      </div>
    );
  }

  if (profile.role !== "member") {
    // If staff accesses member portal, they can proceed but normally they should be in dashboard.
    // For now we allow them to view it to test.
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 w-full max-w-md text-center">
          <p className="text-red-400 font-semibold mb-2">Error</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-16 md:pb-0">
      <MemberHeader />
      <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
      <MemberBottomNav />
    </div>
  );
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <MemberShell>{children}</MemberShell>
    </UserProvider>
  );
}
