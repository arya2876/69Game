import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not remove this line. It refreshes the auth token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Route Protection ──────────────────────────────────────
  const pathname = request.nextUrl.pathname;

  // Dashboard routes: require owner or cashier
  if (
    pathname.startsWith("/dashboard") || 
    pathname.startsWith("/kasir-walk-in") || 
    pathname.startsWith("/booking-aktif") || 
    (pathname.startsWith("/member") && !pathname.startsWith("/member/login") && !pathname.startsWith("/member/register")) || 
    pathname.startsWith("/blast-promo") || 
    pathname.startsWith("/laporan-keuangan") || 
    pathname.startsWith("/pengaturan")
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Check role — only owner/cashier can access dashboard
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "member") {
      const url = request.nextUrl.clone();
      url.pathname = "/ketersediaan";
      return NextResponse.redirect(url);
    }

    // Cashier cannot access financial reports, broadcast, or settings
    const CASHIER_FORBIDDEN = ["/blast-promo", "/laporan-keuangan", "/pengaturan"];
    if (profile?.role === "cashier" && CASHIER_FORBIDDEN.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Member portal routes: require member role
  if (pathname.startsWith("/ketersediaan") || pathname.startsWith("/deposit-saya") || pathname.startsWith("/sesi-saya")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/member/login";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "owner" || profile?.role === "cashier") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
