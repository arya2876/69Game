"use client";

import { useState, useEffect } from "react";
import { useRealtimeFacilities } from "@/lib/hooks/useRealtimeFacilities";
import { createClient } from "@/lib/supabase/client";

// ── Icons ────────────────────────────────────────────────────
const SvgLocation = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SvgTv = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17 2 12 7 7 2" />
  </svg>
);

interface Branch {
  id: string;
  name: string;
}

export default function KetersediaanPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const supabase = createClient();

  // Fetch all active branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase
          .from("branches")
          .select("id, name")
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
        
        setBranches(sortedBranches);
        if (sortedBranches.length > 0) {
          setSelectedBranchId(sortedBranches[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, [supabase]);

  // Use the realtime hook for the selected branch
  const { facilities, loading: facilitiesLoading } = useRealtimeFacilities(selectedBranchId);

  if (branchesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Memuat cabang...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Branch Selector */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4 md:p-6">
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <SvgLocation /> Pilih Cabang 69Game
        </label>
        <div className="relative">
          <select
            value={selectedBranchId || ""}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm font-bold text-white appearance-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            ▼
          </div>
        </div>
      </div>

      {/* Facilities Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <SvgTv />
          Ketersediaan Bilik
        </h2>

        {facilitiesLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
            <div className="w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Memuat status bilik...</p>
          </div>
        ) : facilities.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm">Belum ada bilik di cabang ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((fac) => {
              const statusStyles = {
                available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
                active: "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
                waiting_next: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                maintenance: "bg-slate-800 text-slate-400 border-slate-700",
              };
              
              const statusLabels = {
                available: "Tersedia",
                active: "Sedang Main",
                waiting_next: "Menunggu Lanjut",
                maintenance: "Perbaikan"
              };

              return (
                <div key={fac.id} className="relative bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden group">
                  <div className="aspect-[4/3] bg-slate-950 relative">
                    <img 
                      src={fac.image_url || (() => {
                        switch(fac.category) {
                          case "PS5 VIP": return "/images/ps5-vip.png";
                          case "PS4": return "/images/ps4-room.png";
                          case "PS3": return "/images/ps3-room.png";
                          case "Racing": return "/images/racing-sim.png";
                          default: return "/images/ps4-room.png";
                        }
                      })()} 
                      alt={fac.name} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-neon-purple uppercase tracking-wider mb-1">{fac.category}</p>
                        <h3 className="text-base font-bold text-white leading-tight">{fac.name}</h3>
                        <p className="text-xs font-mono text-slate-400 mt-1">Rp {fac.price_per_hour.toLocaleString("id-ID")}/jam</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`absolute top-4 right-4 px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${statusStyles[fac.status as keyof typeof statusStyles] || statusStyles.maintenance}`}>
                    {statusLabels[fac.status as keyof typeof statusLabels] || fac.status}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
