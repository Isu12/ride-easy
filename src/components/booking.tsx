import clsx from "clsx";
import { Check, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { TZ_LABEL, formatDateTime } from "@/lib/time";
import type { Bike, Booking } from "@/lib/types";
import { Badge } from "./ui";
import { METHOD_LABEL } from "./payment";

export const STATUS_LABEL: Record<Booking["status"], string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  active: "Picked up",
  completed: "Returned",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: Booking["status"] }) {
  const tone = ({ pending_payment: "low", confirmed: "available", active: "primary", completed: "booked", cancelled: "overdue" } as const)[status];
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: Booking["payment_status"] }) {
  const tone = ({ unpaid: "low", paid: "available", failed: "overdue", refunded: "booked" } as const)[status];
  return <Badge tone={tone}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

/** Booked → Paid → Picked up → Returned (or Cancelled). */
export function StatusTimeline({ booking }: { booking: Booking }) {
  const cancelled = booking.status === "cancelled";
  const steps = [
    { label: "Booked", done: true },
    { label: "Paid", done: booking.payment_status === "paid" || booking.payment_status === "refunded" },
    { label: "Picked up", done: booking.status === "active" || booking.status === "completed" },
    { label: "Returned", done: booking.status === "completed" },
  ];
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0" aria-label="Booking progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
          <div className="flex w-full items-center">
            <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
              s.done ? "bg-status-available text-white" : "bg-line text-ink-soft")} aria-hidden>
              {s.done ? <Check size={16} /> : i + 1}
            </span>
            {i < steps.length - 1 && <span className={clsx("mx-2 hidden h-0.5 flex-1 rounded sm:block", steps[i + 1].done ? "bg-status-available" : "bg-line")} />}
          </div>
          <span className={clsx("text-sm font-semibold", s.done ? "text-ink" : "text-ink-soft")}>{s.label}<span className="sr-only">{s.done ? " (done)" : " (not yet)"}</span></span>
        </li>
      ))}
      {cancelled && (
        <li className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-status-overdue text-white" aria-hidden><X size={16} /></span>
          <span className="text-sm font-semibold text-status-overdue">Cancelled</span>
        </li>
      )}
    </ol>
  );
}

export function BookingDetails({ booking, bikes }: { booking: Booking; bikes: Bike[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-sm text-ink-soft">Bike</dt>
        <dd className="font-semibold">
          {booking.items.map((i) => `${i.quantity} × ${bikes.find((b) => b.id === i.bike_id)?.name ?? "Bike"}`).join(", ")}
        </dd>
      </div>
      <div><dt className="text-sm text-ink-soft">Pick-up</dt><dd className="font-semibold">{formatDateTime(booking.start_at)}</dd></div>
      <div><dt className="text-sm text-ink-soft">Return</dt><dd className="font-semibold">{formatDateTime(booking.end_at)}</dd></div>
      <div><dt className="text-sm text-ink-soft">Guest</dt><dd className="font-semibold">{booking.guest_name}{booking.room_number ? ` · Room ${booking.room_number}` : ""}</dd></div>
      <div><dt className="text-sm text-ink-soft">Payment</dt><dd className="font-semibold">{METHOD_LABEL[booking.payment_method]} · <PaymentBadge status={booking.payment_status} /></dd></div>
      <div className="sm:col-span-2 rounded-xl bg-tint/50 p-4">
        <p className="text-sm text-ink-soft">{booking.items[0]?.price_breakdown.summary}</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-semibold">Total{booking.payment_status === "paid" ? " paid" : ""}</span>
          <span className="text-2xl font-bold">{formatMoney(booking.total)}</span>
        </div>
      </div>
      <p className="text-xs text-ink-soft sm:col-span-2">All times in {TZ_LABEL} (UTC+4)</p>
    </dl>
  );
}
