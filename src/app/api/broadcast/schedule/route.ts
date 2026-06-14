import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// POST /api/broadcast/schedule
// Schedules a WhatsApp broadcast for future delivery
// ═══════════════════════════════════════════════════════════════
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

    if (!profile.branch_id) {
      return NextResponse.json({ error: "Staff not assigned to a branch" }, { status: 400 });
    }

    const body = await request.json();
    const { message_body, brochure_url, template_key, scheduled_at } = body;

    if (!message_body || !scheduled_at) {
      return NextResponse.json(
        { error: "message_body and scheduled_at are required" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "scheduled_at must be in the future" },
        { status: 400 }
      );
    }

    const { data: broadcast, error: insertError } = await supabase
      .from("broadcast_messages")
      .insert({
        branch_id: profile.branch_id,
        message_body,
        brochure_url: brochure_url || null,
        template_key: template_key || null,
        sent_by: user.id,
        scheduled_at: scheduledDate.toISOString(),
        status: "scheduled",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Broadcast scheduled",
        broadcast,
        scheduled_for: scheduledDate.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
