import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH  /api/menu-items/[id] — update name, category, price, or is_available
// DELETE /api/menu-items/[id] — delete menu item

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

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.category !== undefined) {
      if (!["fnb", "extra_time"].includes(body.category)) {
        return NextResponse.json({ error: "category must be fnb or extra_time" }, { status: 400 });
      }
      updateData.category = body.category;
    }
    if (body.fnb_category !== undefined) {
      updateData.fnb_category = body.category === "extra_time" ? null : (body.fnb_category?.trim() || null);
    }
    if (body.price !== undefined) {
      const p = Math.round(Number(body.price));
      if (p <= 0) return NextResponse.json({ error: "price must be positive" }, { status: 400 });
      updateData.price = p;
    }
    if (body.is_available !== undefined) updateData.is_available = Boolean(body.is_available);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("menu_items")
      .update(updateData)
      .eq("id", id)
      .eq("branch_id", profile.branch_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });

    return NextResponse.json({ item: data });
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

    if (!profile || !["owner", "cashier"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id)
      .eq("branch_id", profile.branch_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Menu item deleted" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
