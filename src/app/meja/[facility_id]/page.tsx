import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import CustomerOrderPage from "./CustomerOrderPage";

interface Props {
  params: Promise<{ facility_id: string }>;
}

export default async function MejaPage({ params }: Props) {
  const { facility_id } = await params;
  const supabase = createAdminClient();

  const { data: facility } = await supabase
    .from("facilities")
    .select("id, name, category, branch_id, status, booth_number, price_per_hour")
    .eq("id", facility_id)
    .single();

  if (!facility) return notFound();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, end_time, start_time, is_open_session, total_amount, base_amount")
    .eq("facility_id", facility_id)
    .eq("status", "active")
    .maybeSingle();

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, price, category, fnb_category")
    .eq("branch_id", facility.branch_id)
    .eq("category", "fnb")
    .eq("is_available", true)
    .order("fnb_category", { nullsFirst: false })
    .order("name");

  return (
    <CustomerOrderPage
      facility={facility}
      booking={booking}
      menuItems={menuItems ?? []}
    />
  );
}
