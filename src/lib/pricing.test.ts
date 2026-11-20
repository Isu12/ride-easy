import { describe, expect, it } from "vitest";
import { basePrice, quote, rentalHours, selectBestPromotion, validatePromoCode } from "./pricing";
import type { Promotion } from "./types";

const cruiser = { hourly_rate: 3, daily_rate: 10, weekly_rate: 55 };
const start = "2026-12-01T05:00:00.000Z"; // 1 Dec 09:00 Seychelles
const plusHours = (h: number) => new Date(new Date(start).getTime() + h * 3600_000).toISOString();

const promo = (p: Partial<Promotion>): Promotion => ({
  id: p.id ?? "p",
  name: "Promo",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  starts_at: "2026-11-01",
  ends_at: "2027-01-15",
  applies_to: "all_bikes",
  promo_code: null,
  min_rental_hours: null,
  is_active: true,
  bike_ids: [],
  ...p,
});

describe("rentalHours", () => {
  it("rounds up to the next full hour", () => {
    expect(rentalHours(start, new Date(new Date(start).getTime() + 61 * 60_000).toISOString())).toBe(2);
  });
  it("has a minimum of 1 hour", () => {
    expect(rentalHours(start, new Date(new Date(start).getTime() + 10 * 60_000).toISOString())).toBe(1);
  });
});

describe("basePrice", () => {
  it("charges by the hour under the daily cap", () => {
    expect(basePrice(3, cruiser)).toEqual({ amount: 9, text: "3 hours × $3" });
  });
  it("caps hours at the daily rate", () => {
    const p = basePrice(9, cruiser);
    expect(p.amount).toBe(10);
    expect(p.text).toBe("9 hours (daily cap $10)");
  });
  it("rolls 24 hours over into a day", () => {
    expect(basePrice(24, cruiser).amount).toBe(10);
    expect(basePrice(26, cruiser)).toEqual({ amount: 16, text: "1 day × $10 + 2 hours × $3" });
  });
  it("caps leftover hours at one daily rate", () => {
    expect(basePrice(2 * 24 + 20, cruiser).amount).toBe(30);
  });
  it("caps several days at the weekly rate", () => {
    const p = basePrice(6 * 24 + 5, cruiser); // 6 days × 10 + 5h cap 10 = 70 > 55
    expect(p.amount).toBe(55);
    expect(p.text).toContain("weekly cap $55");
  });
  it("rolls days over into weeks", () => {
    const p = basePrice(17 * 24, cruiser);
    expect(p).toEqual({ amount: 140, text: "2 weeks × $55 + 3 days × $10" });
  });
  it("caps the leftover after full weeks at one weekly rate", () => {
    expect(basePrice(168 + 6 * 24 + 23, cruiser).amount).toBe(110);
  });
});

describe("promotions", () => {
  const festive = promo({ id: "festive", name: "Festive Season", discount_value: 15 });
  const welcome = promo({ id: "welcome", name: "Welcome", discount_type: "fixed_amount", discount_value: 10, promo_code: "WELCOME10", min_rental_hours: 24 });
  const expired = promo({ id: "old", name: "Old", discount_value: 50, starts_at: "2026-01-01", ends_at: "2026-02-01" });

  it("picks the single best eligible promotion and never stacks", () => {
    const ctx = { bikeId: "b1", startIso: start, hours: 17 * 24 };
    const best = selectBestPromotion([festive, welcome, expired], ctx, 140, welcome);
    expect(best.promotion?.id).toBe("festive"); // 15% of 140 = 21 > 10
    expect(best.discount).toBe(21);
  });

  it("prefers the code when it beats the automatic promotion", () => {
    const ctx = { bikeId: "b1", startIso: start, hours: 24 };
    const best = selectBestPromotion([festive, welcome], ctx, 10, welcome);
    expect(best.promotion?.id).toBe("welcome"); // $10 > 15% of $10
    expect(best.discount).toBe(10);
  });

  it("validates promo codes case-insensitively", () => {
    const ctx = { bikeId: "b1", startIso: start, hours: 48 };
    expect(validatePromoCode("welcome10", [welcome], ctx).ok).toBe(true);
    expect(validatePromoCode("NOPE", [welcome], ctx).ok).toBe(false);
  });

  it("rejects codes below the minimum rental hours", () => {
    const r = validatePromoCode("WELCOME10", [welcome], { bikeId: "b1", startIso: start, hours: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("24 hours");
  });

  it("rejects promotions outside their date range", () => {
    const r = validatePromoCode("LATE", [promo({ promo_code: "LATE", starts_at: "2027-03-01", ends_at: "2027-03-31" })], {
      bikeId: "b1", startIso: start, hours: 5,
    });
    expect(r.ok).toBe(false);
  });

  it("respects selected-bike promotions", () => {
    const only = promo({ applies_to: "selected_bikes", bike_ids: ["b2"] });
    expect(selectBestPromotion([only], { bikeId: "b1", startIso: start, hours: 5 }, 10).promotion).toBeNull();
    expect(selectBestPromotion([only], { bikeId: "b2", startIso: start, hours: 5 }, 10).promotion).not.toBeNull();
  });
});

describe("quote", () => {
  it("returns the readable breakdown from the brief", () => {
    const q = quote({
      rates: cruiser, bikeId: "b1", startIso: start, endIso: plusHours(17 * 24), quantity: 1,
      promotions: [promo({ name: "Festive Season", discount_value: 15 })],
    });
    expect(q.summary).toBe("2 weeks × $55 + 3 days × $10 = $140 · Festive Season −15% = $119");
    expect(q.total).toBe(119);
  });

  it("multiplies by quantity", () => {
    const q = quote({ rates: cruiser, bikeId: "b1", startIso: start, endIso: plusHours(3), quantity: 2, promotions: [] });
    expect(q.subtotal).toBe(18);
    expect(q.summary).toBe("(3 hours × $3) × 2 bikes = $18");
  });

  it("explains when an entered code is beaten by a better offer", () => {
    const q = quote({
      rates: cruiser, bikeId: "b1", startIso: start, endIso: plusHours(17 * 24), quantity: 1, promoCode: "welcome10",
      promotions: [
        promo({ id: "f", name: "Festive Season", discount_value: 15 }),
        promo({ id: "w", discount_type: "fixed_amount", discount_value: 10, promo_code: "WELCOME10", min_rental_hours: 24 }),
      ],
    });
    expect(q.codeResult?.status).toBe("not_best");
    expect(q.discount).toBe(21);
  });
});
