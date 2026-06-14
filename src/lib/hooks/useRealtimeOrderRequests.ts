"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Audio and browser notifications are handled globally by GlobalOrderNotifier
// (mounted in the dashboard layout) so they fire on every page, not just here.

export interface OrderRequestItemDetail {
  id: string;
  quantity: number;
  notes: string | null;
  menu_items: { id: string; name: string; price: number } | null;
}

export interface OrderRequestDetail {
  id: string;
  branch_id: string;
  facility_id: string;
  booking_id: string | null;
  status: "pending" | "preparing" | "completed" | "rejected";
  created_at: string;
  message: string | null;
  facilities: { name: string; category: string } | null;
  order_request_items: OrderRequestItemDetail[];
}

interface UseRealtimeOrderRequestsReturn {
  orders: OrderRequestDetail[];
  loading: boolean;
  accept: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  actionLoading: string | null;
}

export function useRealtimeOrderRequests(branchId: string | null): UseRealtimeOrderRequestsReturn {
  const [orders, setOrders] = useState<OrderRequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = createClient();

  const fetchPending = useCallback(async () => {
    if (!branchId) { setTimeout(() => { setOrders([]); setLoading(false); }, 0); return; }
    try {
      const { data } = await supabase
        .from("order_requests")
        .select(`
          id, branch_id, facility_id, booking_id, status, created_at, message,
          facilities ( name, category ),
          order_request_items (
            id, quantity, notes,
            menu_items ( id, name, price )
          )
        `)
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (isMounted.current) setOrders((data as unknown as OrderRequestDetail[]) ?? []);
    } catch {
      // Silently ignore fetch errors — will retry on next realtime event
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMounted.current = true;
    if (!branchId) { setTimeout(() => setLoading(false), 0); return; }

    // fetchPending is async — setState calls inside it are not synchronous within this effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPending();

    const channel = supabase
      .channel(`order-requests-branch-${branchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_requests", filter: `branch_id=eq.${branchId}` },
        () => { fetchPending(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_requests", filter: `branch_id=eq.${branchId}` },
        () => { fetchPending(); }
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [branchId, fetchPending]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/order-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Gagal menerima pesanan");
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setActionLoading(null);
    }
  }, []);

  const reject = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/order-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Gagal menolak pesanan");
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setActionLoading(null);
    }
  }, []);

  return { orders, loading, accept, reject, actionLoading };
}
