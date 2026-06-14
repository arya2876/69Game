"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Branch, Shift, ShiftSummary } from "@/lib/types/database";

// ═══════════════════════════════════════════════════════════════
// USER CONTEXT — Multi-Tenant Branch Isolation + Shift Management
// ═══════════════════════════════════════════════════════════════

interface UserContextType {
  // Auth State
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  // Role Helpers
  isOwner: boolean;
  isCashier: boolean;
  isMember: boolean;

  // Multi-Tenant Branch State
  activeBranchId: string | null;
  setActiveBranchId: (id: string) => void;
  branches: Branch[];
  activeBranch: Branch | null;
  canSwitchBranch: boolean;

  // Shift State (cashier only)
  activeShift: Shift | null;
  shiftLoading: boolean;
  openShift: () => Promise<void>;
  closeShift: () => Promise<ShiftSummary>;
  refreshShift: () => Promise<void>;

  // Actions
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  const supabase = createClient();
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;

  // ── Shift helpers ─────────────────────────────────────────
  const fetchActiveShift = useCallback(async () => {
    const res = await fetch("/api/shifts/active");
    if (res.ok) {
      const json = await res.json();
      setActiveShift(json.shift ?? null);
    }
  }, []);

  const openShift = useCallback(async () => {
    setShiftLoading(true);
    try {
      const res = await fetch("/api/shifts/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal membuka shift");
      }
      const json = await res.json();
      setActiveShift(json.shift);
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const closeShift = useCallback(async (): Promise<ShiftSummary> => {
    if (!activeShift) throw new Error("Tidak ada shift aktif");
    const res = await fetch(`/api/shifts/${activeShift.id}/close`, { method: "PATCH" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Gagal menutup shift");
    }
    const json = await res.json();
    setActiveShift(null);
    return json.summary as ShiftSummary;
  }, [activeShift]);

  const refreshShift = useCallback(async () => {
    await fetchActiveShift();
  }, [fetchActiveShift]);

  // ── Fetch Profile + Branches on Mount ─────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          if (mounted) {
            setError(profileError?.message || "Profile not found");
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setProfile(profileData);

          if (profileData.branch_id) setActiveBranchIdState(profileData.branch_id);

          if (profileData.role === "owner") {
            const { data: branchesData } = await supabase
              .from("branches")
              .select("*")
              .eq("is_active", true)
              .order("name");
            if (branchesData) setBranches(branchesData);
          }

          // Cashier: fetch active shift
          if (profileData.role === "cashier") {
            setShiftLoading(true);
            const res = await fetch("/api/shifts/active");
            if (res.ok) {
              const json = await res.json();
              if (mounted) setActiveShift(json.shift ?? null);
            }
            if (mounted) setShiftLoading(false);
          }

          if (mounted) setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize");
          setLoading(false);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null);
        setActiveBranchIdState(null);
        setBranches([]);
        setActiveShift(null);
        setLoading(false);
      } else {
        init();
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime: listen for force-close by owner ─────────────
  useEffect(() => {
    if (!profile || profile.role !== "cashier") return;

    const channel = supabase
      .channel(`shift-watch-${profile.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "shifts",
        filter: `cashier_id=eq.${profile.id}`,
      }, (payload) => {
        const updated = payload.new as Shift;
        if (updated.status === "closed") {
          setActiveShift(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Branch Switching (Owner only) ─────────────────────────
  const setActiveBranchId = useCallback((id: string) => {
    if (!profile || profile.role === "cashier") return;
    setActiveBranchIdState(id);
  }, [profile]);

  // ── Sign Out ──────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase]);

  // ── Derived State ─────────────────────────────────────────
  const isOwner = profile?.role === "owner";
  const isCashier = profile?.role === "cashier";
  const isMember = profile?.role === "member";
  const canSwitchBranch = isOwner && branches.length > 1;
  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;

  return (
    <UserContext.Provider
      value={{
        profile,
        loading,
        error,
        isOwner,
        isCashier,
        isMember,
        activeBranchId,
        setActiveBranchId,
        branches,
        activeBranch,
        canSwitchBranch,
        activeShift,
        shiftLoading,
        openShift,
        closeShift,
        refreshShift,
        signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error("useUser must be used within a UserProvider");
  return context;
}
