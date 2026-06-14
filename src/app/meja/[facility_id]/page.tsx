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
    .select("id, name, category, branch_id, status")
    .eq("id", facility_id)
    .single();

  if (!facility) return notFound();

  const now = new Date().toISOString();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, end_time, start_time")
    .eq("facility_id", facility_id)
    .eq("status", "active")
    .gt("end_time", now)
    .maybeSingle();

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, price, category")
    .eq("branch_id", facility.branch_id)
    .eq("category", "fnb")
    .eq("is_available", true)
    .order("name");

  return (
    <CustomerOrderPage
      facility={facility}
      booking={booking}
      menuItems={menuItems ?? []}
    />
  );
}
