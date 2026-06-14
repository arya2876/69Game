"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface RecentBooking {
  id: string;
  facilityName: string;
  memberName: string;
  totalAmount: number;
  paymentMethod: string | null;
  completedAt: string;
}

interface DashboardMetrics {
  totalIncome: number;
  activeBookings: number;
  totalFacilities: number;
  occupancyRate: number;
  totalDepositMinutes: number;
  revenueTrend: { name: string; total: number }[];
  recentBookings: RecentBooking[];
}

const DEFAULT_METRICS: DashboardMetrics = {
  totalIncome: 0,
  activeBookings: 0,
  totalFacilities: 0,
  occupancyRate: 0,
  totalDepositMinutes: 0,
  revenueTrend: [],
  recentBookings: [],
};

export function useRealtimeDashboard(branchId: string | null) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(!!branchId);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchMetrics = useCallback(async () => {
    if (!branchId) return;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        { data: facilitiesData },
        { data: activeBookingsData },
        { data: bookingsData },
        { data: balancesData },
        { data: recentData },
      ] = await Promise.all([
        // 1. Total facilities for occupancy denominator
        supabase.from("facilities").select("id").eq("branch_id", branchId),

        // 2. Active + scheduled bookings count
        supabase
          .from("bookings")
          .select("id")
          .eq("branch_id", branchId)
          .in("status", ["active", "scheduled"]),

        // 3. Completed bookings in last 7 days for revenue trend
        supabase
          .from("bookings")
          .select("created_at, total_amount")
          .eq("branch_id", branchId)
          .eq("status", "completed")
          .gte("created_at", sevenDaysAgo.toISOString()),

        // 4. Member deposit balances
        supabase
          .from("member_deposit_balances")
          .select("balance_minutes")
          .gt("balance_minutes", 0),

        // 5. Recent bookings today for the transactions panel
        supabase
          .from("bookings")
          .select(`
            id, total_amount, payment_method, created_at,
            facility:facilities!bookings_facility_id_fkey(name),
            member:profiles!bookings_member_id_fkey(full_name)
          `)
          .eq("branch_id", branchId)
          .eq("status", "completed")
          .gte("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      // Occupancy
      const activeCount = activeBookingsData?.length ?? 0;
      const totalFacilitiesCount = facilitiesData?.length ?? 1;
      const occupancyRate = Math.min(Math.round((activeCount / totalFacilitiesCount) * 100), 100);

      // Revenue trend (last 7 days)
      const today = new Date();
      const revenueMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        revenueMap[d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })] = 0;
      }
      let totalIncome = 0;
      for (const b of bookingsData ?? []) {
        const key = new Date(b.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        if (key in revenueMap) { revenueMap[key] += b.total_amount; totalIncome += b.total_amount; }
      }
      const revenueTrend = Object.entries(revenueMap).map(([name, total]) => ({ name, total }));

      // Deposits
      const totalDepositMinutes = balancesData?.reduce((s, r) => s + (r.balance_minutes ?? 0), 0) ?? 0;

      // Recent bookings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentBookings: RecentBooking[] = (recentData ?? []).map((b: any) => ({
        id: b.id,
        facilityName: b.facility?.name ?? "—",
        memberName: b.member?.full_name ?? "Walk-in",
        totalAmount: b.total_amount ?? 0,
        paymentMethod: b.payment_method,
        completedAt: b.created_at,
      }));

      setMetrics({
        totalIncome,
        activeBookings: activeCount,
        totalFacilities: facilitiesData?.length ?? 0,
        occupancyRate,
        totalDepositMinutes,
        revenueTrend,
        recentBookings,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!branchId) return;

    void fetchMetrics(); // eslint-disable-line react-hooks/set-state-in-effect

    const channel = supabase
      .channel(`dashboard-${branchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `branch_id=eq.${branchId}` }, () => { void fetchMetrics(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities", filter: `branch_id=eq.${branchId}` }, () => { void fetchMetrics(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [branchId, fetchMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  return { metrics, loading, error, refetch: fetchMetrics };
}
