import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// GET /api/member/balance
// Returns the authenticated member's time deposit balance
// ═══════════════════════════════════════════════════════════════
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

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch balance from the view
    const { data: balance } = await supabase
      .from("member_deposit_balances")
      .select("*")
      .eq("member_id", user.id)
      .single();

    // Fetch recent transactions
    const { data: transactions } = await supabase
      .from("time_deposits")
      .select("*")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      balance: balance || {
        member_id: user.id,
        balance_minutes: 0,
        total_credits: 0,
        total_debits: 0,
        last_transaction: null,
      },
      transactions: transactions || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
