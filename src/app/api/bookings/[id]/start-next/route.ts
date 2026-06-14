import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/bookings/[id]/start-next
// Activates a "waiting_next" booking (sequential queueing)
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

    // Fetch the waiting booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .eq("branch_id", profile.branch_id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "scheduled") {
      return NextResponse.json(
        { error: "Only scheduled bookings can be activated via start-next" },
        { status: 400 }
      );
    }

    // Calculate new times preserving original duration
    const originalDuration = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
    const now = new Date();
    const newEndTime = new Date(now.getTime() + originalDuration);

    // Activate the booking
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({
        start_time: now.toISOString(),
        end_time: newEndTime.toISOString(),
        status: "active",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "23P01") {
        return NextResponse.json({ error: "Time conflict detected" }, { status: 409 });
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update facility status from 'waiting_next' to 'active'
    await supabase
      .from("facilities")
      .update({ status: "active", active_booking_id: id })
      .eq("id", booking.facility_id);

    return NextResponse.json({
      message: "Next session started",
      booking: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
