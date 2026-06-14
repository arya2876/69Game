import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hitung ringkasan shift dari bookings dengan shift_id tsb
async function computeSummary(supabase: Awaited<ReturnType<typeof createClient>>, shiftId: string) {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("payment_method, total_amount")
    .eq("shift_id", shiftId)
    .eq("status", "completed")
    .eq("is_paid", true);

  let total_sessions = 0;
  let total_cash = 0;
  let total_qris = 0;
  let total_deposit = 0;

  for (const b of bookings ?? []) {
    total_sessions++;
    const method = (b.payment_method ?? "").toUpperCase();
    const amount = b.total_amount ?? 0;
    if (method === "CASH" || method === "TUNAI") total_cash += amount;
    else if (method.startsWith("QRIS") || method === "TRANSFER") total_qris += amount;
    else if (method === "DEPOSIT") total_deposit += amount;
    else total_cash += amount; // default fallback
  }

  return { total_sessions, total_cash, total_qris, total_deposit, total_omzet: total_cash + total_qris + total_deposit };
}

// PATCH /api/shifts/[id]/close — kasir menutup shift sendiri
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "cashier") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Pastikan shift milik kasir ini dan masih open
    const { data: shift } = await supabase
      .from("shifts")
      .select("id, cashier_id, status")
      .eq("id", id)
      .single();

    if (!shift) return NextResponse.json({ error: "Shift tidak ditemukan" }, { status: 404 });
    if (shift.cashier_id !== user.id) return NextResponse.json({ error: "Bukan shift kamu" }, { status: 403 });
    if (shift.status === "closed") return NextResponse.json({ error: "Shift sudah ditutup" }, { status: 409 });

    const summary = await computeSummary(supabase, id);

    const { error } = await supabase
      .from("shifts")
      .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: user.id })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
