import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/shifts?branch_id=&status=&date_from=&date_to= — owner list semua shift
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Hanya owner yang bisa melihat semua shift" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branch_id = searchParams.get("branch_id");
    const status = searchParams.get("status");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    let query = supabase
      .from("shifts")
      .select(`
        *,
        cashier:profiles!shifts_cashier_id_fkey(full_name, whatsapp),
        closer:profiles!shifts_closed_by_fkey(full_name)
      `)
      .order("opened_at", { ascending: false });

    if (branch_id) query = query.eq("branch_id", branch_id);
    if (status) query = query.eq("status", status);
    if (date_from) query = query.gte("opened_at", date_from);
    if (date_to) query = query.lte("opened_at", date_to);

    const { data: shifts, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Compute summary for each closed shift
    const shiftsWithSummary = await Promise.all(
      (shifts ?? []).map(async (shift) => {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("payment_method, total_amount")
          .eq("shift_id", shift.id)
          .eq("status", "completed")
          .eq("is_paid", true);

        let total_sessions = 0, total_cash = 0, total_qris = 0, total_deposit = 0;
        for (const b of bookings ?? []) {
          total_sessions++;
          const method = (b.payment_method ?? "").toUpperCase();
          const amount = b.total_amount ?? 0;
          if (method === "CASH" || method === "TUNAI") total_cash += amount;
          else if (method.startsWith("QRIS") || method === "TRANSFER") total_qris += amount;
          else if (method === "DEPOSIT") total_deposit += amount;
          else total_cash += amount;
        }

        return {
          ...shift,
          summary: { total_sessions, total_cash, total_qris, total_deposit, total_omzet: total_cash + total_qris + total_deposit },
        };
      })
    );

    return NextResponse.json({ shifts: shiftsWithSummary });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
