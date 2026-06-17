"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function processCashierBooking(params: {
  branchId: string;
  facilityId: string;
  customerName: string;
  customerWa: string;
  durationMinutes: number;
  useDepositMinutes: number;
  paidAmount: number;
  paymentMethod: string;
}) {
  const cookieStore = await cookies();
  
  // Create normal client to verify cashier is logged in
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch (e) {}
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized: Anda harus login sebagai admin/kasir.");

  // Clean WA number (only digits)
  const formattedWa = params.customerWa.replace(/\D/g, "");
  const hasWa = formattedWa.length >= 10;

  let targetMemberId: string | null = null;
  let memberCreated = false;
  let existingProfile: { id: string } | null = null;
  let bookingId: string | null = null;

  if (hasWa) {
    // ── Member path: WA provided ──────────────────────────────
    const { data: found } = await supabase
      .from("profiles")
      .select("id")
      .eq("whatsapp", formattedWa)
      .single();

    if (found) {
      targetMemberId = found.id;
      existingProfile = found;
    } else {
      // Auto-create member
      const adminAuthClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
        email: `${formattedWa}@member.69game.id`,
        password: formattedWa,
        email_confirm: true,
        user_metadata: { full_name: params.customerName, whatsapp: formattedWa, role: "member" },
      });

      if (createError || !newUser.user) {
        throw new Error(`Gagal membuat member otomatis: ${createError?.message ?? "unknown"}`);
      }

      targetMemberId = newUser.user.id;
      memberCreated = true;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create booking via RPC (handles deposit deduction)
    const { data: rpcId, error: rpcError } = await supabase.rpc("create_booking_with_deposit", {
      p_branch_id: params.branchId,
      p_facility_id: params.facilityId,
      p_member_id: targetMemberId,
      p_duration_minutes: params.durationMinutes,
      p_use_deposit_minutes: params.useDepositMinutes,
      p_paid_amount: params.paidAmount,
      p_start_time: new Date().toISOString(),
      p_payment_method: params.paymentMethod,
    });

    if (rpcError) {
      if (rpcError.message.includes("mencukupi")) throw new Error(rpcError.message);
      throw new Error(`Gagal memproses pemesanan: ${rpcError.message}`);
    }

    bookingId = rpcId;
  } else {
    // ── Guest path: no WA provided ────────────────────────────
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const now = new Date();
    const endTime = params.durationMinutes > 0
      ? new Date(now.getTime() + params.durationMinutes * 60 * 1000).toISOString()
      : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24h sentinel for open session

    const { data: newBooking, error: insertError } = await adminClient
      .from("bookings")
      .insert({
        branch_id: params.branchId,
        facility_id: params.facilityId,
        member_id: null,
        guest_name: params.customerName,
        created_by: user.id,
        start_time: now.toISOString(),
        end_time: endTime,
        status: "scheduled",
        base_amount: params.paidAmount,
        total_amount: params.paidAmount,
        payment_method: params.paymentMethod ?? "Cash",
        is_paid: params.paidAmount > 0,
        is_open_session: params.durationMinutes === 0,
      } as never)
      .select("id")
      .single();

    if (insertError || !newBooking) {
      throw new Error(`Gagal membuat booking tamu: ${insertError?.message ?? "unknown"}`);
    }

    bookingId = newBooking.id;
  }

  // Attach active shift_id (cashier only)
  if (bookingId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "cashier") {
      const { data: shift } = await supabase
        .from("shifts")
        .select("id")
        .eq("cashier_id", user.id)
        .eq("status", "open")
        .maybeSingle();
      if (shift) {
        await supabase.from("bookings").update({ shift_id: shift.id } as never).eq("id", bookingId);
      }
    }
  }

  return { success: true, bookingId, memberCreated, isGuest: !hasWa };
}

export async function endSessionAndSaveTime(bookingId: string) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch (e) {}
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const { data: refundedMinutes, error: rpcError } = await supabase.rpc(
    "end_session_and_refund",
    {
      p_booking_id: bookingId
    }
  );

  if (rpcError) {
    console.error("End Session Error:", rpcError);
    throw new Error(`Gagal menghentikan sesi: ${rpcError.message}`);
  }

  return { success: true, refundedMinutes };
}
