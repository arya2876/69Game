import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function computeSummary(supabase: Awaited<ReturnType<typeof createClient>>, shiftId: string) {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("payment_method, total_amount")
    .eq("shift_id", shiftId)
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
  return { total_sessions, total_cash, total_qris, total_deposit, total_omzet: total_cash + total_qris + total_deposit };
}

// PATCH /api/shifts/[id]/force-close — owner menutup paksa shift kasir
export async function PATCH(
  request: Request,
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

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Hanya owner yang bisa force-close shift" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const notes: string | undefined = body.notes;

    const { data: shift } = await supabase
      .from("shifts")
      .select("id, status")
      .eq("id", id)
      .single();

    if (!shift) return NextResponse.json({ error: "Shift tidak ditemukan" }, { status: 404 });
    if (shift.status === "closed") return NextResponse.json({ error: "Shift sudah ditutup" }, { status: 409 });

    const summary = await computeSummary(supabase, id);

    const { error } = await supabase
      .from("shifts")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        notes: notes ?? "Ditutup paksa oleh owner",
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
