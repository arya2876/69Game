// Hand-crafted types matching the Supabase schema.
// Regenerate with: supabase gen types typescript --linked > src/lib/types/database.ts

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  operating_hours: string | null;
  google_maps_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  whatsapp: string | null;
  role: "owner" | "cashier" | "member";
  branch_id: string | null;
  total_visits: number;
  avatar_url: string | null;
  created_at: string;
}

export interface Facility {
  id: string;
  branch_id: string;
  name: string;
  category: string;
  price_per_hour: number;
  status: "available" | "active" | "waiting_next" | "maintenance";
  active_booking_id: string | null;
  active_booking_end_time: string | null;
  image_url: string | null;
  booth_number: string | null;
  games: string[] | null;
  perks: string[] | null;
  description: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  branch_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  status: "open" | "closed";
  closed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ShiftSummary {
  total_sessions: number;
  total_cash: number;
  total_qris: number;
  total_deposit: number;
  total_omzet: number;
}

export interface Booking {
  id: string;
  branch_id: string;
  facility_id: string;
  member_id: string | null;
  created_by: string;
  shift_id: string | null;
  start_time: string;
  end_time: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  base_amount: number;
  total_amount: number;
  payment_method: string | null;
  is_paid: boolean;
  is_open_session: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  booking_id: string;
  branch_id: string;
  item_name: string;
  category: "fnb" | "extra_time";
  quantity: number;
  unit_price: number;
  subtotal: number;
  added_by: string | null;
  created_at: string;
}
