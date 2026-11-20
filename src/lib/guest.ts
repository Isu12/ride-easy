/** Guest-side helpers: country list and the bookings this browser just made. */

export const COUNTRIES: { name: string; dial: string }[] = [
  { name: "Seychelles", dial: "+248" }, { name: "Australia", dial: "+61" }, { name: "Austria", dial: "+43" },
  { name: "Belgium", dial: "+32" }, { name: "Brazil", dial: "+55" }, { name: "Canada", dial: "+1" },
  { name: "China", dial: "+86" }, { name: "Denmark", dial: "+45" }, { name: "France", dial: "+33" },
  { name: "Germany", dial: "+49" }, { name: "India", dial: "+91" }, { name: "Ireland", dial: "+353" },
  { name: "Italy", dial: "+39" }, { name: "Japan", dial: "+81" }, { name: "Kenya", dial: "+254" },
  { name: "Mauritius", dial: "+230" }, { name: "Netherlands", dial: "+31" }, { name: "Poland", dial: "+48" },
  { name: "Russia", dial: "+7" }, { name: "South Africa", dial: "+27" }, { name: "Spain", dial: "+34" },
  { name: "Sri Lanka", dial: "+94" }, { name: "Sweden", dial: "+46" }, { name: "Switzerland", dial: "+41" },
  { name: "United Arab Emirates", dial: "+971" }, { name: "United Kingdom", dial: "+44" }, { name: "United States", dial: "+1" },
  { name: "Other", dial: "" },
];

export const DIAL_CODES = [...new Set(COUNTRIES.map((c) => c.dial).filter(Boolean))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

const KEY = "rideeasy-recent-bookings";

/** Remember reference → email for bookings made in this browser tab, so the guest can pay and see the confirmation. */
export function rememberBooking(reference: string, email: string) {
  try {
    const all = JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}");
    all[reference] = email;
    window.sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function recentBookingEmail(reference: string): string | null {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}")[reference] ?? null;
  } catch {
    return null;
  }
}
