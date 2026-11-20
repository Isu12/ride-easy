import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Button, ConfirmDialog, Field, Skeleton } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { getSettings, resetDemoData, saveSettings } from "@/lib/api";
import { AdminTitle } from "./AdminLayout";

const schema = z.object({
  business_name: z.string().trim().min(2, "Enter the business name."),
  phone: z.string().trim().min(6, "Enter a phone number."),
  whatsapp: z.string().trim().regex(/^\+?[\d\s]{6,20}$/, "Use international format, e.g. +248 2 500 0000."),
  email: z.string().trim().email("Enter a valid email."),
  opening_hours: z.string().trim().min(3, "Enter opening hours."),
  pickup_location_text: z.string().trim().min(10, "Tell guests where to collect their bikes."),
  terms_text: z.string().trim().min(20, "Add your rental terms."),
});
type Values = z.infer<typeof schema>;

export default function SettingsAdmin() {
  const { data, loading } = useData(getSettings);
  const [saved, setSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  async function onSubmit(v: Values) {
    await saveSettings(v);
    reset(v);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <Skeleton className="h-[600px] max-w-3xl rounded-2xl" />;

  const text = (k: keyof Values, label: string, hint?: string) => (
    <Field label={label} htmlFor={k} error={errors[k]?.message} hint={hint}>
      <input id={k} className="field" {...register(k)} aria-invalid={!!errors[k]} />
    </Field>
  );

  return (
    <>
      <AdminTitle title="Settings">Contact details and text shown to guests.</AdminTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card max-w-3xl space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {text("business_name", "Business name")}
          {text("email", "Email")}
          {text("phone", "Phone")}
          {text("whatsapp", "WhatsApp number", "Used for the WhatsApp button on the home page.")}
        </div>
        {text("opening_hours", "Opening hours")}
        <Field label="Pick-up instructions" htmlFor="pickup_location_text" error={errors.pickup_location_text?.message}>
          <textarea id="pickup_location_text" rows={3} className="field" {...register("pickup_location_text")} />
        </Field>
        <Field label="Rental terms" htmlFor="terms_text" error={errors.terms_text?.message} hint="Leave a blank line between paragraphs.">
          <textarea id="terms_text" rows={10} className="field" {...register("terms_text")} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>Save settings</Button>
          {saved && <span className="text-sm font-semibold text-status-available" role="status">Saved</span>}
        </div>
      </form>

      <section className="card mt-8 max-w-3xl p-6">
        <h2 className="text-lg font-semibold">Demo data</h2>
        <p className="mt-1 text-ink-soft">Put every bike, booking, promotion and setting back to the original demo data.</p>
        <Alert tone="low" className="mt-4">Prototype data is stored in this browser only.</Alert>
        <Button variant="outline" className="mt-4" onClick={() => setResetOpen(true)}><RotateCcw size={17} /> Reset demo data</Button>
      </section>
      <ConfirmDialog open={resetOpen} onCancel={() => setResetOpen(false)} onConfirm={() => { resetDemoData(); setResetOpen(false); }}
        title="Reset all demo data?" confirmLabel="Reset everything" danger
        message="Your changes to bikes, photos, promotions, bookings and settings will be replaced with the original demo data." />
    </>
  );
}
