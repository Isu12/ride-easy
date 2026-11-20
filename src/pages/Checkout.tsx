import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CreditCard, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { PriceLines, useBookingQuote } from "@/components/BookingPanel";
import { BikeImageBox } from "@/components/bikes";
import { PaymentLogo } from "@/components/payment";
import { Alert, Button, ButtonLink, EmptyState, Field, PageHeading, Skeleton, Toggle } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { ApiError, createBooking, getBikeBySlug, listBikeImages, listPublicPromotions, primaryImageFor } from "@/lib/api";
import { COUNTRIES, DIAL_CODES, rememberBooking } from "@/lib/guest";
import { TZ_LABEL, formatDateTime } from "@/lib/time";
import type { PaymentMethod } from "@/lib/types";

const schema = z
  .object({
    guest_name: z.string().trim().min(2, "Please enter your full name."),
    guest_email: z.string().trim().email("Please enter a valid email, e.g. you@example.com."),
    dial: z.string().min(1, "Choose a country code."),
    phone: z.string().trim().regex(/^[\d\s()-]{6,20}$/, "Please enter a valid phone number (digits only)."),
    guest_country: z.string().min(1, "Choose your country."),
    staying_at_hotel: z.boolean(),
    room_number: z.string().trim().max(10, "Room numbers are 10 characters or fewer."),
    pickup_note: z.string().trim().max(500, "Please keep notes under 500 characters."),
    payment_method: z.enum(["card", "paypal", "google_pay"]),
    agree: z.literal(true, { errorMap: () => ({ message: "Please agree to the rental terms to continue." }) }),
  })
  .refine((v) => !v.staying_at_hotel || v.room_number.length > 0, { path: ["room_number"], message: "Please add your room number (or switch this off)." });

type FormValues = z.input<typeof schema>;

const METHODS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "card", label: "Card", hint: "Visa, Mastercard, Amex" },
  { id: "paypal", label: "PayPal", hint: "Pay with your PayPal account" },
  { id: "google_pay", label: "Google Pay", hint: "Fast checkout on Android & Chrome" },
];

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const panel = { start: params.get("start") ?? "", end: params.get("end") ?? "", qty: Math.max(1, Number(params.get("qty")) || 1), code: params.get("code") ?? "" };

  const { data, loading } = useData(async () => {
    const bike = await getBikeBySlug(params.get("bike") ?? "");
    const [images, promotions] = await Promise.all([bike ? listBikeImages(bike.id) : [], listPublicPromotions()]);
    return { bike, images, promotions };
  }, [params.get("bike")]);

  const { startIso, endIso, periodError, q, qtyError, free } = useBookingQuote(data?.bike, data?.promotions ?? [], panel, panel.code);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { guest_name: "", guest_email: "", dial: "+44", phone: "", guest_country: "", staying_at_hotel: true, room_number: "", pickup_note: "", payment_method: "card", agree: false as unknown as true },
  });
  const staying = watch("staying_at_hotel");
  const method = watch("payment_method");

  async function onSubmit(v: FormValues) {
    if (!data?.bike || !startIso || !endIso) return;
    setSubmitError(null);
    try {
      const { reference } = await createBooking({
        bike_id: data.bike.id, quantity: panel.qty, start_at: startIso, end_at: endIso, promo_code: panel.code || null,
        guest_name: v.guest_name, guest_email: v.guest_email, guest_phone: `${v.dial} ${v.phone}`, guest_country: v.guest_country,
        staying_at_hotel: v.staying_at_hotel, room_number: v.staying_at_hotel ? v.room_number : null, pickup_note: v.pickup_note || null,
        payment_method: v.payment_method,
      });
      rememberBooking(reference, v.guest_email.trim().toLowerCase());
      navigate(`/pay/${reference}`);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "Something went wrong creating your booking. Please try again.");
    }
  }

  if (loading) {
    return <div className="container-page grid gap-8 py-14 lg:grid-cols-[1.3fr_1fr]"><Skeleton className="h-[640px] rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }
  if (!data?.bike || periodError) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Let's pick your bike and dates first" action={<ButtonLink to="/bikes">Browse bikes</ButtonLink>}>
          {periodError?.message ?? "Your booking details are missing or out of date."}
        </EmptyState>
      </div>
    );
  }
  const bike = data.bike;
  const backHref = `/bikes/${bike.slug}?${new URLSearchParams({ start: panel.start, end: panel.end, qty: String(panel.qty) })}`;

  return (
    <div className="container-page py-10">
      <Link to={backHref} className="mb-6 inline-flex items-center gap-2 font-medium text-primary hover:underline"><ArrowLeft size={17} /> Back to {bike.name}</Link>
      <PageHeading eyebrow="Almost there" title="Your booking" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <section className="card p-6 sm:p-7" aria-labelledby="guest-title">
            <h2 id="guest-title" className="text-xl font-semibold">Your details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Full name" htmlFor="guest_name" error={errors.guest_name?.message}>
                  <input id="guest_name" className="field" autoComplete="name" {...register("guest_name")} aria-invalid={!!errors.guest_name} />
                </Field>
              </div>
              <Field label="Email" htmlFor="guest_email" error={errors.guest_email?.message} hint="We'll use this to find your booking.">
                <input id="guest_email" type="email" className="field" autoComplete="email" {...register("guest_email")} aria-invalid={!!errors.guest_email} />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message ?? errors.dial?.message}>
                <div className="flex gap-2">
                  <select aria-label="Country code" className="field w-28 shrink-0 px-2" {...register("dial")}>
                    {DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input id="phone" type="tel" className="field" autoComplete="tel-national" {...register("phone")} aria-invalid={!!errors.phone} />
                </div>
              </Field>
              <Field label="Country" htmlFor="guest_country" error={errors.guest_country?.message}>
                <select id="guest_country" className="field" {...register("guest_country", {
                  onChange: (e) => { const c = COUNTRIES.find((x) => x.name === e.target.value); if (c?.dial) setValue("dial", c.dial); },
                })} aria-invalid={!!errors.guest_country}>
                  <option value="">Choose your country</option>
                  {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <div className="flex flex-col justify-end gap-3">
                <Toggle checked={staying} onChange={(v) => setValue("staying_at_hotel", v)} label="I'm staying at this hotel" />
              </div>
              {staying && (
                <Field label="Room number" htmlFor="room_number" error={errors.room_number?.message}>
                  <input id="room_number" className="field" {...register("room_number")} aria-invalid={!!errors.room_number} />
                </Field>
              )}
              <div className="sm:col-span-2">
                <Field label="Pick-up note (optional)" htmlFor="pickup_note" error={errors.pickup_note?.message} hint="E.g. child seat needed, two helmets, early pick-up.">
                  <textarea id="pickup_note" rows={3} className="field" {...register("pickup_note")} />
                </Field>
              </div>
            </div>
          </section>

          <section className="card p-6 sm:p-7" aria-labelledby="pay-title">
            <h2 id="pay-title" className="text-xl font-semibold">Payment method</h2>
            <p className="mt-1 text-sm text-ink-soft">You'll pay on the next screen. Prototype: no real money is charged.</p>
            <div role="radiogroup" className="mt-5 grid gap-3 sm:grid-cols-3">
              {METHODS.map((m) => (
                <label key={m.id} className={`flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 transition ${method === m.id ? "border-primary bg-tint/50" : "border-line hover:border-ink/30"}`}>
                  <input type="radio" value={m.id} className="sr-only" {...register("payment_method")} />
                  <PaymentLogo method={m.id} />
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className="text-xs text-ink-soft">{m.hint}</span>
                </label>
              ))}
            </div>
          </section>

          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--primary))]" {...register("agree")} aria-invalid={!!errors.agree} />
              <span>I agree to the <Link to="/terms" target="_blank" className="link">rental terms</Link>.</span>
            </label>
            {errors.agree && <p className="field-error" role="alert">{errors.agree.message}</p>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="card overflow-hidden">
            <div className="flex gap-4 border-b border-line p-5">
              <BikeImageBox src={primaryImageFor(bike.id, data.images)} alt="" className="h-20 w-28 shrink-0 rounded-xl" />
              <div>
                <p className="font-semibold">{bike.name}</p>
                <p className="text-sm text-ink-soft">{panel.qty} {panel.qty === 1 ? "bike" : "bikes"} · {q?.hours} billable hours</p>
              </div>
            </div>
            <dl className="space-y-3 border-b border-line p-5 text-sm">
              <div><dt className="text-ink-soft">Pick-up</dt><dd className="font-semibold">{formatDateTime(startIso!)}</dd></div>
              <div><dt className="text-ink-soft">Return</dt><dd className="font-semibold">{formatDateTime(endIso!)}</dd></div>
              <p className="text-xs text-ink-soft">All times in {TZ_LABEL} (UTC+4)</p>
            </dl>
            <div className="p-5">
              {q ? <PriceLines q={q} /> : <Skeleton className="h-28" />}
              {q?.codeResult && q.codeResult.status !== "applied" && <p className="mt-3 text-sm text-ink-soft">{q.codeResult.message}</p>}
              {qtyError && <Alert className="mt-4">{qtyError}</Alert>}
              {submitError && <Alert className="mt-4">{submitError}</Alert>}
              <Button type="submit" size="lg" className="mt-5 w-full" loading={isSubmitting} disabled={free === null || !!qtyError}>
                {method === "card" ? <CreditCard size={18} /> : <Lock size={18} />} Continue to payment <ArrowRight size={18} />
              </Button>
              <p className="mt-3 text-center text-xs text-ink-soft">Your bikes are held for 15 minutes while you pay.</p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
