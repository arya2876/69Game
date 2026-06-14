import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/member/[id] — Update member profile (name & whatsapp)
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

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!actorProfile || !["owner", "cashier"].includes(actorProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { full_name, whatsapp } = body;

    if (!full_name && !whatsapp) {
      return NextResponse.json({ error: "Tidak ada data untuk diubah" }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (full_name) updates.full_name = full_name.trim();
    if (whatsapp) {
      let formattedWA = whatsapp.replace(/\D/g, "");
      if (formattedWA.startsWith("0")) formattedWA = "62" + formattedWA.substring(1);
      if (!formattedWA.startsWith("62")) formattedWA = "62" + formattedWA;
      updates.whatsapp = formattedWA;
    }

    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update(updates).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "Data member berhasil diperbarui" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
