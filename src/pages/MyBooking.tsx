import { zodResolver } from "@hookform/resolvers/zod";
import { Search, SendHorizonal } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { BookingDetails, StatusBadge, StatusTimeline } from "@/components/booking";
import { Alert, Button, ConfirmDialog, Field, PageHeading } from "@/components/ui";
import { ApiError, getBookingByReference, listBikes, requestCancellation } from "@/lib/api";
import type { Bike, Booking } from "@/lib/types";

const schema = z.object({
  reference: z.string().trim().regex(/^RE-?[A-Za-z0-9]{6}$/i, "References look like RE-7K3F9Q."),
  email: z.string().trim().email("Please enter the email you booked with."),
});
type Values = z.infer<typeof schema>;

export default function MyBooking() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<{ booking: Booking; bikes: Bike[]; email: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { reference: params.get("ref") ?? "", email: "" },
  });

  async function onSubmit(v: Values) {
    setNotFound(false);
    const ref = v.reference.toUpperCase().replace(/^RE-?/, "RE-");
    const [booking, bikes] = await Promise.all([getBookingByReference(ref, v.email), listBikes()]);
    if (!booking) {
      setResult(null);
      setNotFound(true);
    } else setResult({ booking, bikes, email: v.email });
  }

  async function sendCancellation() {
    if (!result) return;
    setRequesting(true);
    setRequestError(null);
    try {
      const booking = await requestCancellation(result.booking.reference, result.email);
      setResult({ ...result, booking });
      setConfirmOpen(false);
    } catch (e) {
      setRequestError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setRequesting(false);
    }
  }

  const b = result?.booking;
  const canCancel = b && !b.cancellation_requested && (b.status === "confirmed" || b.status === "pending_payment");

  return (
    <div className="container-page max-w-3xl py-14">
      <PageHeading center eyebrow="Your adventure, all in one place" title="Find my booking">
        Check your rental details or send a cancellation request.
      </PageHeading>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-6 sm:p-8">
        <Field label="Booking reference" htmlFor="ref" error={errors.reference?.message}>
          <input id="ref" className="field font-mono uppercase placeholder:font-sans" placeholder="RE-XXXXXX" autoComplete="off" {...register("reference")} aria-invalid={!!errors.reference} />
        </Field>
        <Field label="Email address" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" className="field" placeholder="you@example.com" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}><Search size={18} /> Find my booking</Button>
        {notFound && <Alert>We couldn't find a booking with that reference and email. Please check both and try again.</Alert>}
      </form>

      {b && result && (
        <section className="card mt-8 animate-fade-up p-6 sm:p-8" aria-label="Your booking">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-2xl font-bold">{b.reference}</p>
            <StatusBadge status={b.status} />
          </div>
          <div className="my-7"><StatusTimeline booking={b} /></div>
          <BookingDetails booking={b} bikes={result.bikes} />
          <div className="mt-6 border-t border-line pt-6">
            {b.cancellation_requested ? (
              <Alert tone="available">We've sent your request to the hotel. They'll be in touch by email shortly.</Alert>
            ) : canCancel ? (
              <Button variant="outline" onClick={() => setConfirmOpen(true)}><SendHorizonal size={17} /> Request cancellation</Button>
            ) : (
              <p className="text-sm text-ink-soft">Need to change something? Please contact reception.</p>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog open={confirmOpen} onCancel={() => setConfirmOpen(false)} onConfirm={sendCancellation} loading={requesting}
        title="Request a cancellation?" confirmLabel="Send request" danger
        message={<>The hotel will review your request. Free cancellation applies up to 24 hours before pick-up.{requestError && <Alert className="mt-3">{requestError}</Alert>}</>} />
    </div>
  );
}
