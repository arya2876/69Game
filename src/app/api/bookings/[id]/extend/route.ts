import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/bookings/[id]/extend
// Body: { minutes: number }   (1–480)
// Auth: owner or cashier
//
// 1. Extends end_time from MAX(current end_time, now)
// 2. Inserts an order_item for the extra time (price from facility's
//    price_per_hour) so it appears on the checkout bill automatically.
//    trg_recalc_total_on_insert updates booking.total_amount.
// ═══════════════════════════════════════════════════════════════

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
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "cashier"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const minutes = Math.floor(Number(body.minutes));
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 480) {
      return NextResponse.json(
        { error: "minutes must be an integer between 1 and 480" },
        { status: 400 }
      );
    }

    // Fetch booking + facility price in one go
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, end_time, branch_id, facility_id, facilities!facility_id(price_per_hour, name)")
      .eq("id", id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: fetchError?.message ?? "Booking not found" }, { status: 404 });
    }

    if (booking.branch_id !== profile.branch_id && profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.status !== "active") {
      return NextResponse.json(
        { error: "Only active bookings can be extended" },
        { status: 400 }
      );
    }

    // Extend from MAX(end_time, now): expired bookings get time from now, not the past
    const currentEndMs = new Date(booking.end_time).getTime();
    const baseMs = Math.max(currentEndMs, Date.now());
    const newEnd = new Date(baseMs + minutes * 60_000);

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ end_time: newEnd.toISOString() })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ── Insert order_item for the extra time ──────────────────
    // Price is prorated from facility's price_per_hour
    const facilityRaw = booking.facilities;
    const facility = (Array.isArray(facilityRaw) ? facilityRaw[0] : facilityRaw) as { price_per_hour: number; name: string } | null;
    const pricePerHour = facility?.price_per_hour ?? 0;
    const extraCost = Math.round((minutes / 60) * pricePerHour);
    const label = minutes < 60
      ? `Tambah Waktu +${minutes} menit`
      : `Tambah Waktu +${Math.floor(minutes / 60)} jam${minutes % 60 > 0 ? ` ${minutes % 60} mnt` : ""}`;

    if (extraCost > 0) {
      await supabase.from("order_items").insert({
        booking_id: id,
        branch_id: booking.branch_id,
        item_name: label,
        category: "extra_time",
        quantity: 1,
        unit_price: extraCost,
        added_by: user.id,
      });
      // trg_recalc_total_on_insert will update booking.total_amount automatically
    }

    return NextResponse.json({
      message: `Session extended by ${minutes} minutes`,
      new_end_time: newEnd.toISOString(),
      extra_cost: extraCost,
      item_label: label,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
