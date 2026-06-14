import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/shifts/open — cashier membuka shift baru
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

    if (!profile || profile.role !== "cashier") {
      return NextResponse.json({ error: "Hanya kasir yang bisa membuka shift" }, { status: 403 });
    }
    if (!profile.branch_id) {
      return NextResponse.json({ error: "Kasir belum ditugaskan ke cabang" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const branch_id = body.branch_id ?? profile.branch_id;

    const { data: shift, error } = await supabase
      .from("shifts")
      .insert({ branch_id, cashier_id: user.id })
      .select()
      .single();

    if (error) {
      // Unique index violation = shift already open
      if (error.code === "23505") {
        return NextResponse.json({ error: "Kamu sudah memiliki shift yang sedang berjalan" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shift }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
