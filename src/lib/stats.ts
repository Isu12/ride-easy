/** Dashboard and calendar figures — pure functions over bookings. */
import { holdsUnits, overlaps } from "./availability";
import { round2 } from "./money";
import { addDays, scDate, startOfScDay } from "./time";
import type { Bike, Booking, Promotion } from "./types";

export function dashboardStats(bookings: Booking[], bikes: Bike[], now = new Date()) {
  const today = scDate(now);
  const month = today.slice(0, 7);
  const live = bookings.filter((b) => b.status !== "cancelled");
  const pickupsToday = live.filter((b) => scDate(b.start_at) === today && (b.status === "confirmed" || b.status === "active"));
  const returnsToday = live.filter((b) => scDate(b.end_at) === today && (b.status === "active" || b.status === "completed"));
  const out = bookings.filter((b) => b.status === "active").reduce((s, b) => s + b.items.reduce((n, i) => n + i.quantity, 0), 0);
  const owned = bikes.filter((b) => b.is_active).reduce((s, b) => s + b.quantity_owned, 0);
  const bookingsThisMonth = live.filter((b) => scDate(b.start_at).startsWith(month) && b.status !== "pending_payment").length;
  const revenueThisMonth = round2(
    bookings.filter((b) => b.payment_status === "paid" && b.paid_at && scDate(b.paid_at).startsWith(month)).reduce((s, b) => s + b.total, 0),
  );
  const pendingCancellations = bookings.filter((b) => b.cancellation_requested && b.status !== "cancelled");
  return { pickupsToday, returnsToday, out, owned, available: Math.max(0, owned - out), bookingsThisMonth, revenueThisMonth, pendingCancellations };
}

/** Bookings created per day for the last `days` days (by created date). */
export function bookingsPerDay(bookings: Booking[], days = 30, now = new Date()): { date: string; count: number }[] {
  const today = scDate(now);
  const series = Array.from({ length: days }, (_, i) => ({ date: addDays(today, i - days + 1), count: 0 }));
  const index = new Map(series.map((d, i) => [d.date, i]));
  for (const b of bookings) {
    const i = index.get(scDate(b.created_at));
    if (i !== undefined && b.status !== "pending_payment") series[i].count++;
  }
  return series;
}

export type PromotionStatus = "Scheduled" | "Live" | "Expired" | "Inactive";

export function promotionStatus(p: Promotion, now = new Date()): PromotionStatus {
  if (!p.is_active) return "Inactive";
  const today = scDate(now);
  if (today < p.starts_at) return "Scheduled";
  if (today > p.ends_at) return "Expired";
  return "Live";
}

/** Units booked per bike for each Seychelles calendar day in a range. */
export function dailyUnitsBooked(bikeId: string, bookings: Booking[], dates: string[], now = new Date()): number[] {
  return dates.map((date) => {
    const start = startOfScDay(date);
    const end = startOfScDay(addDays(date, 1));
    return bookings
      .filter((b) => (holdsUnits(b, now) || b.status === "completed") && overlaps(b.start_at, b.end_at, start, end))
      .reduce((s, b) => s + b.items.filter((i) => i.bike_id === bikeId).reduce((n, i) => n + i.quantity, 0), 0);
  });
}
