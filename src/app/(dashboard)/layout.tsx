"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { UserProvider, useUser } from "@/contexts/UserContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import GlobalOrderNotifier from "@/components/dashboard/GlobalOrderNotifier";
import ShiftGate from "@/components/dashboard/ShiftGate";

// ── Loading spinner (raw SVG) ────────────────────────────────
const SvgLoader = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-spin text-neon-purple">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, profile, error, isCashier, shiftLoading, activeShift, openShift } = useUser();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !profile) {
      window.location.href = "/login";
    }
  }, [loading, profile]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <SvgLoader />
          <span className="text-sm text-slate-400 animate-pulse">Menghubungkan ke sistem...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <span className="text-sm text-slate-400">Mengalihkan ke login...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 font-semibold mb-2">Error</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Cashier must open a shift before accessing the dashboard
  if (isCashier && !shiftLoading && activeShift === null) {
    return <ShiftGate profile={profile} onOpen={openShift} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans">
      <DashboardSidebar isMobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader onMenuToggle={() => setMobileSidebarOpen(prev => !prev)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
      <GlobalOrderNotifier />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <DashboardShell>{children}</DashboardShell>
    </UserProvider>
  );
}
