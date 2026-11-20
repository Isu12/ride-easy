/** Realistic demo data, generated relative to today so the demo always looks live. */
import { quote } from "./pricing";
import { addDays, fromLocalInput, scDate } from "./time";
import type { Bike, BikeCategory, BikeImage, Booking, BookingStatus, Database, PaymentMethod, Promotion, Settings } from "./types";

export const DB_VERSION = 3;

const IMG = {
  cruiser: "/images/island-cruiser.jpg",
  mountain: "/images/mountain-bike.jpg",
  ebike: "/images/e-bike.jpg",
  beach: "/images/hero-beach.jpg",
};

const categories: BikeCategory[] = [
  { id: "cat-city", name: "City & Comfort", slug: "city-comfort", description: "Relaxed upright bikes for the coastal road.", sort_order: 1 },
  { id: "cat-mtb", name: "Mountain", slug: "mountain", description: "Sturdy bikes for trails and hills.", sort_order: 2 },
  { id: "cat-ebike", name: "E-Bike", slug: "e-bike", description: "Electric assist for the steeper climbs.", sort_order: 3 },
  { id: "cat-kids", name: "Kids", slug: "kids", description: "Smaller frames for young explorers.", sort_order: 4 },
];

type BikeSeed = Omit<Bike, "id" | "sort_order" | "is_active"> & { image: string };

const bikeSeeds: BikeSeed[] = [
  {
    name: "Island Cruiser with Basket", slug: "island-cruiser-with-basket", category_id: "cat-city",
    short_description: "Slow days. Scenic routes. Your perfect island companion.",
    description: "Comfortable, well-maintained and ready for your next island adventure. An upright riding position, a soft saddle and a roomy front basket for towels, snacks and a camera. Helmet and lock included.",
    features: ["Front basket", "7 gears", "Helmet included"], frame_size: "M", rider_height_min_cm: 150, rider_height_max_cm: 190,
    gear_count: 7, has_basket: true, is_electric: false, quantity_owned: 10, hourly_rate: 3, daily_rate: 10, weekly_rate: 55, is_featured: true, image: IMG.cruiser,
  },
  {
    name: "Mahé Trail Mountain Bike", slug: "mahe-trail-mountain-bike", category_id: "cat-mtb",
    short_description: "Go a little further, from coastal paths to island trails.",
    description: "A light aluminium hardtail with front suspension and grippy tyres for the inland plantation trails. Disc brakes keep you in control on the steeper descents.",
    features: ["Front suspension", "21 gears", "Disc brakes"], frame_size: "L", rider_height_min_cm: 160, rider_height_max_cm: 195,
    gear_count: 21, has_basket: false, is_electric: false, quantity_owned: 6, hourly_rate: 4, daily_rate: 15, weekly_rate: 80, is_featured: true, image: IMG.mountain,
  },
  {
    name: "Praslin E-Bike", slug: "praslin-e-bike", category_id: "cat-ebike",
    short_description: "A little extra power for a lot more exploring.",
    description: "Pedal-assist with a 50 km range, so the hill to the viewpoint feels like a flat beach road. Charged overnight at reception and ready every morning.",
    features: ["Electric assist", "50 km range", "Rear rack"], frame_size: "M", rider_height_min_cm: 155, rider_height_max_cm: 190,
    gear_count: 8, has_basket: false, is_electric: true, quantity_owned: 4, hourly_rate: 8, daily_rate: 35, weekly_rate: 190, is_featured: true, image: IMG.ebike,
  },
  {
    name: "Kids’ Explorer 20\"", slug: "kids-explorer-20", category_id: "cat-kids",
    short_description: "Big adventures for your little island explorers.",
    description: "A light 20-inch bike with easy gears and a bell. Kids' helmet included. Best for ages 6–10.",
    features: ["20\" wheels", "6 gears", "Kids' helmet"], frame_size: "XS", rider_height_min_cm: 115, rider_height_max_cm: 140,
    gear_count: 6, has_basket: false, is_electric: false, quantity_owned: 4, hourly_rate: 2, daily_rate: 7, weekly_rate: 35, is_featured: false, image: IMG.cruiser,
  },
  {
    name: "Island Tandem", slug: "island-tandem", category_id: "cat-city",
    short_description: "Share the ride and make twice the memories.",
    description: "A classic bicycle built for two, perfect for couples on the flat beach road. Rear basket for your picnic.",
    features: ["Seats two", "Rear basket", "7 gears"], frame_size: "L", rider_height_min_cm: 155, rider_height_max_cm: 195,
    gear_count: 7, has_basket: true, is_electric: false, quantity_owned: 2, hourly_rate: 6, daily_rate: 22, weekly_rate: 120, is_featured: false, image: IMG.cruiser,
  },
  {
    name: "Premium Hybrid", slug: "premium-hybrid", category_id: "cat-mtb",
    short_description: "Lightweight, versatile and made to go the distance.",
    description: "Fast on tarmac and steady on gravel. Hydraulic brakes and 24 gears for riders who want to cover the whole island in a day.",
    features: ["Lightweight frame", "24 gears", "Hydraulic brakes"], frame_size: "M/L", rider_height_min_cm: 160, rider_height_max_cm: 192,
    gear_count: 24, has_basket: false, is_electric: false, quantity_owned: 4, hourly_rate: 5, daily_rate: 18, weekly_rate: 95, is_featured: false, image: IMG.mountain,
  },
  {
    name: "Step-through Comfort", slug: "step-through-comfort", category_id: "cat-city",
    short_description: "Easy riding for a wonderfully unhurried holiday.",
    description: "A low step-through frame that's easy to get on and off, with a rear basket and a wide, soft saddle.",
    features: ["Low step frame", "Rear basket", "3 gears"], frame_size: "S/M", rider_height_min_cm: 145, rider_height_max_cm: 185,
    gear_count: 3, has_basket: true, is_electric: false, quantity_owned: 6, hourly_rate: 3, daily_rate: 12, weekly_rate: 65, is_featured: false, image: IMG.cruiser,
  },
  {
    name: "Beach Fat-Tyre Cruiser", slug: "beach-fat-tyre-cruiser", category_id: "cat-mtb",
    short_description: "Find your own way with wide tyres and easy handling.",
    description: "Extra-wide tyres float over sand tracks and rough paths. Relaxed geometry and 7 gears for easy cruising.",
    features: ["Wide tyres", "7 gears"], frame_size: "M", rider_height_min_cm: 155, rider_height_max_cm: 190,
    gear_count: 7, has_basket: false, is_electric: false, quantity_owned: 3, hourly_rate: 5, daily_rate: 17, weekly_rate: 90, is_featured: false, image: IMG.mountain,
  },
];

const settings: Settings = {
  business_name: "Ride Easy Bike Rentals",
  phone: "+248 4 000 000",
  whatsapp: "+248 2 500 0000",
  email: "hello@rideeasy.test",
  opening_hours: "Daily · 7:00 AM – 7:00 PM",
  pickup_location_text:
    "Collect your bicycle at the reception of Island Breeze Hotel (fictional demo hotel), La Digue. Bring your booking reference and a photo ID.",
  terms_text: [
    "1. Rentals are charged by the hour, day or week. We always apply the lowest price for your rental time.",
    "2. A helmet and lock are included with every bike. Please lock the bike whenever you leave it.",
    "3. Please return the bike to reception by the return time on your booking. Late returns are charged at the hourly rate.",
    "4. Riders are responsible for the bike while it is in their care. Report any damage or problems to reception straight away.",
    "5. Children under 16 must ride with an adult.",
    "6. Free cancellation up to 24 hours before pick-up. Cancellation requests are reviewed by the hotel.",
    "7. This is a prototype. No real payments are taken and no booking is binding.",
  ].join("\n\n"),
};

// Deterministic pseudo-random numbers so the seed looks the same every reset
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeReference(rand: () => number = Math.random): string {
  let r = "RE-";
  for (let i = 0; i < 6; i++) r += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length)];
  return r;
}

const guests = [
  ["Sophie Laurent", "France", "+33 6 12 34 56 78"],
  ["Lukas Weber", "Germany", "+49 151 2345 6789"],
  ["Emma Thompson", "United Kingdom", "+44 7700 900123"],
  ["Marco Rossi", "Italy", "+39 347 123 4567"],
  ["Aisha Al Mansoori", "United Arab Emirates", "+971 50 123 4567"],
  ["Priya Sharma", "India", "+91 98765 43210"],
  ["Johan Andersson", "Sweden", "+46 70 123 45 67"],
  ["Olivia Martin", "Australia", "+61 412 345 678"],
  ["Kenji Tanaka", "Japan", "+81 90 1234 5678"],
  ["Isabel García", "Spain", "+34 612 345 678"],
  ["Noah Müller", "Switzerland", "+41 79 123 45 67"],
  ["Anna Kowalska", "Poland", "+48 512 345 678"],
  ["Daniel Okafor", "Nigeria", "+234 803 123 4567"],
  ["Chloé Dubois", "Belgium", "+32 470 12 34 56"],
  ["Ethan Brooks", "United States", "+1 415 555 0134"],
  ["Mia Jensen", "Denmark", "+45 20 12 34 56"],
  ["Lucas Silva", "Brazil", "+55 11 91234 5678"],
  ["Hannah Fischer", "Austria", "+43 664 1234567"],
  ["Ravi Perera", "Sri Lanka", "+94 77 123 4567"],
  ["Elena Petrova", "Bulgaria", "+359 88 123 4567"],
  ["Thomas Dupont", "France", "+33 7 98 76 54 32"],
  ["Grace Wanjiru", "Kenya", "+254 712 345678"],
  ["Sanne de Vries", "Netherlands", "+31 6 12345678"],
  ["Ahmed Hassan", "Egypt", "+20 100 123 4567"],
  ["Charlotte Evans", "United Kingdom", "+44 7700 900456"],
  ["Matteo Bianchi", "Italy", "+39 333 765 4321"],
  ["Yuki Sato", "Japan", "+81 80 9876 5432"],
  ["Liam O'Connor", "Ireland", "+353 87 123 4567"],
  ["Zara Khan", "South Africa", "+27 82 123 4567"],
  ["Felix Wagner", "Germany", "+49 160 9876 5432"],
];

const durations = [4, 9, 24, 48, 72, 7 * 24, 10 * 24];
const pickupHours = [8, 9, 10, 14];

export function createSeedDatabase(now: Date = new Date()): Database {
  const today = scDate(now);
  const rand = rng(20261120);

  const bikes: Bike[] = bikeSeeds.map(({ image: _image, ...b }, i) => ({ ...b, id: `bike-${i + 1}`, sort_order: i + 1, is_active: true }));
  const bike_images: BikeImage[] = bikeSeeds.flatMap((b, i) => [
    { id: `img-${i + 1}-a`, bike_id: `bike-${i + 1}`, storage_path: b.image, is_primary: true, sort_order: 1 },
    { id: `img-${i + 1}-b`, bike_id: `bike-${i + 1}`, storage_path: IMG.beach, is_primary: false, sort_order: 2 },
  ]);

  const promotions: Promotion[] = [
    {
      id: "promo-festive", name: "Festive Season", description: "Your island escape, now 15% less. Applied automatically. No code needed.",
      discount_type: "percentage", discount_value: 15, starts_at: addDays(today, -5), ends_at: addDays(today, 56),
      applies_to: "all_bikes", promo_code: null, min_rental_hours: null, is_active: true, bike_ids: [],
    },
    {
      id: "promo-green", name: "Green Season E-Bike Week", description: "20% off e-bikes for rentals of 3 days or more.",
      discount_type: "percentage", discount_value: 20, starts_at: addDays(today, 60), ends_at: addDays(today, 90),
      applies_to: "selected_bikes", promo_code: null, min_rental_hours: 72, is_active: true, bike_ids: ["bike-3"],
    },
    {
      id: "promo-easter", name: "Easter Rides", description: "10% off every rental over Easter.",
      discount_type: "percentage", discount_value: 10, starts_at: addDays(today, -240), ends_at: addDays(today, -225),
      applies_to: "all_bikes", promo_code: null, min_rental_hours: null, is_active: true, bike_ids: [],
    },
    {
      id: "promo-welcome", name: "Welcome offer", description: "$10 off rentals of 24 hours or more.",
      discount_type: "fixed_amount", discount_value: 10, starts_at: addDays(today, -60), ends_at: addDays(today, 300),
      applies_to: "all_bikes", promo_code: "WELCOME10", min_rental_hours: 24, is_active: true, bike_ids: [],
    },
  ];

  const bookings: Booking[] = guests.map(([name, country, phone], i) => {
    // Spread over the past 3 weeks and next 3 weeks; a few start or end today for the dashboard
    let dayOffset = Math.round(-21 + (i * 42) / guests.length + (rand() * 2 - 1));
    let hours = durations[Math.floor(rand() * durations.length)];
    if (i < 3) dayOffset = 0;
    if (i === 3 || i === 4) { dayOffset = -2; hours = 48; } // returns today
    const startHour = i < 3 ? pickupHours[i + 1] : pickupHours[Math.floor(rand() * pickupHours.length)];
    const start_at = fromLocalInput(`${addDays(today, dayOffset)}T${String(startHour).padStart(2, "0")}:00`)!;
    const end_at = new Date(new Date(start_at).getTime() + hours * 3600_000).toISOString();
    const bike = bikes[Math.floor(rand() * bikes.length)];
    const quantity = rand() < 0.25 ? 2 : 1;
    const created_at = new Date(new Date(start_at).getTime() - (2 + Math.floor(rand() * 10)) * 86400_000).toISOString();

    const q = quote({ rates: bike, bikeId: bike.id, startIso: start_at, endIso: end_at, quantity, promotions,
      promoCode: rand() < 0.2 ? "WELCOME10" : null });

    const nowMs = now.getTime();
    let status: BookingStatus;
    if (new Date(end_at).getTime() <= nowMs) status = "completed";
    else if (new Date(start_at).getTime() <= nowMs) status = "active";
    else status = "confirmed";
    if (i < 3) status = "confirmed"; // today's pick-ups (not yet collected)
    if (i === 3 || i === 4) status = "active"; // out now, due back today
    if (i % 9 === 8) status = "cancelled";

    const cancellation_requested = status === "confirmed" && (i === 25 || i === 28);
    const method: PaymentMethod = (["card", "card", "paypal", "google_pay"] as const)[Math.floor(rand() * 4)];
    const email = `${name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}.${i + 1}@example.com`;
    const id = `bk-${i + 1}`;
    const staying = rand() < 0.75;

    return {
      id, reference: makeReference(rand), status, cancellation_requested,
      guest_name: name, guest_email: email, guest_phone: phone, guest_country: country,
      staying_at_hotel: staying, room_number: staying ? String(100 + Math.floor(rand() * 120)) : null,
      start_at, end_at, pickup_note: i % 5 === 0 ? "We'd like two helmets please." : null,
      subtotal: q.subtotal, discount_total: q.discount, total: q.total, currency: "USD",
      promotion_id: q.promotion?.id ?? null, promo_code_used: q.promotion?.promo_code ?? null,
      payment_method: method,
      payment_status: status === "cancelled" ? "refunded" : "paid",
      paid_at: created_at, admin_notes: null, created_at,
      picked_up_at: status === "active" || status === "completed" ? start_at : null,
      returned_at: status === "completed" ? end_at : null,
      items: [{ id: `${id}-1`, booking_id: id, bike_id: bike.id, quantity, price_breakdown: { lines: [q.baseText], summary: q.summary }, line_total: q.total }],
    };
  });

  return {
    version: DB_VERSION,
    bike_categories: categories,
    bikes,
    bike_images,
    promotions,
    bookings,
    settings,
    user_roles: [{ user_email: "admin@rideeasy.test", role: "admin" }],
    users: [{ email: "admin@rideeasy.test", password: "RideEasy@2026" }],
  };
}
