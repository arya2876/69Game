"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  method?: "QRIS" | "Cash" | "Transfer";
  type: "income" | "expense";
  amount: number;
  category?: string;
  by?: string;
  receipt?: string;
  raw_id?: string;
}

interface UseRealtimeTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRealtimeTransactions(branchId: string | null): UseRealtimeTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTransactions = useCallback(async () => {
    if (!branchId) return;

    try {
      // 1. Fetch Income (Completed Bookings)
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id, created_at, total_amount, payment_method, 
          member:profiles!bookings_member_id_fkey(full_name),
          facility:facilities!bookings_facility_id_fkey(name)
        `)
        .eq("branch_id", branchId)
        .eq("status", "completed");

      if (bookingsError) throw bookingsError;

      // 2. Fetch Expenses
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          id, created_at, amount, category, description, receipt_url,
          recorder:profiles!expenses_recorded_by_fkey(full_name)
        `)
        .eq("branch_id", branchId);

      if (expensesError) throw expensesError;

      // 3. Map and Merge
      const mappedIncome: Transaction[] = (bookings || []).map((b: any) => ({
        id: b.id.slice(0, 8).toUpperCase(),
        raw_id: b.id,
        date: new Date(b.created_at).toISOString().replace("T", " ").substring(0, 16),
        description: `Rental ${b.facility?.name || ""} ${b.member?.full_name ? `(${b.member.full_name})` : "(Walk-in)"}`,
        method: b.payment_method as "QRIS" | "Cash" | "Transfer",
        type: "income",
        amount: b.total_amount,
      }));

      const mappedExpenses: Transaction[] = (expenses || []).map((e: any) => ({
        id: e.id.slice(0, 8).toUpperCase(),
        raw_id: e.id,
        date: new Date(e.created_at).toISOString().replace("T", " ").substring(0, 16),
        description: e.description,
        type: "expense",
        amount: e.amount,
        category: e.category,
        by: e.recorder?.full_name || "Admin",
        receipt: e.receipt_url,
      }));

      const merged = [...mappedIncome, ...mappedExpenses].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(merged);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    fetchTransactions();

    // Subscribe to both bookings and expenses
    const channel = supabase
      .channel(`transactions-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `branch_id=eq.${branchId}` },
        () => fetchTransactions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `branch_id=eq.${branchId}` },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, fetchTransactions]); // eslint-disable-line react-hooks/exhaustive-deps

  return { transactions, loading, error, refetch: fetchTransactions };
}
