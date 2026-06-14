"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  isCashier: boolean;
  isMember: boolean;
  branchId: string | null;
  signOut: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (mounted) {
          if (profileError) {
            setError(profileError.message);
          } else {
            setProfile(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch profile");
          setLoading(false);
        }
      }
    }

    fetchProfile();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchProfile();
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return {
    profile,
    loading,
    error,
    isOwner: profile?.role === "owner",
    isCashier: profile?.role === "cashier",
    isMember: profile?.role === "member",
    branchId: profile?.branch_id ?? null,
    signOut,
  };
}
