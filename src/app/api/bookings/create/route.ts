import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff profile for branch scoping
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "cashier"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden: Staff only" }, { status: 403 });
    }

    if (!profile.branch_id) {
      return NextResponse.json({ error: "Staff not assigned to a branch" }, { status: 400 });
    }

    const body = await request.json();
    const { facility_id, member_id, start_time, duration_hours, payment_method } = body;

    // Validate required fields
    if (!facility_id || !start_time || !duration_hours) {
      return NextResponse.json(
        { error: "Missing required fields: facility_id, start_time, duration_hours" },
        { status: 400 }
      );
    }

    // Verify facility belongs to staff's branch
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, branch_id, price_per_hour, name")
      .eq("id", facility_id)
      .eq("branch_id", profile.branch_id)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json(
        { error: "Facility not found or does not belong to your branch" },
        { status: 404 }
      );
    }

    // Calculate times and amounts
    const startDt = new Date(start_time);
    const endDt = new Date(startDt.getTime() + duration_hours * 60 * 60 * 1000);
    const baseAmount = facility.price_per_hour * duration_hours;
    const isImmediate = startDt.getTime() <= Date.now();

    // ═══════════════════════════════════════════════════════════
    // OVERLAP CHECK (Application-level — DB EXCLUDE is the safety net)
    // ═══════════════════════════════════════════════════════════
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id, start_time, end_time, status")
      .eq("facility_id", facility_id)
      .in("status", ["scheduled", "active"])
      .eq("is_open_session", false) // open sessions don't have a fixed end_time
      .or(`and(start_time.lt.${endDt.toISOString()},end_time.gt.${startDt.toISOString()})`);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "Booking overlap detected",
          conflicts: conflicts.map((c) => ({
            id: c.id,
            start: c.start_time,
            end: c.end_time,
            status: c.status,
          })),
        },
        { status: 409 }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // CREATE BOOKING
    // ═══════════════════════════════════════════════════════════
    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        branch_id: profile.branch_id,
        facility_id,
        member_id: member_id || null,
        created_by: user.id,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        status: isImmediate ? "active" : "scheduled",
        base_amount: baseAmount,
        total_amount: baseAmount,
        payment_method: payment_method || null,
        is_paid: false,
      })
      .select()
      .single();

    if (insertError) {
      // Handle DB-level EXCLUDE constraint violation
      if (insertError.code === "23P01") {
        return NextResponse.json(
          { error: "Double booking prevented by database constraint" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If immediate start, update facility status
    if (isImmediate) {
      await supabase
        .from("facilities")
        .update({ status: "active", active_booking_id: booking.id })
        .eq("id", facility_id);
    }

    return NextResponse.json(
      {
        message: "Booking created successfully",
        booking,
        facility_name: facility.name,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
