import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/bookings/[id]/start-early
// Moves a scheduled booking's start_time to NOW and activates it
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

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*, facility:facilities!bookings_facility_id_fkey(status)")
      .eq("id", id)
      .eq("branch_id", profile.branch_id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "scheduled") {
      return NextResponse.json(
        { error: "Only scheduled bookings can be started early" },
        { status: 400 }
      );
    }

    // Verify facility is available
    if (booking.facility?.status !== "available" && booking.facility?.status !== "waiting_next") {
      return NextResponse.json(
        { error: "Facility is not available for early check-in" },
        { status: 409 }
      );
    }

    // Calculate new times preserving original duration
    const originalDuration = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
    const now = new Date();
    const newEndTime = new Date(now.getTime() + originalDuration);

    // Update booking
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
        return NextResponse.json({ error: "Time conflict with another booking" }, { status: 409 });
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Facility status will be synced by the trg_sync_facility trigger

    return NextResponse.json({
      message: "Session started early",
      booking: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
