import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════════════════════
// POST /api/member — Cashier/Owner creates a new member account
// ═══════════════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    if (!actorProfile || !["owner", "cashier"].includes(actorProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { full_name, whatsapp, username, password } = body;

    if (!full_name || !whatsapp || !username || !password) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    if (/\s/.test(username.trim())) {
      return NextResponse.json({ error: "Username tidak boleh mengandung spasi" }, { status: 400 });
    }

    let formattedWA = whatsapp.replace(/\D/g, "");
    if (formattedWA.startsWith("0")) formattedWA = "62" + formattedWA.substring(1);
    if (!formattedWA.startsWith("62")) formattedWA = "62" + formattedWA;

    const email = `${username.trim().toLowerCase()}@member.69game.id`;
    const admin = createAdminClient();

    const { data: newUserData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        whatsapp: formattedWA,
        role: "member",
      },
    });

    if (createError) {
      if (createError.message.toLowerCase().includes("already been registered") || createError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: "Username sudah digunakan, pilih username lain" }, { status: 409 });
      }
      throw createError;
    }

    const newUserId = newUserData.user.id;

    // Check if trigger already created the profile; if not, create manually
    await new Promise(r => setTimeout(r, 300));
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", newUserId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await admin.from("profiles").insert({
        id: newUserId,
        full_name: full_name.trim(),
        whatsapp: formattedWA,
        role: "member",
        branch_id: actorProfile.branch_id,
      });
      if (profileError) throw profileError;
    }

    return NextResponse.json({ message: "Member berhasil dibuat" }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
