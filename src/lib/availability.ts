/**
 * Availability rules — pure functions shared by the UI and the booking "database function".
 *
 * Units free = quantity owned − units in overlapping bookings that hold stock.
 * Holding statuses: confirmed, active, and pending_payment (only for 15 minutes after creation).
 * Overlap: existing.start < requested.end AND existing.end > requested.start.
 */
import type { Booking } from "./types";

export const HOLD_MINUTES = 15;
const HOLD_MS = HOLD_MINUTES * 60 * 1000;

type BookingLike = Pick<Booking, "id" | "status" | "created_at" | "start_at" | "end_at"> & {
  items: { bike_id: string; quantity: number }[];
};

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(aEnd).getTime() > new Date(bStart).getTime();
}

/** When an unpaid booking's hold runs out. */
export function holdExpiresAt(createdAt: string): Date {
  return new Date(new Date(createdAt).getTime() + HOLD_MS);
}

export function holdsUnits(b: Pick<Booking, "status" | "created_at">, now: Date = new Date()): boolean {
  if (b.status === "confirmed" || b.status === "active") return true;
  if (b.status === "pending_payment") return holdExpiresAt(b.created_at).getTime() > now.getTime();
  return false;
}

export function unitsBooked(
  bikeId: string,
  bookings: BookingLike[],
  startIso: string,
  endIso: string,
  now: Date = new Date(),
  excludeBookingId?: string,
): number {
  let total = 0;
  for (const b of bookings) {
    if (b.id === excludeBookingId || !holdsUnits(b, now) || !overlaps(b.start_at, b.end_at, startIso, endIso)) continue;
    for (const item of b.items) if (item.bike_id === bikeId) total += item.quantity;
  }
  return total;
}

export function unitsFree(
  bike: { id: string; quantity_owned: number },
  bookings: BookingLike[],
  startIso: string,
  endIso: string,
  now: Date = new Date(),
): number {
  return Math.max(0, bike.quantity_owned - unitsBooked(bike.id, bookings, startIso, endIso, now));
}

export type PeriodError = { field: "start" | "end"; message: string };

/** Friendly validation of a requested rental period. */
export function validatePeriod(startIso: string | null, endIso: string | null, now: Date = new Date()): PeriodError | null {
  if (!startIso) return { field: "start", message: "Choose a pick-up date and time." };
  if (!endIso) return { field: "end", message: "Choose a return date and time." };
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (s < now.getTime() - 15 * 60 * 1000) return { field: "start", message: "Pick-up can't be in the past." };
  if (e <= s) return { field: "end", message: "Return must be after pick-up." };
  if (e - s < 60 * 60 * 1000) return { field: "end", message: "The minimum rental is 1 hour." };
  return null;
}
