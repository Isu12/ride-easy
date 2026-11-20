import { ArrowUpRight, CalendarClock, Clock, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatMoney } from "@/lib/money";
import { TZ_LABEL, fromLocalInput } from "@/lib/time";
import { validatePeriod } from "@/lib/availability";
import type { Bike, BikeCategory } from "@/lib/types";
import { Badge, Button, Skeleton, buttonClass } from "./ui";

export function AvailabilityChip({ free }: { free: number }) {
  if (free <= 0) return <Badge tone="booked">Not available for these dates</Badge>;
  if (free <= 2) return <Badge tone="low">Only {free} left</Badge>;
  return <Badge tone="available">{free} available</Badge>;
}

export function BikeBadge({ bike }: { bike: Bike; category?: BikeCategory }) {
  if (bike.is_electric) return <Badge tone="ride">Electric adventure</Badge>;
  if (bike.is_featured) return <Badge tone="primary">Island favourite</Badge>;
  return null;
}

export function BikeImageBox({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden bg-tint ${className}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div className="grid h-full place-items-center text-ink-soft">No photo yet</div>
      )}
    </div>
  );
}

export function BikeCard({ bike, category, image, free, linkSearch = "" }: {
  bike: Bike; category?: BikeCategory; image: string | null; free?: number; linkSearch?: string;
}) {
  const href = `/bikes/${bike.slug}${linkSearch}`;
  return (
    <article className="card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lift">
      <Link to={href} className="relative block" tabIndex={-1} aria-hidden>
        <BikeImageBox src={image} alt="" className="aspect-[3/2]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2"><BikeBadge bike={bike} /></div>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        {category && <p className="eyebrow">{category.name}</p>}
        <h3 className="mt-2 text-xl font-medium">
          <Link to={href} className="hover:text-primary">{bike.name}</Link>
        </h3>
        <p className="mt-2 text-ink-soft">{bike.short_description}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Features">
          {bike.features.slice(0, 3).map((f) => <li key={f} className="rounded-md bg-tint px-2.5 py-1 text-xs font-medium text-ink">{f}</li>)}
        </ul>
        {free !== undefined && <div className="mt-4"><AvailabilityChip free={free} /></div>}
        <div className="min-h-5 flex-1" />
        <div className="flex items-end justify-between gap-3 border-t border-line pt-5">
          <div>
            <p><span className="text-2xl font-bold">{formatMoney(bike.daily_rate)}</span> <span className="text-sm text-ink-soft">/ day</span></p>
            <p className="text-sm text-ink-soft">From {formatMoney(bike.hourly_rate)} / hour</p>
          </div>
          <Link to={href} className={buttonClass("outline", "md")} aria-label={`View ${bike.name}`}>View bike <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </article>
  );
}

export function BikeCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[3/2] rounded-none" />
      <div className="space-y-3 p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-16" /></div>
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    </div>
  );
}

/** Pick-up / return date-time inputs, always in Seychelles time. */
export function DateTimeInput({ id, label, value, onChange, icon = "calendar", error, min }: {
  id: string; label: string; value: string; onChange: (v: string) => void; icon?: "calendar" | "clock"; error?: string; min?: string;
}) {
  const Icon = icon === "clock" ? Clock : CalendarClock;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
        <Icon size={15} aria-hidden /> {label}
      </label>
      <input id={id} type="datetime-local" step={900} min={min} value={value} onChange={(e) => onChange(e.target.value)}
        className="field" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

/** Home page quick search → /bikes?start=…&end=…&qty=… */
export function QuickSearch({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
  const navigate = useNavigate();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<{ field: "start" | "end"; message: string } | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const err = validatePeriod(fromLocalInput(start), fromLocalInput(end));
    setError(err);
    if (!err) navigate(`/bikes?${new URLSearchParams({ start, end, qty: String(qty) })}`);
  }

  return (
    <div>
      <form onSubmit={submit} className="card grid gap-4 p-5 shadow-lift sm:p-6 md:grid-cols-[1fr_1fr_160px_auto] md:items-end" aria-label="Search bikes">
        <DateTimeInput id="qs-start" label="Pick-up date & time" value={start} onChange={setStart} error={error?.field === "start" ? error.message : undefined} />
        <DateTimeInput id="qs-end" label="Return date & time" icon="clock" value={end} onChange={setEnd} error={error?.field === "end" ? error.message : undefined} />
        <div>
          <label htmlFor="qs-qty" className="mb-1.5 block text-sm font-semibold text-ink-soft">Bikes</label>
          <select id="qs-qty" className="field" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? "bike" : "bikes"}</option>)}
          </select>
        </div>
        <Button type="submit" size="lg" className="w-full md:w-auto"><Search size={18} /> Find my ride</Button>
      </form>
      <p className="mt-2 text-right text-xs text-ink-soft">All dates & times are in {TZ_LABEL} (UTC+4)</p>
    </div>
  );
}
