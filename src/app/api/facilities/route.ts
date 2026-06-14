import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// GET  /api/facilities — List all facilities for staff's branch
// POST /api/facilities — Add new facility (Owner only)
// ═══════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.branch_id) {
      return NextResponse.json({ error: "No branch assigned" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .eq("branch_id", profile.branch_id)
      .order("category")
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ facilities: data });
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

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Owner only" }, { status: 403 });
    }
    if (!profile.branch_id) {
      return NextResponse.json({ error: "No branch assigned" }, { status: 400 });
    }

    const body = await request.json();
    const { name, category, price_per_hour, image_url } = body;

    if (!name || !category || !price_per_hour) {
      return NextResponse.json({ error: "name, category, price_per_hour required" }, { status: 400 });
    }

    // Validate category against dynamic lookup table
    const { data: validCats } = await supabase
      .from("facility_categories")
      .select("name")
      .eq("is_active", true);
    const validCategories = (validCats || []).map((c: { name: string }) => c.name);
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be: ${validCategories.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("facilities")
      .insert({
        branch_id: profile.branch_id,
        name,
        category,
        price_per_hour: Math.round(price_per_hour),
        status: "available",
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Facility created", facility: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
