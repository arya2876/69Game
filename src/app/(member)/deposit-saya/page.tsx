"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/lib/supabase/client";

// ── Icons ────────────────────────────────────────────────────
const SvgClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SvgArrowUpRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-400">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const SvgArrowDownRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400">
    <line x1="7" y1="7" x2="17" y2="17" />
    <polyline points="17 7 17 17 7 17" />
  </svg>
);

interface DepositLedger {
  id: string;
  minutes: number;
  type: "credit" | "debit";
  notes: string;
  facility_category: string;
  created_at: string;
}

interface BalanceItem {
  facility_category: string;
  balance_minutes: number;
}

export default function DepositSayaPage() {
  const { profile } = useUser();
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [ledger, setLedger] = useState<DepositLedger[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;

    const fetchDepositData = async () => {
      try {
        setLoading(true);

        // Fetch balances per category
        const { data: balanceData } = await supabase
          .from("member_deposit_balances")
          .select("facility_category, balance_minutes")
          .eq("member_id", profile.id);

        if (balanceData) {
          setBalances(balanceData);
        }

        // Fetch ledger history
        const { data: ledgerData } = await supabase
          .from("time_deposits")
          .select("id, minutes, type, notes, facility_category, created_at")
          .eq("member_id", profile.id)
          .order("created_at", { ascending: false });

        setLedger(ledgerData || []);

      } catch (err) {
        console.error("Failed to fetch deposit data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepositData();

    // Subscribe to time_deposits changes for live updates
    const channel = supabase
      .channel("my-deposits")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "time_deposits",
        filter: `member_id=eq.${profile.id}`
      }, () => {
        fetchDepositData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Memuat data dompet waktu...</p>
      </div>
    );
  }

  // Calculate total across all wallets for header
  const totalMinutes = balances.reduce((sum, item) => sum + (item.balance_minutes || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Summary */}
      <div className="bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border border-neon-purple/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-32 h-32 text-white">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-2">
          <SvgClock /> Total Semua Dompet Waktu
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-white font-mono tracking-tight">{totalMinutes}</span>
          <span className="text-lg font-bold text-slate-400">Menit</span>
        </div>
        <p className="text-xs text-slate-400 mt-4 max-w-[80%]">
          Waktu deposit tersimpan aman dan terpisah sesuai dengan jenis konsol yang Anda gunakan.
        </p>
      </div>

      {/* Category Wallets */}
      <h3 className="text-base font-bold text-white mt-8 mb-4">Rincian Dompet Waktu</h3>
      {balances.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-500">Anda belum memiliki saldo deposit waktu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {balances.map((wallet) => (
            <div key={wallet.facility_category} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{wallet.facility_category}</h4>
              <div className="flex items-baseline gap-1 mt-auto">
                <span className="text-2xl font-black text-white font-mono">{wallet.balance_minutes}</span>
                <span className="text-xs text-slate-500">mnt</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ledger History */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-bold text-white">Riwayat Transaksi</h3>
        </div>
        
        {ledger.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">Belum ada riwayat transaksi.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {ledger.map((tx) => (
              <div key={tx.id} className="p-4 flex items-start justify-between group hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${tx.type === 'credit' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {tx.type === 'credit' ? <SvgArrowUpRight /> : <SvgArrowDownRight />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-0.5 flex items-center gap-2">
                      {tx.type === 'credit' ? 'Penambahan Waktu' : 'Penggunaan Waktu'}
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-medium">
                        {tx.facility_category}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">{tx.notes || '-'}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(tx.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-base font-bold font-mono ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.minutes} mnt
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
