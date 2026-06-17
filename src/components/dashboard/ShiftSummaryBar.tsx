"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface BucketData {
  total: number;
  count: number;
}

interface PaymentSplit {
  method1: string;
  amount1: number;
  method2: string;
  amount2: number;
}

interface Props {
  branchId: string | null;
  shiftId?: string | null; // cashier: filter by shift; owner: filter by today
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function normalizeBucket(method: string | null): "CASH" | "QRIS" | "DEPOSIT" | "OTHER" {
  const m = (method ?? "").toUpperCase();
  if (m === "CASH" || m === "TUNAI") return "CASH";
  if (m.startsWith("QRIS")) return "QRIS";
  if (m === "DEPOSIT") return "DEPOSIT";
  if (m === "TRANSFER") return "QRIS";
  return "OTHER";
}

export default function ShiftSummaryBar({ branchId, shiftId }: Props) {
  const [cash, setCash] = useState<BucketData>({ total: 0, count: 0 });
  const [qris, setQris] = useState<BucketData>({ total: 0, count: 0 });
  const [deposit, setDeposit] = useState<BucketData>({ total: 0, count: 0 });
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) { setTimeout(() => setLoading(false), 0); return; }

    const supabase = createClient();
    let query = supabase
      .from("bookings")
      .select("payment_method, payment_split, total_amount")
      .eq("branch_id", branchId)
      .eq("status", "completed")
      .eq("is_paid", true);

    if (shiftId) {
      // Cashier: show only this shift's transactions
      query = query.eq("shift_id", shiftId);
    } else {
      // Owner: show today's transactions (no shift filter)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query = query.gte("created_at", todayStart.toISOString());
    }

    query.then(({ data }) => {
      if (!data || data.length === 0) { setLoading(false); return; }

      const buckets: Record<string, BucketData> = {
        CASH: { total: 0, count: 0 },
        QRIS: { total: 0, count: 0 },
        DEPOSIT: { total: 0, count: 0 },
        OTHER: { total: 0, count: 0 },
      };

      for (const row of data) {
        const split = row.payment_split as PaymentSplit | null;
        if (split && split.method1 && split.method2) {
          // Split bill: distribute each portion to its bucket
          const k1 = normalizeBucket(split.method1);
          buckets[k1].total += split.amount1 ?? 0;
          buckets[k1].count += 1;
          const k2 = normalizeBucket(split.method2);
          buckets[k2].total += split.amount2 ?? 0;
          buckets[k2].count += 1;
        } else {
          const key = normalizeBucket(row.payment_method);
          buckets[key].total += row.total_amount ?? 0;
          buckets[key].count += 1;
        }
      }

      setCash(buckets.CASH);
      setQris(buckets.QRIS);
      setDeposit(buckets.DEPOSIT);
      setHasData(data.length > 0);
      setLoading(false);
    });
  }, [branchId, shiftId]);

  if (loading || !hasData) return null;

  const grandTotal = cash.total + qris.total + deposit.total;
  const label = shiftId ? "📊 Shift Ini" : "📊 Hari Ini";

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
          {label}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 flex-1">
          {cash.count > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 leading-none">Cash ({cash.count}×)</p>
                <p className="text-sm font-mono font-bold text-emerald-400 leading-tight">{fmt(cash.total)}</p>
              </div>
            </div>
          )}

          {qris.count > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-blue flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 leading-none">QRIS ({qris.count}×)</p>
                <p className="text-sm font-mono font-bold text-neon-blue leading-tight">{fmt(qris.total)}</p>
              </div>
            </div>
          )}

          {deposit.count > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-purple flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 leading-none">Deposit ({deposit.count}×)</p>
                <p className="text-sm font-mono font-bold text-neon-purple leading-tight">{fmt(deposit.total)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-l border-slate-700 pl-5">
          <p className="text-[10px] text-slate-500 leading-none">Total</p>
          <p className="text-sm font-mono font-bold text-white leading-tight">{fmt(grandTotal)}</p>
        </div>
      </div>
    </div>
  );
}
