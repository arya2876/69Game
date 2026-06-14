"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface FacilityCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface UseFacilityCategoriesReturn {
  categories: FacilityCategory[];
  categoryNames: string[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useFacilityCategories(): UseFacilityCategoriesReturn {
  const [categories, setCategories] = useState<FacilityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  // Stable client reference — createClient() may return a singleton, so we
  // hold it in a ref to guarantee identity across renders without useMemo.
  const supabaseRef = useRef(createClient());
  // Unique channel name per hook instance prevents StrictMode double-mount
  // from hitting an already-subscribed channel on the same client singleton.
  const channelName = useRef(`facility-categories-${Math.random().toString(36).slice(2)}`);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabaseRef.current
        .from("facility_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setCategories((data as FacilityCategory[]) || []);
    } catch (err) {
      console.error("Failed to fetch facility_categories", err);
    } finally {
      setLoading(false);
    }
  }, []); // supabaseRef.current is stable — no dep needed

  // Keep fetchCategories in a ref so the effect doesn't need it as a dep.
  const fetchRef = useRef(fetchCategories);
  fetchRef.current = fetchCategories;

  useEffect(() => {
    fetchRef.current();

    const channel = supabaseRef.current
      .channel(channelName.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facility_categories" },
        () => { fetchRef.current(); }
      )
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, []); // runs once per mount — no subscriptions re-added after subscribe()

  const categoryNames = categories.map((c) => c.name);

  return { categories, categoryNames, loading, refetch: fetchCategories };
}
