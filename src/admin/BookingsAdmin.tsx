import { AlertCircle, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PaymentBadge, STATUS_LABEL, StatusBadge, StatusTimeline } from "@/components/booking";
import { METHOD_LABEL } from "@/components/payment";
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Sheet, Skeleton } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { ApiError, applyBookingAction, listBikes, listBookings, saveAdminNotes, type BookingAction } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatDateTimeShort, scDate } from "@/lib/time";
import type { Bike, Booking, BookingStatus } from "@/lib/types";
import { AdminTitle } from "./AdminLayout";

const STATUSES: BookingStatus[] = ["pending_payment", "confirmed", "active", "completed", "cancelled"];

export default function BookingsAdmin() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const onlyCancel = params.get("cancel") === "1";

  const { data, loading } = useData(async () => {
    const [bookings, bikes] = await Promise.all([listBookings(), listBikes({ includeInactive: true })]);
    return { bookings, bikes };
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.bookings ?? []).filter((b) =>
      (!status || b.status === status) &&
      (!onlyCancel || (b.cancellation_requested && b.status !== "cancelled")) &&
      (!from || scDate(b.start_at) >= from) &&
      (!to || scDate(b.start_at) <= to) &&
      (!q || b.reference.toLowerCase().includes(q) || b.guest_name.toLowerCase().includes(q) || b.guest_email.toLowerCase().includes(q)));
  }, [data, query, status, from, to, onlyCancel]);

  const selected = data?.bookings.find((b) => b.id === selectedId) ?? null;
  const bikeName = (id: string) => data?.bikes.find((b) => b.id === id)?.name ?? "Bike";
  const clear = () => { setQuery(""); setStatus(""); setFrom(""); setTo(""); setParams({}); };

  return (
    <>
      <AdminTitle title="Bookings">Search, filter and manage every rental.</AdminTitle>

      <div className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" size={18} aria-hidden />
          <input className="field pl-11" placeholder="Reference, name or email" aria-label="Search bookings" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="field" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <input type="date" className="field" aria-label="Pick-up from" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="field" aria-label="Pick-up to" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {onlyCancel && (
        <div className="mb-4 flex items-center gap-3">
          <Badge tone="overdue">Showing cancellation requests only</Badge>
          <button className="text-sm font-semibold text-primary hover:underline" onClick={() => setParams({})}>Show all</button>
        </div>
      )}

      {loading || !data ? (
        <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<SearchX />} title="No bookings match" action={<Button variant="outline" onClick={clear}>Clear filters</Button>}>
          Try a wider date range or a different status.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-tint/40 text-ink-soft">
              <tr>
                {["Reference", "Guest", "Bike(s)", "Pick-up", "Return", "Total", "Payment", "Status"].map((h) => (
                  <th key={h} className={`px-4 py-3 font-semibold ${h === "Total" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-tint/30" onClick={() => setSelectedId(b.id)}>
                  <td className="px-4 py-3">
                    <button className="font-mono font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}>{b.reference}</button>
                    {b.cancellation_requested && b.status !== "cancelled" && (
                      <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-status-overdue"><AlertCircle size={13} aria-hidden /> Cancel requested</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><p className="font-medium">{b.guest_name}</p><p className="text-ink-soft">{b.guest_email}</p></td>
                  <td className="px-4 py-3">{b.items.map((i) => `${i.quantity}× ${bikeName(i.bike_id)}`).join(", ")}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTimeShort(b.start_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTimeShort(b.end_at)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(b.total)}</td>
                  <td className="px-4 py-3"><PaymentBadge status={b.payment_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `Booking ${selected.reference}` : "Booking"}>
        {selected && data && <BookingDetail key={selected.id} booking={selected} bikes={data.bikes} />}
      </Sheet>
    </>
  );
}

const ACTIONS: Record<BookingAction, { label: string; confirm: string; danger: boolean; message: string }> = {
  pickup: { label: "Mark picked up", confirm: "Mark picked up", danger: false, message: "The guest has collected their bike(s) from reception." },
  return: { label: "Mark returned", confirm: "Mark returned", danger: false, message: "The bike(s) are back at reception and checked." },
  cancel: { label: "Cancel booking", confirm: "Cancel booking", danger: true, message: "The bikes will be released for other guests. This can't be undone." },
  refund: { label: "Mark refunded", confirm: "Mark refunded", danger: true, message: "Record that the payment has been refunded to the guest. (Prototype: no money moves.)" },
};

function BookingDetail({ booking: b, bikes }: { booking: Booking; bikes: Bike[] }) {
  const [pending, setPending] = useState<BookingAction | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(b.admin_notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);

  const available: BookingAction[] = [
    ...(b.status === "confirmed" ? (["pickup"] as const) : []),
    ...(b.status === "active" ? (["return"] as const) : []),
    ...(b.status !== "completed" && b.status !== "cancelled" ? (["cancel"] as const) : []),
    ...(b.payment_status === "paid" && (b.status === "cancelled" || b.status === "completed") ? (["refund"] as const) : []),
  ];

  async function run() {
    if (!pending) return;
    setWorking(true);
    setError(null);
    try {
      await applyBookingAction(b.id, pending);
      setPending(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the booking.");
      setPending(null);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={b.status} /><PaymentBadge status={b.payment_status} />
        {b.cancellation_requested && b.status !== "cancelled" && <Badge tone="overdue">Guest requested cancellation</Badge>}</div>
      <StatusTimeline booking={b} />

      {available.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {available.map((a) => (
            <Button key={a} variant={ACTIONS[a].danger ? "outline" : "primary"} size="sm" onClick={() => setPending(a)}
              className={ACTIONS[a].danger ? "text-status-overdue" : ""}>{ACTIONS[a].label}</Button>
          ))}
        </div>
      )}
      {error && <Alert>{error}</Alert>}

      <section>
        <h3 className="mb-2 font-semibold">Guest</h3>
        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
          <dt className="text-ink-soft">Name</dt><dd>{b.guest_name}</dd>
          <dt className="text-ink-soft">Email</dt><dd className="break-all">{b.guest_email}</dd>
          <dt className="text-ink-soft">Phone</dt><dd>{b.guest_phone}</dd>
          <dt className="text-ink-soft">Country</dt><dd>{b.guest_country}</dd>
          <dt className="text-ink-soft">Hotel guest</dt><dd>{b.staying_at_hotel ? `Yes · Room ${b.room_number}` : "No"}</dd>
          {b.pickup_note && <><dt className="text-ink-soft">Note</dt><dd>{b.pickup_note}</dd></>}
        </dl>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Rental</h3>
        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
          <dt className="text-ink-soft">Bike(s)</dt><dd>{b.items.map((i) => `${i.quantity}× ${bikes.find((x) => x.id === i.bike_id)?.name ?? "Bike"}`).join(", ")}</dd>
          <dt className="text-ink-soft">Pick-up</dt><dd>{formatDateTime(b.start_at)}</dd>
          <dt className="text-ink-soft">Return</dt><dd>{formatDateTime(b.end_at)}</dd>
          <dt className="text-ink-soft">Paid with</dt><dd>{METHOD_LABEL[b.payment_method]}{b.paid_at ? ` · ${formatDateTimeShort(b.paid_at)}` : ""}</dd>
        </dl>
      </section>

      <section className="rounded-xl bg-tint/50 p-4 text-sm">
        <h3 className="font-semibold">Price breakdown</h3>
        <p className="mt-1 text-ink-soft">{b.items[0]?.price_breakdown.summary}</p>
        <dl className="mt-3 space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(b.subtotal)}</dd></div>
          {b.discount_total > 0 && <div className="flex justify-between text-status-available"><dt>Discount{b.promo_code_used ? ` (${b.promo_code_used})` : ""}</dt><dd>−{formatMoney(b.discount_total)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>Total</dt><dd>{formatMoney(b.total)}</dd></div>
        </dl>
      </section>

      <section>
        <label htmlFor="notes" className="field-label">Admin notes</label>
        <textarea id="notes" rows={3} className="field" value={notes} onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }} placeholder="Only visible to hotel staff" />
        <div className="mt-2 flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={async () => { await saveAdminNotes(b.id, notes); setNotesSaved(true); }}>Save notes</Button>
          {notesSaved && <span className="text-sm text-status-available" role="status">Saved</span>}
        </div>
      </section>

      <ConfirmDialog open={!!pending} onCancel={() => setPending(null)} onConfirm={run} loading={working}
        title={pending ? `${ACTIONS[pending].label}?` : ""} confirmLabel={pending ? ACTIONS[pending].confirm : ""} danger={pending ? ACTIONS[pending].danger : false}
        message={pending ? `${b.reference} · ${b.guest_name}. ${ACTIONS[pending].message}` : ""} />
    </div>
  );
}
