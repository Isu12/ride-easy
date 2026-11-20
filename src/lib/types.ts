/** Data model — mirrors the database tables described in the project brief. */

export interface BikeCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}

export interface Bike {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  short_description: string;
  description: string;
  features: string[];
  frame_size: string;
  rider_height_min_cm: number;
  rider_height_max_cm: number;
  gear_count: number;
  has_basket: boolean;
  is_electric: boolean;
  quantity_owned: number;
  hourly_rate: number;
  daily_rate: number;
  weekly_rate: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

export interface BikeImage {
  id: string;
  bike_id: string;
  /** Public URL or data URL (uploads in the prototype are stored in the browser). */
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export type DiscountType = "percentage" | "fixed_amount";

export interface Promotion {
  id: string;
  name: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  /** Inclusive dates, YYYY-MM-DD in Seychelles time. */
  starts_at: string;
  ends_at: string;
  applies_to: "all_bikes" | "selected_bikes";
  /** null = applied automatically. */
  promo_code: string | null;
  min_rental_hours: number | null;
  is_active: boolean;
  /** promotion_bikes join, denormalised for the prototype. */
  bike_ids: string[];
}

export type BookingStatus = "pending_payment" | "confirmed" | "active" | "completed" | "cancelled";
export type PaymentMethod = "card" | "paypal" | "google_pay";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface BookingItem {
  id: string;
  booking_id: string;
  bike_id: string;
  quantity: number;
  price_breakdown: { lines: string[]; summary: string };
  line_total: number;
}

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  cancellation_requested: boolean;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_country: string;
  staying_at_hotel: boolean;
  room_number: string | null;
  /** ISO UTC instants */
  start_at: string;
  end_at: string;
  pickup_note: string | null;
  subtotal: number;
  discount_total: number;
  total: number;
  currency: "USD";
  promotion_id: string | null;
  promo_code_used: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_at: string | null;
  admin_notes: string | null;
  created_at: string;
  picked_up_at: string | null;
  returned_at: string | null;
  items: BookingItem[];
}

export interface Settings {
  business_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  opening_hours: string;
  pickup_location_text: string;
  terms_text: string;
}

export interface UserRole {
  user_email: string;
  role: "admin";
}

export interface Database {
  version: number;
  bike_categories: BikeCategory[];
  bikes: Bike[];
  bike_images: BikeImage[];
  promotions: Promotion[];
  bookings: Booking[];
  settings: Settings;
  user_roles: UserRole[];
  /** Simulated auth users (prototype only). */
  users: { email: string; password: string }[];
}
