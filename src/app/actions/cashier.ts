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
  
  let targetMemberId: string | null = null;

  // 1. Search for existing member by WA
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("whatsapp", formattedWa)
    .single();

  if (existingProfile) {
    targetMemberId = existingProfile.id;
  } else {
    // 2. Auto Create Member using Service Role Key
    const adminAuthClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const fakeEmail = `${formattedWa}@member.69game.id`;
    
    const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
      email: fakeEmail,
      password: formattedWa,
      email_confirm: true,
      user_metadata: {
        full_name: params.customerName,
        whatsapp: formattedWa,
        role: "member"
      }
    });

    if (createError) {
      console.error("Auto member creation failed:", createError);
      throw new Error(`Gagal membuat member otomatis: ${createError.message}`);
    }
    
    if (!newUser.user) {
      throw new Error("User creation failed without error message.");
    }

    targetMemberId = newUser.user.id;
    
    // Give postgres trigger a brief moment to create the profile row
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 3. Create Booking
  const { data: bookingId, error: rpcError } = await supabase.rpc(
    "create_booking_with_deposit",
    {
      p_branch_id: params.branchId,
      p_facility_id: params.facilityId,
      p_member_id: targetMemberId,
      p_duration_minutes: params.durationMinutes,
      p_use_deposit_minutes: params.useDepositMinutes,
      p_paid_amount: params.paidAmount,
      p_start_time: new Date().toISOString(),
      p_payment_method: params.paymentMethod,
    }
  );

  if (rpcError) {
    console.error("RPC Booking Error:", rpcError);
    if (rpcError.message.includes("mencukupi")) {
      throw new Error(rpcError.message);
    }
    throw new Error(`Gagal memproses pemesanan: ${rpcError.message}`);
  }

  // Attach active shift_id to the newly created booking (cashier only)
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

  return { success: true, bookingId, memberCreated: !existingProfile };
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
