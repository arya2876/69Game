import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/shifts/active — ambil shift aktif milik kasir yang sedang login
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "cashier"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Owner tidak punya shift — selalu null
    if (profile.role === "owner") {
      return NextResponse.json({ shift: null });
    }

    const { data: shift } = await supabase
      .from("shifts")
      .select("*")
      .eq("cashier_id", user.id)
      .eq("status", "open")
      .maybeSingle();

    return NextResponse.json({ shift: shift ?? null });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
