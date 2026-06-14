import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// PATCH  /api/facilities/[id] — Update facility (name, price, status, image)
// DELETE /api/facilities/[id] — Delete facility (Owner only)
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
    const updateData: Record<string, unknown> = {};

    // Owner can update everything
    if (profile.role === "owner") {
      if (body.name !== undefined) updateData.name = body.name;
      if (body.category !== undefined) updateData.category = body.category;
      if (body.price_per_hour !== undefined) updateData.price_per_hour = Math.round(body.price_per_hour);
      if (body.image_url !== undefined) updateData.image_url = body.image_url;
      if (body.games !== undefined) updateData.games = Array.isArray(body.games) ? body.games : null;
      if (body.perks !== undefined) updateData.perks = Array.isArray(body.perks) ? body.perks : null;
      if (body.booth_number !== undefined) updateData.booth_number = body.booth_number || null;
      if (body.description !== undefined) updateData.description = body.description || null;
    }

    // Both owner and cashier can toggle status (maintenance/available)
    if (body.status !== undefined) {
      const validStatuses = ["available", "maintenance"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Can only manually set status to 'available' or 'maintenance'" },
          { status: 400 }
        );
      }

      // Don't allow setting to available if there's an active booking
      const { data: facility } = await supabase
        .from("facilities")
        .select("status, active_booking_id")
        .eq("id", id)
        .single();

      if (facility?.status === "active" && body.status === "maintenance") {
        return NextResponse.json(
          { error: "Cannot set to maintenance while a session is active. End the session first." },
          { status: 409 }
        );
      }

      updateData.status = body.status;
      if (body.status === "maintenance") {
        updateData.active_booking_id = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("facilities")
      .update(updateData)
      .eq("id", id)
      .eq("branch_id", profile.branch_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Facility not found" }, { status: 404 });

    return NextResponse.json({ message: "Facility updated", facility: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
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

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Owner only" }, { status: 403 });
    }

    // Check for active bookings
    const { data: facility } = await supabase
      .from("facilities")
      .select("status")
      .eq("id", id)
      .eq("branch_id", profile.branch_id)
      .single();

    if (!facility) return NextResponse.json({ error: "Facility not found" }, { status: 404 });

    if (facility.status === "active") {
      return NextResponse.json(
        { error: "Cannot delete facility with active session" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("facilities")
      .delete()
      .eq("id", id)
      .eq("branch_id", profile.branch_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Facility deleted" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
