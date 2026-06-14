"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderItem } from "@/lib/types/database";

interface UseRealtimeOrderItemsReturn {
  items: OrderItem[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
}

export function useRealtimeOrderItems(bookingId: string | null): UseRealtimeOrderItemsReturn {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    if (!bookingId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("order_items")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setItems(data || []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch order items");
    } finally {
      setLoading(false);
    }
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    fetchItems();

    // Realtime: live-updating bill when items are added
    const channel = supabase
      .channel(`order-items-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_items",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setItems((prev) => [...prev, payload.new as OrderItem]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "order_items",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setItems((prev) =>
            prev.filter((item) => item.id !== (payload.old as Partial<OrderItem>).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, fetchItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    items,
    loading,
    error,
    total,
    refetch: fetchItems,
  };
}
