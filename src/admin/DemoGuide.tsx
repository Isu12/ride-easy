import { CheckCircle2, Clock, ExternalLink, Palette, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminTitle } from "./AdminLayout";

const TOURIST = [
  { step: "Open the home page", detail: "Point out the hero, the live Festive Season banner and “starts at $7 / day”.", to: "/" },
  { step: "Search dates", detail: "Pick tomorrow 09:00 → the day after 18:00, 1 bike, then Find my ride. Every card shows live availability.", to: "/" },
  { step: "Open a bike", detail: "Island Cruiser with Basket: swipe the photos, show the size guide and hour/day/week prices.", to: "/bikes/island-cruiser-with-basket" },
  { step: "Watch the live price", detail: "Change the return time: hours cap at the daily price, days at the weekly price. The breakdown explains it.", to: null },
  { step: "Apply WELCOME10", detail: "On a 24 h+ rental. If the 15% Festive offer is better, the site explains it kept that one. Offers never stack.", to: null },
  { step: "Checkout", detail: "Fill in guest details, toggle “staying at this hotel”, pick Card and agree to the terms.", to: null },
  { step: "Pay with 4242 4242 4242 4242", detail: "Any future expiry and CVC. Show the 15-minute hold timer. 4000 0000 0000 0002 shows a decline.", to: null },
  { step: "Confirmation", detail: "Copy the reference, add to calendar (.ics) and Print / save as PDF.", to: null },
  { step: "Find my booking", detail: "Enter the reference + email, show the status timeline and request a cancellation.", to: "/my-booking" },
];

const ADMIN = [
  { step: "Add a new bike with photos", detail: "Bikes → Add bike. Upload 2–3 photos, drag to reorder, set the main photo.", to: "/admin/bikes/new" },
  { step: "Change a price", detail: "Edit any bike's daily price and save. Open the public site: it's already updated.", to: "/admin/bikes" },
  { step: "Create a seasonal promotion", detail: "Promotions → New. Read the plain-English preview as you type. Make it automatic, starting today.", to: "/admin/promotions" },
  { step: "See it live on the home page", detail: "The promotion banner and bike prices reflect it straight away.", to: "/" },
  { step: "Pick up and return a booking", detail: "Bookings → open today's pick-up → Mark picked up, then Mark returned (each asks to confirm).", to: "/admin/bookings" },
  { step: "View the dashboard", detail: "Pick-ups, returns, bikes out, revenue, cancellation requests and the 30-day chart.", to: "/admin" },
];

const NOT_INCLUDED = [
  "Real payments and refunds (all payments are simulated)",
  "Real email sending (confirmations, cancellation replies)",
  "Multiple languages",
  "Multiple currencies (USD only)",
  "Delivery to other hotels",
  "Deposits and damage handling",
  "Staff roles beyond a single admin",
  "The mobile app (pricing and availability logic is already reusable for it)",
  "A hosted database: demo data lives in this browser and can be reset in Settings",
];

function Steps({ title, items }: { title: string; items: { step: string; detail: string; to: string | null }[] }) {
  return (
    <section className="card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ol className="mt-4 space-y-4">
        {items.map((s, i) => (
          <li key={s.step} className="flex gap-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-sm font-bold text-primary">{i + 1}</span>
            <div>
              <p className="font-semibold">{s.step}{s.to && <Link to={s.to} target={s.to.startsWith("/admin") ? undefined : "_blank"} className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">open <ExternalLink size={13} /></Link>}</p>
              <p className="text-sm text-ink-soft">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function DemoGuide() {
  return (
    <div className="max-w-5xl">
      <AdminTitle title="Demo guide">
        <span className="inline-flex items-center gap-1.5"><Clock size={16} aria-hidden /> A 5-minute walkthrough for the client.</span>
      </AdminTitle>

      <section className="card mb-6 flex gap-4 p-6">
        <Palette className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold">Start with the colours</h2>
          <p className="mt-1 text-ink-soft">
            Use the <b>Palette</b> button in the bottom-left corner to switch between Coastal Ride, Island Trail and Sunrise Pedal.
            Each matches one of the hotel website palettes, and the whole site, including this admin area, changes instantly.
            “Share link” copies a link that opens the site in the chosen palette.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Steps title="Tourist journey (≈3 min)" items={TOURIST} />
        <Steps title="Hotel admin (≈2 min)" items={ADMIN} />
      </div>

      <section className="card mt-6 grid gap-6 p-6 md:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><XCircle size={19} className="text-status-overdue" aria-hidden /> Simulated or not included yet</h2>
          <ul className="mt-3 space-y-2 text-ink-soft">{NOT_INCLUDED.map((x) => <li key={x} className="flex gap-2"><span aria-hidden>•</span>{x}</li>)}</ul>
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CheckCircle2 size={19} className="text-status-available" aria-hidden /> Working in this prototype</h2>
          <ul className="mt-3 space-y-2 text-ink-soft">
            {["Live availability with a 15-minute payment hold", "Fair pricing with hourly / daily / weekly caps", "Automatic promotions and promo codes (best one wins)",
              "Bike, photo, category, promotion and settings management", "Booking lifecycle: pay, pick up, return, cancel, refund", "Three switchable colour palettes"].map((x) => (
              <li key={x} className="flex gap-2"><span aria-hidden>•</span>{x}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
