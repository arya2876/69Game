import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// POST /api/bookings/[id]/add-item
// Adds an item to the Open Tab (Tagihan Berjalan)
// ═══════════════════════════════════════════════════════════════
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
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

    const body = await request.json();
    const { menu_item_id, quantity = 1 } = body;

    if (!menu_item_id) {
      return NextResponse.json({ error: "menu_item_id is required" }, { status: 400 });
    }

    // Verify booking exists, is active, and belongs to staff's branch
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, branch_id, end_time")
      .eq("id", bookingId)
      .eq("branch_id", profile.branch_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "active") {
      return NextResponse.json(
        { error: "Items can only be added to active bookings" },
        { status: 400 }
      );
    }

    // Fetch menu item from catalog
    const { data: menuItem, error: menuError } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", menu_item_id)
      .eq("branch_id", profile.branch_id)
      .eq("is_available", true)
      .single();

    if (menuError || !menuItem) {
      return NextResponse.json({ error: "Menu item not found or unavailable" }, { status: 404 });
    }

    // Insert order item
    const { data: orderItem, error: insertError } = await supabase
      .from("order_items")
      .insert({
        booking_id: bookingId,
        branch_id: profile.branch_id,
        item_name: menuItem.name,
        category: menuItem.category,
        quantity,
        unit_price: menuItem.price,
        added_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If extra_time, extend the booking end_time
    if (menuItem.category === "extra_time") {
      const minutesToAdd = menuItem.name.includes("+1 Jam") ? 60 : 30;
      const currentEndTime = new Date(booking.end_time);
      const newEndTime = new Date(currentEndTime.getTime() + quantity * minutesToAdd * 60000);

      await supabase
        .from("bookings")
        .update({ end_time: newEndTime.toISOString() })
        .eq("id", bookingId);
    }

    // total_amount recalculation is handled by trg_recalc_total_on_insert trigger

    return NextResponse.json(
      {
        message: "Item added to bill",
        order_item: orderItem,
        item_name: menuItem.name,
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
