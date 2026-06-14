import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/staff/[id] — Update staff account (owner only)
// DELETE /api/staff/[id] — Delete staff account (owner only)
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

    if (actorProfile?.role !== "owner") {
      return NextResponse.json({ error: "Hanya Owner yang dapat mengubah akun staff" }, { status: 403 });
    }

    const body = await request.json();
    const { full_name, role, branch_id } = body;

    const updates: Record<string, string> = {};
    if (full_name) updates.full_name = full_name.trim();
    if (role && ["owner", "cashier"].includes(role)) updates.role = role;
    if (branch_id) updates.branch_id = branch_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk diubah" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update(updates).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "Akun staff berhasil diperbarui" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
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

    if (user.id === id) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
    }

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (actorProfile?.role !== "owner") {
      return NextResponse.json({ error: "Hanya Owner yang dapat menghapus akun staff" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ message: "Akun staff berhasil dihapus" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
