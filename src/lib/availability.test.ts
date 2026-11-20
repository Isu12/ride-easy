import { describe, expect, it } from "vitest";
import { holdsUnits, overlaps, unitsFree, validatePeriod } from "./availability";

const now = new Date("2026-12-01T00:00:00.000Z");
const iso = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();

const booking = (id: string, startH: number, endH: number, qty: number, status = "confirmed", createdMinAgo = 60) => ({
  id,
  status: status as "confirmed",
  created_at: new Date(now.getTime() - createdMinAgo * 60_000).toISOString(),
  start_at: iso(startH),
  end_at: iso(endH),
  items: [{ bike_id: "bike", quantity: qty }],
});

describe("overlaps", () => {
  it("detects overlapping periods", () => {
    expect(overlaps(iso(0), iso(5), iso(4), iso(8))).toBe(true);
  });
  it("treats back-to-back bookings as not overlapping", () => {
    expect(overlaps(iso(0), iso(5), iso(5), iso(8))).toBe(false);
  });
});

describe("holdsUnits", () => {
  it("holds pending payments for 15 minutes only", () => {
    expect(holdsUnits({ status: "pending_payment", created_at: new Date(now.getTime() - 10 * 60_000).toISOString() }, now)).toBe(true);
    expect(holdsUnits({ status: "pending_payment", created_at: new Date(now.getTime() - 16 * 60_000).toISOString() }, now)).toBe(false);
  });
  it("ignores cancelled and completed bookings", () => {
    expect(holdsUnits({ status: "cancelled", created_at: now.toISOString() }, now)).toBe(false);
    expect(holdsUnits({ status: "completed", created_at: now.toISOString() }, now)).toBe(false);
  });
});

describe("unitsFree", () => {
  const bike = { id: "bike", quantity_owned: 4 };

  it("subtracts units in overlapping bookings", () => {
    const bookings = [booking("a", 0, 10, 2), booking("b", 8, 20, 1), booking("c", 30, 40, 3)];
    expect(unitsFree(bike, bookings, iso(9), iso(12), now)).toBe(1);
    expect(unitsFree(bike, bookings, iso(21), iso(29), now)).toBe(4);
  });

  it("ignores expired payment holds", () => {
    const bookings = [booking("a", 0, 10, 4, "pending_payment", 20)];
    expect(unitsFree(bike, bookings, iso(1), iso(2), now)).toBe(4);
  });

  it("never goes below zero", () => {
    expect(unitsFree(bike, [booking("a", 0, 10, 6)], iso(1), iso(2), now)).toBe(0);
  });
});

describe("validatePeriod", () => {
  it("requires return after pick-up and at least 1 hour", () => {
    expect(validatePeriod(iso(5), iso(4), now)?.message).toBe("Return must be after pick-up.");
    expect(validatePeriod(iso(5), new Date(now.getTime() + 5.5 * 3600_000).toISOString(), now)?.message).toBe("The minimum rental is 1 hour.");
    expect(validatePeriod(iso(5), iso(8), now)).toBeNull();
  });
});
