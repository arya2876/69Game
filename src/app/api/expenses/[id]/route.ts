import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// PATCH /api/expenses/[id] — Owner-only edit
// DELETE /api/expenses/[id] — Owner-only delete
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    // OWNER ONLY
    if (!profile || profile.role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only Owner can edit expenses" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, amount, description, receipt_url } = body;

    const updateData: Record<string, unknown> = {};
    if (category !== undefined) updateData.category = category;
    if (amount !== undefined) updateData.amount = Math.round(amount);
    if (description !== undefined) updateData.description = description;
    if (receipt_url !== undefined) updateData.receipt_url = receipt_url;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: expense, error: updateError } = await supabase
      .from("expenses")
      .update(updateData)
      .eq("id", id)
      .eq("branch_id", profile.branch_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Expense updated", expense });
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    // OWNER ONLY
    if (!profile || profile.role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only Owner can delete expenses" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("branch_id", profile.branch_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Expense deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
