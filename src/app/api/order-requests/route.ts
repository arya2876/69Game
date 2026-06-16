import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════════════════════
// POST /api/order-requests
// Public — no auth needed. Called by the customer QR self-service page.
// Body: { facility_id, items: [{ menu_item_id, quantity, notes }] }
// ═══════════════════════════════════════════════════════════════

interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { facility_id, items, message } = body as {
      facility_id: string;
      items?: OrderItemInput[];
      message?: string;
    };

    const hasItems = Array.isArray(items) && items.length > 0;
    const hasMessage = typeof message === "string" && message.trim().length > 0;

    if (!facility_id || (!hasItems && !hasMessage)) {
      return NextResponse.json({ error: "facility_id and either items[] or message are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Resolve the active booking for this facility
    const now = new Date().toISOString();
    const { data: facility } = await supabase
      .from("facilities")
      .select("id, branch_id, status")
      .eq("id", facility_id)
      .single();

    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    // Allow orders for both fixed-duration sessions (end_time > now) and
    // open sessions (is_open_session = true, where end_time may be null or past).
    const { data: booking } = await supabase
      .from("bookings")
      .select("id")
      .eq("facility_id", facility_id)
      .eq("status", "active")
      .or(`end_time.gt.${now},is_open_session.eq.true`)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ error: "No active session for this facility" }, { status: 409 });
    }

    // Create the order request
    const { data: orderRequest, error: reqError } = await supabase
      .from("order_requests")
      .insert({
        branch_id: facility.branch_id,
        facility_id,
        booking_id: booking.id,
        status: "pending",
        message: hasMessage ? message!.trim() : null,
      })
      .select("id")
      .single();

    if (reqError || !orderRequest) {
      return NextResponse.json({ error: reqError?.message ?? "Failed to create order" }, { status: 500 });
    }

    // Insert line items only when items were provided
    if (hasItems) {
      const lineItems = items!.map((item) => ({
        order_request_id: orderRequest.id,
        menu_item_id: item.menu_item_id,
        quantity: Math.max(1, Math.floor(item.quantity)),
        notes: item.notes?.trim() || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_request_items")
        .insert(lineItems);

      if (itemsError) {
        await supabase.from("order_requests").delete().eq("id", orderRequest.id);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Order placed", order_request_id: orderRequest.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
