"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface MemberProfile {
  id: string;      // display ID (first 8 chars uppercased)
  rawId: string;   // full UUID for API calls
  name: string;
  whatsapp: string;
  totalVisits: number;
  depositMinutes: number;
  lastVisit: string;
  joinDate: string;
}

export function useRealtimeMembers() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch profiles with role = member
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, whatsapp, created_at, total_visits")
        .eq("role", "member")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch deposit balances
      const { data: balances, error: balancesError } = await supabase
        .from("member_deposit_balances")
        .select("member_id, balance_minutes");
        
      if (balancesError) throw balancesError;

      // Map data
      const mapped: MemberProfile[] = (profiles || []).map((p) => {
        const balance = balances?.find(b => b.member_id === p.id);
        return {
          id: p.id.slice(0, 8).toUpperCase(),
          rawId: p.id,
          name: p.full_name,
          whatsapp: p.whatsapp || "-",
          totalVisits: p.total_visits || 0,
          depositMinutes: balance?.balance_minutes || 0,
          // Actually last visit requires joining bookings, 
          // but we will mock it to joinDate for now since it's an expensive query
          lastVisit: new Date(p.created_at).toLocaleDateString("id-ID"),
          joinDate: new Date(p.created_at).toLocaleDateString("id-ID"),
        };
      });

      setMembers(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();

    // Subscribe to profiles and time_deposits
    const channel = supabase
      .channel("members-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchMembers())
      .on("postgres_changes", { event: "*", schema: "public", table: "time_deposits" }, () => fetchMembers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  return { members, loading, error, refetch: fetchMembers };
}
