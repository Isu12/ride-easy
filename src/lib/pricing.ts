/**
 * Pricing rules — pure, framework-free functions (reusable by the future mobile app).
 *
 * - Duration rounds UP to the next full hour; minimum 1 hour.
 * - Never overcharge: hours are capped at the daily rate, days at the weekly rate.
 * - 7+ days: weeks × weekly rate + leftover priced the same way (leftover capped at one weekly rate).
 * - Only the single best eligible promotion applies. Promotions never stack.
 */
import { formatMoneyCompact as $, round2 } from "./money";
import { HOUR_MS, formatDate, scDate } from "./time";
import type { Promotion } from "./types";

export interface Rates {
  hourly_rate: number;
  daily_rate: number;
  weekly_rate: number;
}

const HOURS_PER_DAY = 24;
const HOURS_PER_WEEK = 7 * HOURS_PER_DAY;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Billable hours between two instants: rounded up, minimum 1. */
export function rentalHours(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.ceil(ms / HOUR_MS));
}

export interface PricePart {
  amount: number;
  text: string;
}

/** Price for less than one week (0–167 hours) for a single bike, capped at the weekly rate. */
function priceUnderWeek(hours: number, r: Rates): PricePart {
  if (hours <= 0) return { amount: 0, text: "" };
  const days = Math.floor(hours / HOURS_PER_DAY);
  const leftHours = hours % HOURS_PER_DAY;
  const parts: PricePart[] = [];

  if (days > 0) parts.push({ amount: days * r.daily_rate, text: `${plural(days, "day")} × ${$(r.daily_rate)}` });
  if (leftHours > 0) {
    const byHour = leftHours * r.hourly_rate;
    parts.push(
      byHour > r.daily_rate
        ? { amount: r.daily_rate, text: `${plural(leftHours, "hour")} (daily cap ${$(r.daily_rate)})` }
        : { amount: byHour, text: `${plural(leftHours, "hour")} × ${$(r.hourly_rate)}` },
    );
  }

  const amount = parts.reduce((s, p) => s + p.amount, 0);
  if (amount > r.weekly_rate) {
    const span = [days && plural(days, "day"), leftHours && plural(leftHours, "hour")].filter(Boolean).join(" ");
    return { amount: r.weekly_rate, text: `${span} (weekly cap ${$(r.weekly_rate)})` };
  }
  return { amount: round2(amount), text: parts.map((p) => p.text).join(" + ") };
}

/** Base price for one bike for a number of billable hours, with a readable explanation. */
export function basePrice(hours: number, r: Rates): PricePart {
  const h = Math.max(1, Math.ceil(hours));
  const weeks = Math.floor(h / HOURS_PER_WEEK);
  const rest = priceUnderWeek(h % HOURS_PER_WEEK, r);
  if (weeks === 0) return rest;
  const weekPart = { amount: weeks * r.weekly_rate, text: `${plural(weeks, "week")} × ${$(r.weekly_rate)}` };
  return {
    amount: round2(weekPart.amount + rest.amount),
    text: [weekPart.text, rest.text].filter(Boolean).join(" + "),
  };
}

// ---------------------------------------------------------------- promotions

export interface PromoContext {
  bikeId: string;
  startIso: string;
  hours: number;
}

export type Eligibility = { ok: true } | { ok: false; reason: string };

export function promotionEligibility(p: Promotion, ctx: PromoContext): Eligibility {
  if (!p.is_active) return { ok: false, reason: "This offer is no longer available." };
  const startDate = scDate(ctx.startIso);
  if (startDate < p.starts_at) return { ok: false, reason: `This offer is valid for rentals starting from ${formatDate(p.starts_at)}.` };
  if (startDate > p.ends_at) return { ok: false, reason: `This offer ended on ${formatDate(p.ends_at)}.` };
  if (p.applies_to === "selected_bikes" && !p.bike_ids.includes(ctx.bikeId))
    return { ok: false, reason: "This offer isn't valid for this bike." };
  if (p.min_rental_hours && ctx.hours < p.min_rental_hours)
    return { ok: false, reason: `This offer is for rentals of ${plural(p.min_rental_hours, "hour")} or more.` };
  return { ok: true };
}

export function discountFor(p: Promotion, subtotal: number): number {
  const raw = p.discount_type === "percentage" ? (subtotal * p.discount_value) / 100 : p.discount_value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

/** "−15%" or "−$10" */
export function discountLabel(p: Pick<Promotion, "discount_type" | "discount_value">): string {
  return p.discount_type === "percentage" ? `−${p.discount_value}%` : `−${$(p.discount_value)}`;
}

export const normaliseCode = (code: string) => code.trim().toUpperCase();

export type CodeCheck = { ok: true; promotion: Promotion } | { ok: false; reason: string };

export function validatePromoCode(code: string, promotions: Promotion[], ctx: PromoContext): CodeCheck {
  const wanted = normaliseCode(code);
  if (!wanted) return { ok: false, reason: "Enter a promo code." };
  const promo = promotions.find((p) => p.promo_code && normaliseCode(p.promo_code) === wanted);
  if (!promo) return { ok: false, reason: "We don't recognise that code. Check the spelling and try again." };
  const e = promotionEligibility(promo, ctx);
  return e.ok ? { ok: true, promotion: promo } : { ok: false, reason: e.reason };
}

export interface BestPromotion {
  promotion: Promotion | null;
  discount: number;
}

/** The single best eligible promotion: automatic ones plus the entered code (if valid). Never stacks. */
export function selectBestPromotion(
  promotions: Promotion[],
  ctx: PromoContext,
  subtotal: number,
  validCode: Promotion | null = null,
): BestPromotion {
  const candidates = promotions.filter((p) => p.promo_code === null && promotionEligibility(p, ctx).ok);
  if (validCode) candidates.push(validCode);
  let best: BestPromotion = { promotion: null, discount: 0 };
  for (const p of candidates) {
    const d = discountFor(p, subtotal);
    if (d > best.discount) best = { promotion: p, discount: d };
  }
  return best;
}

// ---------------------------------------------------------------- full quote

export interface QuoteInput {
  rates: Rates;
  bikeId: string;
  startIso: string;
  endIso: string;
  quantity: number;
  promotions: Promotion[];
  promoCode?: string | null;
}

export interface CodeResult {
  code: string;
  status: "applied" | "not_best" | "invalid";
  message: string;
}

export interface Quote {
  hours: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  promotion: Promotion | null;
  codeResult: CodeResult | null;
  /** The base calculation, e.g. "2 weeks × $55 + 3 days × $10" */
  baseText: string;
  /** Full readable breakdown, e.g. "2 weeks × $55 + 3 days × $10 = $140 · Festive Season −15% = $119" */
  summary: string;
}

export function quote(input: QuoteInput): Quote {
  const hours = rentalHours(input.startIso, input.endIso);
  const quantity = Math.max(1, Math.floor(input.quantity));
  const unit = basePrice(hours, input.rates);
  const subtotal = round2(unit.amount * quantity);
  const ctx: PromoContext = { bikeId: input.bikeId, startIso: input.startIso, hours };

  let codeCheck: CodeCheck | null = null;
  if (input.promoCode && input.promoCode.trim()) codeCheck = validatePromoCode(input.promoCode, input.promotions, ctx);
  const validCode = codeCheck?.ok ? codeCheck.promotion : null;
  const best = selectBestPromotion(input.promotions, ctx, subtotal, validCode);

  let codeResult: CodeResult | null = null;
  if (input.promoCode && codeCheck) {
    const code = normaliseCode(input.promoCode);
    if (!codeCheck.ok) codeResult = { code, status: "invalid", message: codeCheck.reason };
    else if (best.promotion?.id === codeCheck.promotion.id)
      codeResult = { code, status: "applied", message: `${code} applied: ${discountLabel(codeCheck.promotion)}.` };
    else
      codeResult = {
        code,
        status: "not_best",
        message: `${best.promotion?.name ?? "Another offer"} already gives you a better deal, so we applied that instead. Offers can't be combined.`,
      };
  }

  const baseText = quantity > 1 ? `(${unit.text}) × ${quantity} bikes` : unit.text;
  let summary = `${baseText} = ${$(subtotal)}`;
  const total = round2(subtotal - best.discount);
  if (best.promotion) summary += ` · ${best.promotion.name} ${discountLabel(best.promotion)} = ${$(total)}`;

  return {
    hours,
    quantity,
    unitPrice: unit.amount,
    subtotal,
    discount: best.discount,
    total,
    promotion: best.promotion,
    codeResult,
    baseText,
    summary,
  };
}

/** Plain-English summary, e.g. "15% off all bikes, 1 Dec 2026 – 15 Jan 2027, applied automatically". */
export function describePromotion(
  p: Pick<Promotion, "discount_type" | "discount_value" | "applies_to" | "bike_ids" | "starts_at" | "ends_at" | "promo_code" | "min_rental_hours">,
  bikeNames: Record<string, string> = {},
): string {
  const amount = p.discount_type === "percentage" ? `${p.discount_value || 0}% off` : `${$(p.discount_value || 0)} off`;
  const names = p.bike_ids.map((id) => bikeNames[id]).filter(Boolean);
  const target = p.applies_to === "all_bikes" ? "all bikes" : names.length ? names.join(", ") : "selected bikes (none chosen yet)";
  const dates = p.starts_at && p.ends_at ? `, ${formatDate(p.starts_at)} – ${formatDate(p.ends_at)}` : "";
  const min = p.min_rental_hours ? `, for rentals of ${plural(p.min_rental_hours, "hour")} or more` : "";
  const how = p.promo_code ? `, with code ${normaliseCode(p.promo_code)}` : ", applied automatically";
  return `${amount} ${target}${dates}${min}${how}`;
}

/** Lowest daily rate across bikes — used for "Starting from $X / day". */
export function lowestDailyRate(bikes: Rates[]): number | null {
  return bikes.length ? Math.min(...bikes.map((b) => b.daily_rate)) : null;
}
