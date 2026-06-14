"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types/database";

interface BookingWithProfile extends Booking {
  member?: {
    full_name: string;
    whatsapp: string | null;
  } | null;
  facility?: {
    name: string;
    category: string;
    price_per_hour: number;
    booth_number: string | null;
  } | null;
}

interface UseRealtimeBookingsReturn {
  bookings: BookingWithProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRealtimeBookings(
  branchId: string | null,
  statusFilter?: string[]
): UseRealtimeBookingsReturn {
  const [bookings, setBookings] = useState<BookingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    if (!branchId) return;

    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          member:profiles!bookings_member_id_fkey(full_name, whatsapp),
          facility:facilities!bookings_facility_id_fkey(name, category, price_per_hour, booth_number)
        `)
        .eq("branch_id", branchId)
        .order("start_time", { ascending: true });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setBookings((data as BookingWithProfile[]) || []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  }, [branchId, statusFilter?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    fetchBookings();

    // Realtime subscription
    const channel = supabase
      .channel(`bookings-active-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          // Refetch with joins on any booking change
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, fetchBookings]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
  };
}
