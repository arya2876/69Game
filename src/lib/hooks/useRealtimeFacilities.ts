"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Facility } from "@/lib/types/database";

interface UseRealtimeFacilitiesReturn {
  facilities: Facility[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRealtimeFacilities(branchId: string | null): UseRealtimeFacilitiesReturn {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchFacilities = useCallback(async () => {
    if (!branchId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("facilities")
        .select("*")
        .eq("branch_id", branchId)
        .order("category")
        .order("name");

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setFacilities(data || []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch facilities");
    } finally {
      setLoading(false);
    }
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchFacilities();

    // Realtime subscription for facility status changes
    const channel = supabase
      .channel(`facility-status-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "facilities",
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setFacilities((prev) => [...prev, payload.new as Facility]);
          } else if (payload.eventType === "UPDATE") {
            setFacilities((prev) =>
              prev.map((f) =>
                f.id === (payload.new as Facility).id ? (payload.new as Facility) : f
              )
            );
          } else if (payload.eventType === "DELETE") {
            setFacilities((prev) =>
              prev.filter((f) => f.id !== (payload.old as Partial<Facility>).id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, fetchFacilities]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    facilities,
    loading,
    error,
    refetch: fetchFacilities,
  };
}
