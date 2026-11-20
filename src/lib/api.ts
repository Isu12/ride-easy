/**
 * API layer — the only module that touches the data store.
 * Each function mirrors a table read, a database function (create_booking,
 * get_booking_by_reference, get_bike_availability) or an admin-only write,
 * and enforces the same rules row-level security would:
 *  - the public can read active bikes, images, categories, active promotions and settings;
 *  - guests only ever see a booking by reference + email;
 *  - every write except booking/paying/cancellation-request requires the admin role.
 */
import { z } from "zod";
import { holdExpiresAt, unitsBooked, unitsFree, validatePeriod } from "./availability";
import { getDb, newId, resetDatabase, transaction } from "./db";
import { quote } from "./pricing";
import { makeReference } from "./seed";
import { scDate } from "./time";
import type { Bike, BikeCategory, BikeImage, Booking, Database, PaymentMethod, Promotion, Settings } from "./types";

export class ApiError extends Error {}

const latency = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const byOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

// ------------------------------------------------------------------ auth (simulated)

const SESSION_KEY = "rideeasy-admin-session";

export function currentUserEmail(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Mirrors the has_role() database function — roles live in their own table, never on a profile. */
export function hasRole(email: string | null, role: "admin", db: Database = getDb()): boolean {
  return !!email && db.user_roles.some((r) => r.user_email.toLowerCase() === email.toLowerCase() && r.role === role);
}

export const isAdmin = () => hasRole(currentUserEmail(), "admin");

function requireAdmin() {
  if (!isAdmin()) throw new ApiError("You need to be signed in as a hotel admin to do that.");
}

export async function signIn(email: string, password: string): Promise<void> {
  await latency(400);
  const user = getDb().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
  if (!user) throw new ApiError("That email and password don't match. Please try again.");
  if (!hasRole(user.email, "admin")) throw new ApiError("This account doesn't have admin access.");
  window.sessionStorage.setItem(SESSION_KEY, user.email);
}

export function signOut() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

// ------------------------------------------------------------------ public reads

export async function listCategories(): Promise<BikeCategory[]> {
  await latency();
  return [...getDb().bike_categories].sort(byOrder);
}

/** Active bikes only — unless the caller is an admin and asks for all. */
export async function listBikes(opts: { includeInactive?: boolean } = {}): Promise<Bike[]> {
  await latency();
  const all = opts.includeInactive && isAdmin();
  return getDb().bikes.filter((b) => all || b.is_active).sort(byOrder);
}

export async function getBikeBySlug(slug: string): Promise<Bike | null> {
  await latency();
  return getDb().bikes.find((b) => b.slug === slug && (b.is_active || isAdmin())) ?? null;
}

export async function getBikeById(id: string): Promise<Bike | null> {
  await latency(120);
  return getDb().bikes.find((b) => b.id === id && (b.is_active || isAdmin())) ?? null;
}

export async function listBikeImages(bikeId?: string): Promise<BikeImage[]> {
  await latency(80);
  return getDb().bike_images.filter((i) => !bikeId || i.bike_id === bikeId).sort(byOrder);
}

export function primaryImageFor(bikeId: string, images: BikeImage[]): string | null {
  const own = images.filter((i) => i.bike_id === bikeId).sort(byOrder);
  return (own.find((i) => i.is_primary) ?? own[0])?.storage_path ?? null;
}

/** Active promotions the public may see (not yet expired). */
export async function listPublicPromotions(): Promise<Promotion[]> {
  await latency(80);
  const today = scDate(new Date());
  return getDb().promotions.filter((p) => p.is_active && p.ends_at >= today);
}

export async function getSettings(): Promise<Settings> {
  await latency(80);
  return getDb().settings;
}

/** get_bike_availability(bike_id, start_at, end_at) */
export async function getBikeAvailability(bikeId: string, startIso: string, endIso: string): Promise<number> {
  await latency(150);
  const db = getDb();
  const bike = db.bikes.find((b) => b.id === bikeId);
  return bike ? unitsFree(bike, db.bookings, startIso, endIso) : 0;
}

export async function getAvailabilityForAll(startIso: string, endIso: string): Promise<Record<string, number>> {
  await latency(150);
  const db = getDb();
  return Object.fromEntries(db.bikes.map((b) => [b.id, unitsFree(b, db.bookings, startIso, endIso)]));
}

// ------------------------------------------------------------------ bookings (guest)

export const createBookingSchema = z.object({
  bike_id: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  promo_code: z.string().trim().max(30).nullable(),
  guest_name: z.string().trim().min(2).max(100),
  guest_email: z.string().trim().email().max(200),
  guest_phone: z.string().trim().min(6).max(30),
  guest_country: z.string().trim().min(2).max(60),
  staying_at_hotel: z.boolean(),
  room_number: z.string().trim().max(10).nullable(),
  pickup_note: z.string().trim().max(500).nullable(),
  payment_method: z.enum(["card", "paypal", "google_pay"]),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * create_booking(...) — validates input, re-checks availability, recalculates the price
 * (never trusting the client) and inserts the booking + items in one transaction.
 */
export async function createBooking(input: CreateBookingInput): Promise<{ reference: string }> {
  await latency(500);
  const data = createBookingSchema.parse(input);
  return transaction((db) => {
    const bike = db.bikes.find((b) => b.id === data.bike_id && b.is_active);
    if (!bike) throw new ApiError("This bike is no longer available.");
    const periodError = validatePeriod(data.start_at, data.end_at);
    if (periodError) throw new ApiError(periodError.message);
    const free = unitsFree(bike, db.bookings, data.start_at, data.end_at);
    if (free < data.quantity)
      throw new ApiError(free === 0 ? "Sorry, this bike was just booked for these dates." : `Sorry, only ${free} left for these dates.`);

    const today = scDate(new Date());
    const q = quote({
      rates: bike, bikeId: bike.id, startIso: data.start_at, endIso: data.end_at, quantity: data.quantity,
      promotions: db.promotions.filter((p) => p.is_active && p.ends_at >= today), promoCode: data.promo_code,
    });

    let reference = makeReference();
    while (db.bookings.some((b) => b.reference === reference)) reference = makeReference();
    const id = newId("bk");
    const booking: Booking = {
      id, reference, status: "pending_payment", cancellation_requested: false,
      guest_name: data.guest_name, guest_email: data.guest_email.toLowerCase(), guest_phone: data.guest_phone,
      guest_country: data.guest_country, staying_at_hotel: data.staying_at_hotel,
      room_number: data.staying_at_hotel ? data.room_number || null : null,
      start_at: data.start_at, end_at: data.end_at, pickup_note: data.pickup_note || null,
      subtotal: q.subtotal, discount_total: q.discount, total: q.total, currency: "USD",
      promotion_id: q.promotion?.id ?? null,
      promo_code_used: q.promotion?.promo_code ? q.promotion.promo_code : null,
      payment_method: data.payment_method, payment_status: "unpaid", paid_at: null, admin_notes: null,
      created_at: new Date().toISOString(), picked_up_at: null, returned_at: null,
      items: [{
        id: `${id}-1`, booking_id: id, bike_id: bike.id, quantity: data.quantity,
        price_breakdown: { lines: [q.baseText], summary: q.summary }, line_total: q.total,
      }],
    };
    db.bookings.push(booking);
    return { reference };
  });
}

const sameRef = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();
const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** get_booking_by_reference(reference, email) — returns the booking only if both match. */
export async function getBookingByReference(reference: string, email: string): Promise<Booking | null> {
  await latency(350);
  return getDb().bookings.find((b) => sameRef(b.reference, reference) && sameEmail(b.guest_email, email)) ?? null;
}

function findOwnBooking(db: Database, reference: string, email: string): Booking {
  const b = db.bookings.find((x) => sameRef(x.reference, reference) && sameEmail(x.guest_email, email));
  if (!b) throw new ApiError("We couldn't find that booking.");
  return b;
}

/** Simulated payment. No real money is charged. */
export async function payBooking(reference: string, email: string, method: PaymentMethod, approved: boolean): Promise<Booking> {
  await latency(1200);
  return transaction((db) => {
    const b = findOwnBooking(db, reference, email);
    if (b.status !== "pending_payment") throw new ApiError("This booking has already been paid.");
    if (holdExpiresAt(b.created_at).getTime() < Date.now()) {
      // Hold ran out: only accept payment if the bikes are still free
      const bikeItem = b.items[0];
      const bike = db.bikes.find((x) => x.id === bikeItem.bike_id)!;
      const taken = unitsBooked(bike.id, db.bookings, b.start_at, b.end_at, new Date(), b.id);
      if (bike.quantity_owned - taken < bikeItem.quantity) {
        throw new ApiError("Your 15-minute hold has expired and the bike has since been booked. Please choose new dates.");
      }
    }
    b.payment_method = method;
    if (!approved) {
      b.payment_status = "failed";
      return structuredClone(b);
    }
    b.status = "confirmed";
    b.payment_status = "paid";
    b.paid_at = new Date().toISOString();
    return structuredClone(b);
  });
}

export async function requestCancellation(reference: string, email: string): Promise<Booking> {
  await latency(500);
  return transaction((db) => {
    const b = findOwnBooking(db, reference, email);
    if (b.status !== "confirmed" && b.status !== "pending_payment") throw new ApiError("This booking can no longer be cancelled online. Please contact reception.");
    b.cancellation_requested = true;
    return structuredClone(b);
  });
}

// ------------------------------------------------------------------ admin

export type BikeInput = Omit<Bike, "id" | "sort_order"> & { id?: string };
export interface ImageInput {
  storage_path: string;
  is_primary: boolean;
}

export async function saveBike(input: BikeInput, images: ImageInput[]): Promise<Bike> {
  requireAdmin();
  await latency(400);
  return transaction((db) => {
    if (db.bikes.some((b) => b.slug === input.slug && b.id !== input.id)) throw new ApiError("Another bike already uses this web address (slug).");
    let bike: Bike;
    if (input.id) {
      const existing = db.bikes.find((b) => b.id === input.id);
      if (!existing) throw new ApiError("Bike not found.");
      bike = Object.assign(existing, input);
    } else {
      bike = { ...input, id: newId("bike"), sort_order: Math.max(0, ...db.bikes.map((b) => b.sort_order)) + 1 };
      db.bikes.push(bike);
    }
    db.bike_images = db.bike_images.filter((i) => i.bike_id !== bike.id);
    const hasPrimary = images.some((i) => i.is_primary);
    images.forEach((img, idx) =>
      db.bike_images.push({ id: newId("img"), bike_id: bike.id, storage_path: img.storage_path, is_primary: hasPrimary ? img.is_primary : idx === 0, sort_order: idx + 1 }),
    );
    return structuredClone(bike);
  });
}

export async function updateBikeFlags(id: string, flags: Partial<Pick<Bike, "is_active" | "is_featured">>): Promise<void> {
  requireAdmin();
  await latency(150);
  transaction((db) => {
    const b = db.bikes.find((x) => x.id === id);
    if (b) Object.assign(b, flags);
  });
}

/** "Duplicate bike" — for when the hotel buys a new batch of a similar model. */
export async function duplicateBike(id: string): Promise<Bike> {
  requireAdmin();
  await latency(300);
  return transaction((db) => {
    const src = db.bikes.find((b) => b.id === id);
    if (!src) throw new ApiError("Bike not found.");
    let slug = `${src.slug}-copy`;
    for (let n = 2; db.bikes.some((b) => b.slug === slug); n++) slug = `${src.slug}-copy-${n}`;
    const copy: Bike = { ...structuredClone(src), id: newId("bike"), name: `${src.name} (copy)`, slug, is_active: false, is_featured: false,
      sort_order: Math.max(...db.bikes.map((b) => b.sort_order)) + 1 };
    db.bikes.push(copy);
    db.bike_images.filter((i) => i.bike_id === id).forEach((i) => db.bike_images.push({ ...i, id: newId("img"), bike_id: copy.id }));
    return structuredClone(copy);
  });
}

export async function saveCategory(input: Omit<BikeCategory, "id" | "sort_order"> & { id?: string }): Promise<void> {
  requireAdmin();
  await latency(250);
  transaction((db) => {
    if (db.bike_categories.some((c) => c.slug === input.slug && c.id !== input.id)) throw new ApiError("Another category already uses this slug.");
    if (input.id) Object.assign(db.bike_categories.find((c) => c.id === input.id)!, input);
    else db.bike_categories.push({ ...input, id: newId("cat"), sort_order: Math.max(0, ...db.bike_categories.map((c) => c.sort_order)) + 1 });
  });
}

export async function moveCategory(id: string, direction: -1 | 1): Promise<void> {
  requireAdmin();
  transaction((db) => {
    const list = [...db.bike_categories].sort(byOrder);
    const i = list.findIndex((c) => c.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((c, idx) => (db.bike_categories.find((x) => x.id === c.id)!.sort_order = idx + 1));
  });
}

export async function listAllPromotions(): Promise<Promotion[]> {
  requireAdmin();
  await latency();
  return [...getDb().promotions].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}

export async function savePromotion(input: Omit<Promotion, "id"> & { id?: string }): Promise<void> {
  requireAdmin();
  await latency(300);
  transaction((db) => {
    const code = input.promo_code?.trim().toUpperCase() || null;
    if (code && db.promotions.some((p) => p.promo_code?.toUpperCase() === code && p.id !== input.id)) throw new ApiError("Another promotion already uses this code.");
    const row = { ...input, promo_code: code, bike_ids: input.applies_to === "selected_bikes" ? input.bike_ids : [] };
    if (input.id) Object.assign(db.promotions.find((p) => p.id === input.id)!, row);
    else db.promotions.push({ ...row, id: newId("promo") });
  });
}

export async function listBookings(): Promise<Booking[]> {
  requireAdmin();
  await latency();
  return [...getDb().bookings].sort((a, b) => b.start_at.localeCompare(a.start_at));
}

export type BookingAction = "pickup" | "return" | "cancel" | "refund";

export async function applyBookingAction(id: string, action: BookingAction): Promise<void> {
  requireAdmin();
  await latency(300);
  transaction((db) => {
    const b = db.bookings.find((x) => x.id === id);
    if (!b) throw new ApiError("Booking not found.");
    const now = new Date().toISOString();
    if (action === "pickup") {
      if (b.status !== "confirmed") throw new ApiError("Only confirmed bookings can be picked up.");
      b.status = "active";
      b.picked_up_at = now;
    } else if (action === "return") {
      if (b.status !== "active") throw new ApiError("Only bikes that are out can be returned.");
      b.status = "completed";
      b.returned_at = now;
    } else if (action === "cancel") {
      if (b.status === "completed" || b.status === "cancelled") throw new ApiError("This booking can't be cancelled.");
      b.status = "cancelled";
      b.cancellation_requested = false;
    } else if (action === "refund") {
      if (b.payment_status !== "paid") throw new ApiError("Only paid bookings can be refunded.");
      b.payment_status = "refunded";
    }
  });
}

export async function saveAdminNotes(id: string, notes: string): Promise<void> {
  requireAdmin();
  await latency(200);
  transaction((db) => {
    const b = db.bookings.find((x) => x.id === id);
    if (b) b.admin_notes = notes.trim() || null;
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  requireAdmin();
  await latency(300);
  transaction((db) => {
    db.settings = settings;
  });
}

export function resetDemoData() {
  requireAdmin();
  resetDatabase();
}
