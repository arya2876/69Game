import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// POST /api/broadcast/send
// Triggers an immediate WhatsApp broadcast via Fonnte
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
    const { message_body, brochure_url, template_key, target_member_ids } = body;

    if (!message_body) {
      return NextResponse.json({ error: "message_body is required" }, { status: 400 });
    }

    // Create broadcast message record
    const { data: broadcast, error: broadcastError } = await supabase
      .from("broadcast_messages")
      .insert({
        branch_id: profile.branch_id,
        message_body,
        brochure_url: brochure_url || null,
        template_key: template_key || null,
        sent_by: user.id,
        status: "sending",
      })
      .select()
      .single();

    if (broadcastError || !broadcast) {
      return NextResponse.json({ error: broadcastError?.message || "Failed to create broadcast" }, { status: 500 });
    }

    // Get target members
    let membersQuery = supabase
      .from("profiles")
      .select("id, whatsapp, full_name")
      .eq("role", "member")
      .not("whatsapp", "is", null);

    if (target_member_ids && target_member_ids.length > 0) {
      membersQuery = membersQuery.in("id", target_member_ids);
    }

    const { data: members } = await membersQuery;

    if (!members || members.length === 0) {
      await supabase
        .from("broadcast_messages")
        .update({ status: "failed" })
        .eq("id", broadcast.id);

      return NextResponse.json({ error: "No members with WhatsApp found" }, { status: 400 });
    }

    // Insert broadcast recipients
    const recipients = members.map((m) => ({
      message_id: broadcast.id,
      member_id: m.id,
      status: "pending" as const,
    }));

    await supabase.from("broadcast_recipients").insert(recipients);

    // ═══════════════════════════════════════════════════════════
    // SEND VIA FONNTE API
    // ═══════════════════════════════════════════════════════════
    const fonntToken = process.env.FONNTE_API_TOKEN;
    let sentCount = 0;
    let failCount = 0;

    if (fonntToken) {
      for (const member of members) {
        try {
          const fonntBody: Record<string, string> = {
            target: member.whatsapp!,
            message: message_body,
          };

          // Attach image if brochure exists
          if (brochure_url) {
            fonntBody.url = brochure_url;
          }

          const response = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
              Authorization: fonntToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(fonntBody),
          });

          const result = await response.json();

          if (result.status) {
            sentCount++;
            await supabase
              .from("broadcast_recipients")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("message_id", broadcast.id)
              .eq("member_id", member.id);
          } else {
            failCount++;
            await supabase
              .from("broadcast_recipients")
              .update({ status: "failed", error_msg: result.reason || "Unknown error" })
              .eq("message_id", broadcast.id)
              .eq("member_id", member.id);
          }

          // Rate limit spacing: 2 seconds between messages
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch {
          failCount++;
        }
      }
    } else {
      // No Fonnte token configured — mark all as sent (dev mode)
      sentCount = members.length;
      await supabase
        .from("broadcast_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("message_id", broadcast.id);
    }

    // Update broadcast status
    await supabase
      .from("broadcast_messages")
      .update({
        status: failCount === members.length ? "failed" : "sent",
        recipient_count: sentCount,
      })
      .eq("id", broadcast.id);

    return NextResponse.json({
      message: "Broadcast completed",
      broadcast_id: broadcast.id,
      total_recipients: members.length,
      sent: sentCount,
      failed: failCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
