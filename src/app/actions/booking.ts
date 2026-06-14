"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createBookingWithDeposit(params: {
  branchId: string;
  facilityId: string;
  durationMinutes: number;
  useDepositMinutes: number;
  paidAmount: number;
  paymentMethod?: string;
  startTime?: string;
}) {
  const cookieStore = await cookies();

  // Create an authenticated Supabase client on the server
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Ignored when called from Server Component
          }
        },
      },
    }
  );

  // Get current user to pass as member_id (assuming the member is creating their own booking)
  // If this action can also be used by staff on behalf of members, we would need to pass memberId as a parameter.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Anda harus login untuk melakukan pemesanan.");
  }

  try {
    // Invoke the RPC function
    const { data: bookingId, error: rpcError } = await supabase.rpc(
      "create_booking_with_deposit",
      {
        p_branch_id: params.branchId,
        p_facility_id: params.facilityId,
        p_member_id: user.id, // For members booking themselves
        p_duration_minutes: params.durationMinutes,
        p_use_deposit_minutes: params.useDepositMinutes,
        p_paid_amount: params.paidAmount,
        p_start_time: params.startTime || new Date().toISOString(),
        p_payment_method: params.paymentMethod || "Cash",
      }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      
      // Translate common Postgres errors to friendly messages
      if (rpcError.message.includes("Insufficient deposit minutes")) {
        throw new Error("Saldo deposit waktu Anda tidak mencukupi untuk pemesanan ini.");
      }
      
      throw new Error(`Gagal memproses pemesanan: ${rpcError.message}`);
    }

    return { success: true, bookingId };

  } catch (error: any) {
    console.error("Booking Error:", error);
    return { success: false, error: error.message || "Terjadi kesalahan pada server." };
  }
}
