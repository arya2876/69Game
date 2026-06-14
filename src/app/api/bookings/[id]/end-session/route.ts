import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/bookings/[id]/end-session
// • Fixed-duration: credits unused minutes to member deposit
// • Open session: calculates actual duration, inserts billing item
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
    const paymentMethod = body.payment_method || null;

    // Look up active shift for cashier (null for owner — no shift)
    let activeShiftId: string | null = null;
    if (profile.role === "cashier") {
      const { data: shift } = await supabase
        .from("shifts")
        .select("id")
        .eq("cashier_id", user.id)
        .eq("status", "open")
        .maybeSingle();
      activeShiftId = shift?.id ?? null;
    }

    // Join facility for category (time banking) + price_per_hour (open session billing)
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*, facilities!facility_id(category, price_per_hour, name)")
      .eq("id", id)
      .eq("branch_id", profile.branch_id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "active") {
      return NextResponse.json(
        { error: "Only active bookings can be ended" },
        { status: 400 }
      );
    }

    const facilityRaw = booking.facilities;
    const facilityData = (Array.isArray(facilityRaw) ? facilityRaw[0] : facilityRaw) as {
      category: string;
      price_per_hour: number;
      name: string;
    } | null;

    const facilityCategory = facilityData?.category ?? "PS3";
    const pricePerHour = facilityData?.price_per_hour ?? 0;
    const facilityName = facilityData?.name ?? "";

    const now = new Date();
    const startTime = new Date(booking.start_time);
    let savedMinutes = 0;

    // ═══════════════════════════════════════════════════════════
    // OPEN SESSION: bill actual time used
    // ═══════════════════════════════════════════════════════════
    if (booking.is_open_session) {
      const actualMs = now.getTime() - startTime.getTime();
      const actualMinutes = Math.ceil(actualMs / 60_000); // round up to next minute
      const finalAmount = Math.round((actualMinutes / 60) * pricePerHour);

      // Insert order_item so trg_recalc_total_on_insert updates total_amount
      if (finalAmount > 0) {
        const h = Math.floor(actualMinutes / 60);
        const m = actualMinutes % 60;
        const durationLabel = h > 0
          ? `${h} jam${m > 0 ? ` ${m} mnt` : ""}`
          : `${m} menit`;

        await supabase
          .from("order_items")
          .insert({
            booking_id: id,
            branch_id: profile.branch_id,
            item_name: `Sewa ${facilityName} Open (${durationLabel})`,
            category: "extra_time",
            quantity: 1,
            unit_price: finalAmount,
            added_by: user.id,
          } as never);
      }

      // Close booking with actual end_time and final base_amount
      const { data: updated, error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          end_time: now.toISOString(),
          base_amount: finalAmount,
          is_paid: true,
          payment_method: paymentMethod,
          payment_status: "PAID",
          shift_id: activeShiftId,
        } as never)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: "Session ended successfully",
        booking: updated,
        time_banking: { saved_minutes: 0, member_id: null },
        open_session: { actual_minutes: actualMinutes, final_amount: finalAmount },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // FIXED-DURATION: credit unused minutes to member deposit
    // ═══════════════════════════════════════════════════════════
    const endTime = new Date(booking.end_time);
    const remainingMs = endTime.getTime() - now.getTime();

    if (remainingMs > 0 && booking.member_id) {
      savedMinutes = Math.floor(remainingMs / 60000);

      if (savedMinutes > 0) {
        const { error: depositError } = await supabase
          .from("time_deposits")
          .insert({
            member_id: booking.member_id,
            booking_id: booking.id,
            minutes: savedMinutes,
            type: "credit",
            facility_category: facilityCategory,
            notes: `Sesi dihentikan ${savedMinutes} menit lebih awal`,
          } as never);

        if (depositError) {
          console.error("Time deposit error:", depositError);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CLOSE BOOKING
    // payment_status='PAID' signals the relay bridge to cut power.
    // ═══════════════════════════════════════════════════════════
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        end_time: now.toISOString(),
        is_paid: true,
        payment_method: paymentMethod,
        payment_status: "PAID",
        shift_id: activeShiftId,
      } as never)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Session ended successfully",
      booking: updated,
      time_banking: {
        saved_minutes: savedMinutes,
        member_id: booking.member_id,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
