import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// POST /api/expenses/create
// Records a new operational expense (OPEX)
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
    const { category, amount, description, receipt_url } = body;

    // Validate required fields
    if (!category || !amount || !description || !receipt_url) {
      return NextResponse.json(
        { error: "Missing required fields: category, amount, description, receipt_url" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["Listrik & Air", "Restok F&B", "Maintenance Alat", "Lainnya"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Insert expense
    const { data: expense, error: insertError } = await supabase
      .from("expenses")
      .insert({
        branch_id: profile.branch_id,
        category,
        amount: Math.round(amount),
        description,
        receipt_url,
        recorded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Expense recorded", expense },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
