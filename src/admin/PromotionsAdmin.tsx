import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Tag } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Badge, Button, EmptyState, Field, Sheet, Skeleton, Toggle } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { ApiError, listAllPromotions, listBikes, savePromotion } from "@/lib/api";
import { describePromotion, discountLabel } from "@/lib/pricing";
import { promotionStatus, type PromotionStatus } from "@/lib/stats";
import { addDays, formatDate, scDate } from "@/lib/time";
import type { Promotion } from "@/lib/types";
import { AdminTitle } from "./AdminLayout";

const STATUS_TONE: Record<PromotionStatus, "available" | "low" | "booked" | "outline"> = { Live: "available", Scheduled: "low", Expired: "booked", Inactive: "outline" };

const schema = z
  .object({
    name: z.string().trim().min(2, "Give the promotion a name."),
    description: z.string().trim().max(200, "Keep it under 200 characters."),
    discount_type: z.enum(["percentage", "fixed_amount"]),
    discount_value: z.coerce.number({ invalid_type_error: "Enter a value." }).positive("Must be more than 0."),
    starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date."),
    ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date."),
    applies_to: z.enum(["all_bikes", "selected_bikes"]),
    bike_ids: z.array(z.string()),
    promo_code: z.string().trim().max(20).regex(/^[A-Za-z0-9]*$/, "Letters and numbers only."),
    min_rental_hours: z.union([z.literal(""), z.coerce.number().int().min(1, "At least 1 hour.")]),
    is_active: z.boolean(),
  })
  .refine((v) => v.ends_at >= v.starts_at, { path: ["ends_at"], message: "End date must be on or after the start date." })
  .refine((v) => v.discount_type !== "percentage" || v.discount_value <= 100, { path: ["discount_value"], message: "A percentage can't be more than 100." })
  .refine((v) => v.applies_to === "all_bikes" || v.bike_ids.length > 0, { path: ["bike_ids"], message: "Choose at least one bike." });
type Values = z.input<typeof schema>;

function toValues(p?: Promotion): Values {
  const today = scDate(new Date());
  return p
    ? { ...p, promo_code: p.promo_code ?? "", min_rental_hours: p.min_rental_hours ?? "" }
    : { name: "", description: "", discount_type: "percentage", discount_value: 10, starts_at: today, ends_at: addDays(today, 30),
        applies_to: "all_bikes", bike_ids: [], promo_code: "", min_rental_hours: "", is_active: true };
}

export default function PromotionsAdmin() {
  const { data, loading } = useData(async () => {
    const [promotions, bikes] = await Promise.all([listAllPromotions(), listBikes({ includeInactive: true })]);
    return { promotions, bikes };
  });
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);
  const bikeNames = Object.fromEntries((data?.bikes ?? []).map((b) => [b.id, b.name]));

  return (
    <>
      <AdminTitle title="Promotions" actions={<Button onClick={() => setEditing("new")}><Plus size={18} /> New promotion</Button>}>
        Only the single best offer applies to a booking. Offers never stack.
      </AdminTitle>

      {loading || !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : data.promotions.length === 0 ? (
        <EmptyState icon={<Tag />} title="No promotions yet" action={<Button onClick={() => setEditing("new")}>Create a promotion</Button>}>
          Seasonal discounts and promo codes appear here.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-tint/40 text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Promotion</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold">How</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.promotions.map((p) => {
                const status = promotionStatus(p);
                return (
                  <tr key={p.id} className="hover:bg-tint/20">
                    <td className="px-4 py-3"><p className="font-semibold">{p.name}</p><p className="text-ink-soft">{p.applies_to === "all_bikes" ? "All bikes" : p.bike_ids.map((id) => bikeNames[id]).join(", ")}</p></td>
                    <td className="px-4 py-3 font-semibold">{discountLabel(p)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.starts_at)} – {formatDate(p.ends_at)}</td>
                    <td className="px-4 py-3">{p.promo_code ? <span className="rounded bg-tint px-2 py-0.5 font-mono font-semibold">{p.promo_code}</span> : "Automatic"}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[status]}>{status}</Badge></td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Pencil size={15} /> Edit</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New promotion" : "Edit promotion"}>
        {editing && data && (
          <PromotionForm key={editing === "new" ? "new" : editing.id} promotion={editing === "new" ? undefined : editing}
            bikes={data.bikes} bikeNames={bikeNames} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </>
  );
}

function PromotionForm({ promotion, bikes, bikeNames, onDone }: {
  promotion?: Promotion; bikes: { id: string; name: string }[]; bikeNames: Record<string, string>; onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: toValues(promotion),
  });
  const v = watch();

  async function onSubmit(values: Values) {
    setError(null);
    const parsed = schema.parse(values);
    try {
      await savePromotion({
        ...parsed, id: promotion?.id, promo_code: parsed.promo_code || null,
        min_rental_hours: parsed.min_rental_hours === "" ? null : parsed.min_rental_hours,
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="rounded-xl bg-tint/60 p-4" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Preview</p>
        <p className="mt-1 font-semibold">
          {describePromotion({
            ...v, discount_value: Number(v.discount_value) || 0, promo_code: v.promo_code || null,
            min_rental_hours: v.min_rental_hours === "" ? null : Number(v.min_rental_hours) || null,
          }, bikeNames)}
        </p>
      </div>
      <Field label="Name" htmlFor="p-name" error={errors.name?.message}><input id="p-name" className="field" {...register("name")} /></Field>
      <Field label="Short description (shown to guests)" htmlFor="p-desc" error={errors.description?.message}><input id="p-desc" className="field" {...register("description")} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Discount type" htmlFor="p-type">
          <select id="p-type" className="field" {...register("discount_type")}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed_amount">Fixed amount ($)</option>
          </select>
        </Field>
        <Field label="Value" htmlFor="p-value" error={errors.discount_value?.message}><input id="p-value" type="number" step="0.5" className="field" {...register("discount_value")} /></Field>
        <Field label="Starts" htmlFor="p-start" error={errors.starts_at?.message}><input id="p-start" type="date" className="field" {...register("starts_at")} /></Field>
        <Field label="Ends" htmlFor="p-end" error={errors.ends_at?.message}><input id="p-end" type="date" className="field" {...register("ends_at")} /></Field>
      </div>
      <fieldset>
        <legend className="field-label">Applies to</legend>
        <div className="flex gap-6">
          <label className="inline-flex items-center gap-2"><input type="radio" value="all_bikes" className="accent-[rgb(var(--primary))]" {...register("applies_to")} /> All bikes</label>
          <label className="inline-flex items-center gap-2"><input type="radio" value="selected_bikes" className="accent-[rgb(var(--primary))]" {...register("applies_to")} /> Selected bikes</label>
        </div>
        {v.applies_to === "selected_bikes" && (
          <Controller control={control} name="bike_ids" render={({ field }) => (
            <div className="mt-3 grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2">
              {bikes.map((b) => (
                <label key={b.id} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--primary))]" checked={field.value.includes(b.id)}
                    onChange={(e) => field.onChange(e.target.checked ? [...field.value, b.id] : field.value.filter((x) => x !== b.id))} />
                  {b.name}
                </label>
              ))}
            </div>
          )} />
        )}
        {errors.bike_ids && <p className="field-error">{errors.bike_ids.message}</p>}
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Promo code (optional)" htmlFor="p-code" error={errors.promo_code?.message} hint="Leave empty to apply automatically.">
          <input id="p-code" className="field font-mono uppercase" {...register("promo_code")} />
        </Field>
        <Field label="Minimum rental hours" htmlFor="p-min" error={errors.min_rental_hours?.message} hint="Optional, e.g. 24">
          <input id="p-min" type="number" className="field" {...register("min_rental_hours")} />
        </Field>
      </div>
      <Controller control={control} name="is_active" render={({ field }) => <Toggle label="Active" checked={field.value} onChange={field.onChange} />} />
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>Save promotion</Button>
      </div>
    </form>
  );
}
