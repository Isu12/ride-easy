import { ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBikeAvailability } from "@/lib/api";
import { validatePeriod } from "@/lib/availability";
import { formatMoney } from "@/lib/money";
import { quote, type Quote } from "@/lib/pricing";
import { TZ_LABEL, fromLocalInput } from "@/lib/time";
import type { Bike, Promotion } from "@/lib/types";
import { AvailabilityChip, DateTimeInput } from "./bikes";
import { Button, Skeleton } from "./ui";

export interface PanelState {
  start: string;
  end: string;
  qty: number;
  code: string;
}

/** Price lines shared by the booking panel and the checkout summary. */
export function PriceLines({ q }: { q: Quote }) {
  return (
    <div>
      <p className="text-sm text-ink-soft">{q.summary}</p>
      <dl className="mt-4 space-y-2.5">
        <div className="flex justify-between"><dt>Rental subtotal</dt><dd>{formatMoney(q.subtotal)}</dd></div>
        {q.promotion && (
          <div className="flex justify-between font-medium text-status-available">
            <dt>{q.promotion.name}{q.promotion.promo_code ? ` (${q.promotion.promo_code})` : ""}</dt>
            <dd>−{formatMoney(q.discount)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-xl font-bold">Total</dt>
          <dd className="text-2xl font-bold">{formatMoney(q.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function useBookingQuote(bike: Bike | null | undefined, promotions: Promotion[], state: PanelState, appliedCode: string) {
  const startIso = fromLocalInput(state.start);
  const endIso = fromLocalInput(state.end);
  const periodError = validatePeriod(startIso, endIso);
  const [free, setFree] = useState<number | null>(null);

  useEffect(() => {
    if (!bike || periodError) {
      setFree(null);
      return;
    }
    let active = true;
    setFree(null);
    getBikeAvailability(bike.id, startIso!, endIso!).then((n) => active && setFree(n));
    return () => {
      active = false;
    };
  }, [bike, startIso, endIso, periodError?.message]);

  const q = useMemo(
    () => (bike && !periodError
      ? quote({ rates: bike, bikeId: bike.id, startIso: startIso!, endIso: endIso!, quantity: state.qty, promotions, promoCode: appliedCode || null })
      : null),
    [bike, promotions, startIso, endIso, state.qty, appliedCode, periodError],
  );

  const qtyError = free !== null && state.qty > free
    ? free === 0 ? "No bikes left for these dates. Try other times." : `Only ${free} available for these dates.`
    : null;

  return { startIso, endIso, periodError, free, q, qtyError };
}

export function BookingPanel({ bike, promotions, state, onChange }: {
  bike: Bike; promotions: Promotion[]; state: PanelState; onChange: (s: PanelState) => void;
}) {
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState(state.code);
  const { periodError, free, q, qtyError } = useBookingQuote(bike, promotions, state, state.code);
  const set = (patch: Partial<PanelState>) => onChange({ ...state, ...patch });
  const canContinue = !!q && !periodError && free !== null && !qtyError;

  function proceed() {
    if (!canContinue) return;
    const p = new URLSearchParams({ bike: bike.slug, start: state.start, end: state.end, qty: String(state.qty) });
    if (q?.promotion?.promo_code && state.code) p.set("code", state.code);
    navigate(`/checkout?${p}`);
  }

  return (
    <div>
      <h2 className="h-display text-4xl sm:text-5xl">Make it your ride</h2>
      <p className="mb-4 text-sm text-ink-soft">{TZ_LABEL} (UTC+4)</p>
      <div className="space-y-4">
        <DateTimeInput id="bp-start" label="Pick-up date & time" value={state.start} onChange={(v) => set({ start: v })}
          error={periodError?.field === "start" ? periodError.message : undefined} />
        <DateTimeInput id="bp-end" label="Return date & time" icon="clock" value={state.end} onChange={(v) => set({ end: v })}
          error={periodError?.field === "end" ? periodError.message : undefined} />
        <div>
          <label htmlFor="bp-qty" className="field-label">Number of bikes</label>
          <input id="bp-qty" type="number" min={1} max={bike.quantity_owned} className="field" value={state.qty}
            onChange={(e) => set({ qty: Math.max(1, Math.min(bike.quantity_owned, Number(e.target.value) || 1)) })}
            aria-invalid={!!qtyError} aria-describedby="bp-qty-msg" />
          <div id="bp-qty-msg" className="mt-2 min-h-6" aria-live="polite">
            {periodError ? null : free === null ? <Skeleton className="h-6 w-40" /> : qtyError ? <p className="field-error mt-0">{qtyError}</p> : <AvailabilityChip free={free} />}
          </div>
        </div>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); set({ code: codeInput.trim().toUpperCase() }); }}>
          <div className="flex-1">
            <label htmlFor="bp-code" className="field-label">Have a promo code?</label>
            <input id="bp-code" className="field uppercase placeholder:normal-case" placeholder="Enter code" value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)} autoComplete="off" />
          </div>
          <Button type="submit" variant="outline" size="lg" className="px-5">Apply</Button>
        </form>
        {q?.codeResult && (
          <p role="status" className={q.codeResult.status === "invalid" ? "field-error mt-0" : "flex items-start gap-1.5 text-sm font-medium text-status-available"}>
            {q.codeResult.status !== "invalid" && <Tag size={15} className="mt-0.5 shrink-0" aria-hidden />}
            {q.codeResult.message}
            {q.codeResult.status !== "applied" && (
              <button type="button" className="ml-2 underline" onClick={() => { setCodeInput(""); set({ code: "" }); }}>Remove</button>
            )}
          </p>
        )}
      </div>

      <div className="mt-6" aria-live="polite">
        {q ? <PriceLines q={q} /> : <p className="text-ink-soft">Choose your dates to see the price.</p>}
      </div>

      <Button size="lg" className="mt-6 w-full" disabled={!canContinue} onClick={proceed}>
        Continue to booking <ArrowRight size={18} />
      </Button>
      <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft"><ShieldCheck size={16} aria-hidden /> Helmet & lock included. No hidden fees.</p>
    </div>
  );
}
