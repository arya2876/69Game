import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET  /api/menu-items?branch_id=xxx  — list menu items for a branch
// POST /api/menu-items               — create a new menu item (owner/cashier)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branch_id");
    if (!branchId) return NextResponse.json({ error: "branch_id required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("menu_items")
      .select("id, branch_id, name, category, fnb_category, price, is_available, created_at")
      .eq("branch_id", branchId)
      .order("category")
      .order("fnb_category", { nullsFirst: false })
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    const { name, category, price, fnb_category } = body as { name: string; category: string; price: number; fnb_category?: string | null };

    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!["fnb", "extra_time"].includes(category)) return NextResponse.json({ error: "category must be fnb or extra_time" }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: "price must be positive" }, { status: 400 });

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        branch_id: profile.branch_id,
        name: name.trim(),
        category,
        fnb_category: category === "fnb" ? (fnb_category?.trim() || null) : null,
        price: Math.round(price),
        is_available: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
