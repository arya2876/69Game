import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════════════════════
// GET /api/staff — List all owner/cashier accounts
// POST /api/staff — Create new staff account (owner only)
// ═══════════════════════════════════════════════════════════════

export async function GET() {
  try {
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

    const admin = createAdminClient();

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, role, branch_id, created_at, branches(name)")
      .in("role", ["owner", "cashier"])
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map(authData.users.map(u => [u.id, u.email || ""]));

    const staff = (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name,
      email: emailMap.get(p.id) || "",
      role: p.role,
      branch_id: p.branch_id,
      branch_name: (p.branches as unknown as { name: string } | null)?.name || "-",
      created_at: p.created_at,
    }));

    return NextResponse.json({ staff });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (actorProfile?.role !== "owner") {
      return NextResponse.json({ error: "Hanya Owner yang dapat menambah akun staff" }, { status: 403 });
    }

    const body = await request.json();
    const { full_name, email, password, role, branch_id } = body;

    if (!full_name || !email || !password || !role || !branch_id) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }
    if (!["owner", "cashier"].includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: newUserData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), role },
    });

    if (createError) {
      if (
        createError.message.toLowerCase().includes("already been registered") ||
        createError.message.toLowerCase().includes("already exists")
      ) {
        return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
      }
      throw createError;
    }

    const newUserId = newUserData.user.id;
    await new Promise(r => setTimeout(r, 300));

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", newUserId)
      .single();

    if (!existingProfile) {
      await admin.from("profiles").insert({
        id: newUserId,
        full_name: full_name.trim(),
        role,
        branch_id,
      });
    } else {
      await admin.from("profiles").update({ role, branch_id }).eq("id", newUserId);
    }

    return NextResponse.json({ message: "Akun staff berhasil dibuat" }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
