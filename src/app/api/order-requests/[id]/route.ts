import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/order-requests/[id]
// Body: { action: "accept" | "reject" }
// Auth: owner or cashier only
//
// accept → migrates items into order_items (official bill), marks completed
// reject → marks rejected (no billing impact)
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

    const body = await request.json();
    const action = body.action as "accept" | "reject";

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the order request with its items + menu item data
    const { data: orderRequest } = await admin
      .from("order_requests")
      .select(`
        id, branch_id, facility_id, booking_id, status,
        order_request_items (
          id, quantity, notes,
          menu_items ( id, name, price )
        )
      `)
      .eq("id", id)
      .single();

    if (!orderRequest) {
      return NextResponse.json({ error: "Order request not found" }, { status: 404 });
    }

    if (orderRequest.status !== "pending") {
      return NextResponse.json({ error: `Order is already '${orderRequest.status}'` }, { status: 409 });
    }

    if (action === "reject") {
      await admin.from("order_requests").update({ status: "rejected" }).eq("id", id);
      return NextResponse.json({ message: "Order rejected" });
    }

    // ── Accept: migrate items into the official billing table ──
    if (!orderRequest.booking_id) {
      return NextResponse.json({ error: "No linked booking — cannot bill items" }, { status: 409 });
    }

    interface RawItem {
      id: string;
      quantity: number;
      notes: string | null;
      menu_items: { id: string; name: string; price: number } | null;
    }

    const rawItems = (orderRequest.order_request_items ?? []) as unknown as RawItem[];

    const lineItems = rawItems
      .filter((item) => item.menu_items != null)
      .map((item) => ({
        booking_id: orderRequest.booking_id as string,
        branch_id: orderRequest.branch_id as string,
        item_name: item.menu_items!.name,
        category: "fnb" as const,
        quantity: item.quantity,
        unit_price: item.menu_items!.price,
        added_by: user.id,
      }));

    // Message-only requests (no food items) — just mark completed, nothing to bill
    if (lineItems.length === 0) {
      await admin.from("order_requests").update({ status: "completed" }).eq("id", id);
      return NextResponse.json({ message: "Request acknowledged", items_added: 0 });
    }

    const { error: billError } = await admin.from("order_items").insert(lineItems);

    if (billError) {
      return NextResponse.json({ error: billError.message }, { status: 500 });
    }

    await admin.from("order_requests").update({ status: "completed" }).eq("id", id);

    return NextResponse.json({ message: "Order accepted and billed", items_added: lineItems.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
