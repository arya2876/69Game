"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeOrderItems } from "@/lib/hooks/useRealtimeOrderItems";
import type { Booking, Facility } from "@/lib/types/database";

// ── Icons ────────────────────────────────────────────────────
const SvgActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const SvgShoppingCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-neon-purple">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const SvgPlay = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-400">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export default function SesiSayaPage() {
  const { profile } = useUser();
  const [activeBooking, setActiveBooking] = useState<(Booking & { facility: Facility }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState<string>("00:00:00");
  const [isExpired, setIsExpired] = useState(false);

  const supabase = createClient();

  // Fetch active session
  useEffect(() => {
    if (!profile) return;

    const fetchSession = async () => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            facility:facilities!bookings_facility_id_fkey(*)
          `)
          .eq("member_id", profile.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data && data.facility) {
          // Supabase join returns an array or single object depending on relation, 
          // but single object if 1:1 or N:1. Let's force type.
          const facility = Array.isArray(data.facility) ? data.facility[0] : data.facility;
          setActiveBooking({ ...data, facility: facility as Facility });
        } else {
          setActiveBooking(null);
        }
      } catch (err) {
        console.error("No active session or error", err);
        setActiveBooking(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // Subscribe to bookings changes
    const channel = supabase
      .channel("member-session")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `member_id=eq.${profile.id}`
      }, () => {
        fetchSession();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  // Order Items realtime hook
  const { items, total: orderItemsTotal } = useRealtimeOrderItems(activeBooking?.id || null);

  // Timer logic
  useEffect(() => {
    if (!activeBooking) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const endTime = new Date(activeBooking.end_time).getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        setRemainingTime("00:00:00");
        setIsExpired(true);
      } else {
        setIsExpired(false);
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTime(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBooking]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Mengecek sesi aktif...</p>
      </div>
    );
  }

  if (!activeBooking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
          <SvgActivity />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Tidak Ada Sesi Aktif</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Anda sedang tidak bermain di bilik manapun saat ini. Kunjungi kasir untuk memulai sesi bermain baru.
        </p>
      </div>
    );
  }

  const grandTotal = activeBooking.base_amount + orderItemsTotal;

  return (
    <div className="space-y-6">
      
      {/* Session Timer Card */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sesi Sedang Berjalan
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SvgPlay /> {activeBooking.facility.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">ID Transaksi: {activeBooking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        
        <div className="p-8 text-center bg-gradient-to-b from-slate-900/50 to-slate-950/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Sisa Waktu Bermain</p>
          <div className="inline-flex justify-center w-full">
            <span className={`text-6xl md:text-7xl font-black font-mono tracking-tight drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] ${isExpired ? 'text-red-500' : 'text-white'}`}>
              {remainingTime}
            </span>
          </div>
          {isExpired && (
            <p className="text-xs text-red-400 mt-4 font-medium animate-pulse">
              Waktu bermain telah habis. Silakan perpanjang di kasir.
            </p>
          )}
        </div>
      </div>

      {/* Open Tab (F&B / Add-ons) */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <SvgShoppingCart /> Open Tab
          </h3>
          <span className="text-xs text-slate-400">{items.length} Item</span>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">Belum ada pesanan tambahan Makanan/Minuman.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex justify-between items-center group hover:bg-slate-800/30 transition-colors">
                <div>
                  <p className="text-sm font-bold text-white">{item.item_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.quantity} x Rp {item.unit_price.toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="text-sm font-bold font-mono text-neon-purple">
                  Rp {item.subtotal.toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Total Summary */}
        <div className="p-5 bg-slate-950 border-t border-slate-800">
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Sewa Bilik (Dasar)</span>
              <span className="text-white font-mono">Rp {activeBooking.base_amount.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Tambahan (F&B)</span>
              <span className="text-white font-mono">Rp {orderItemsTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-800 border-dashed">
            <span className="text-sm font-bold text-white uppercase tracking-wider">Total Tagihan Saat Ini</span>
            <span className="text-xl font-black font-mono text-emerald-400">Rp {grandTotal.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
