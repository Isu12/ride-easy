import { CalendarPlus, CheckCircle2, Copy, MapPin, Printer } from "lucide-react";
import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { BookingDetails } from "@/components/booking";
import { Button, ButtonLink, Skeleton } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { getBookingByReference, getSettings, listBikes } from "@/lib/api";
import { recentBookingEmail } from "@/lib/guest";
import { bookingIcs, downloadFile } from "@/lib/ics";

export default function Confirmation() {
  const { reference = "" } = useParams();
  const email = recentBookingEmail(reference);
  const [copied, setCopied] = useState(false);
  const { data, loading } = useData(async () => {
    if (!email) return null;
    const [booking, bikes, settings] = await Promise.all([getBookingByReference(reference, email), listBikes(), getSettings()]);
    return { booking, bikes, settings };
  }, [reference]);

  // Only the browser that booked can open this page directly; anyone else looks it up with their email.
  if (!email) return <Navigate to={`/my-booking?ref=${encodeURIComponent(reference)}`} replace />;
  if (loading || !data) return <div className="container-page max-w-3xl py-14"><Skeleton className="h-[560px] rounded-2xl" /></div>;
  const { booking, bikes, settings } = data;
  if (!booking) return <Navigate to="/my-booking" replace />;
  if (booking.payment_status !== "paid" && booking.status === "pending_payment") return <Navigate to={`/pay/${reference}`} replace />;

  const bikeName = bikes.find((b) => b.id === booking.items[0]?.bike_id)?.name ?? "Bike";

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(booking!.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the reference is still visible to copy by hand */
    }
  }

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="text-center">
        <CheckCircle2 size={64} className="mx-auto text-status-available" aria-hidden />
        <h1 className="h-display mt-4 text-5xl text-status-available sm:text-6xl">You're all set!</h1>
        <p className="mt-2 text-lg text-ink-soft">Your booking is confirmed and paid. See you at reception.</p>
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="flex flex-col items-center gap-2 border-b border-line bg-status-available-bg px-6 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-status-available">Booking reference</p>
          <div className="flex items-center gap-3">
            <p className="font-mono text-4xl font-bold tracking-wider text-ink sm:text-5xl">{booking.reference}</p>
            <button onClick={copyRef} className="no-print grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-soft hover:bg-tint" aria-label="Copy booking reference">
              <Copy size={18} />
            </button>
          </div>
          <p className="h-5 text-sm text-status-available" aria-live="polite">{copied ? "Copied!" : ""}</p>
        </div>
        <div className="p-6 sm:p-8">
          <BookingDetails booking={booking} bikes={bikes} />
          <div className="mt-6 flex gap-3 rounded-xl border border-line p-4">
            <MapPin className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">Pick-up instructions</p>
              <p className="text-ink-soft">{settings.pickup_location_text}</p>
              <p className="mt-1 text-sm text-ink-soft">Reception hours: {settings.opening_hours} · Questions? {settings.phone}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={() => downloadFile(`ride-easy-${booking.reference}.ics`, bookingIcs(booking, bikeName, settings.pickup_location_text))}>
          <CalendarPlus size={18} /> Add to calendar
        </Button>
        <Button variant="outline" onClick={() => window.print()}><Printer size={18} /> Print / save as PDF</Button>
        <ButtonLink to="/" variant="ghost">Back to home</ButtonLink>
      </div>
    </div>
  );
}
