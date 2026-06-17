import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/promos?branch_id=...&category=...&active=true
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branch_id");
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("active") === "true";

    if (!branchId) return NextResponse.json({ error: "branch_id required" }, { status: 400 });

    let q = supabase
      .from("promos")
      .select("*")
      .eq("branch_id", branchId)
      .order("buy_hours", { ascending: true });

    if (activeOnly) q = q.eq("is_active", true);
    if (category) q = q.or(`facility_category.eq.${category},facility_category.is.null`);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/promos
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return NextResponse.json({ error: "Owner only" }, { status: 403 });

    const body = await request.json();
    const { branch_id, name, buy_hours, free_hours, facility_category, valid_from, valid_until, is_active } = body;

    if (!branch_id || !name || !buy_hours || !free_hours) {
      return NextResponse.json({ error: "branch_id, name, buy_hours, free_hours wajib diisi" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("promos")
      .insert({ branch_id, name, buy_hours, free_hours, facility_category: facility_category || null, valid_from: valid_from || null, valid_until: valid_until || null, is_active: is_active ?? true })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
