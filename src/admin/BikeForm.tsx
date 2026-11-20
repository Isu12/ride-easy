import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, GripVertical, ImagePlus, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Alert, Button, Field, Skeleton, Toggle } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { ApiError, getBikeById, listBikeImages, listCategories, saveBike, type ImageInput } from "@/lib/api";
import NotFound from "@/pages/NotFound";

const money = z.coerce.number({ invalid_type_error: "Enter a price." }).min(0.5, "Must be at least $0.50.").max(10000);
const schema = z
  .object({
    name: z.string().trim().min(2, "Give the bike a name."),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only."),
    category_id: z.string().min(1, "Choose a category."),
    short_description: z.string().trim().min(5, "Add a one-line description.").max(120, "Keep it under 120 characters."),
    description: z.string().trim().max(1200),
    features: z.array(z.string()).max(8, "Up to 8 features."),
    frame_size: z.string().trim().min(1, "Add a frame size, e.g. M."),
    rider_height_min_cm: z.coerce.number().int().min(80).max(220),
    rider_height_max_cm: z.coerce.number().int().min(80).max(230),
    gear_count: z.coerce.number().int().min(1).max(40),
    has_basket: z.boolean(),
    is_electric: z.boolean(),
    quantity_owned: z.coerce.number({ invalid_type_error: "Enter a number." }).int().min(1, "At least 1.").max(500),
    hourly_rate: money,
    daily_rate: money,
    weekly_rate: money,
    is_active: z.boolean(),
    is_featured: z.boolean(),
  })
  .refine((v) => v.rider_height_max_cm > v.rider_height_min_cm, { path: ["rider_height_max_cm"], message: "Must be taller than the minimum." })
  .refine((v) => v.daily_rate >= v.hourly_rate, { path: ["daily_rate"], message: "A day should cost at least one hour." })
  .refine((v) => v.weekly_rate >= v.daily_rate, { path: ["weekly_rate"], message: "A week should cost at least one day." });
type Values = z.infer<typeof schema>;

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Resize an uploaded photo in the browser so it fits in local storage. */
function compressImage(file: File, maxSize = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("That file isn't an image we can read."));
    img.src = URL.createObjectURL(file);
  });
}

function FeatureChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const f = draft.trim();
    if (f && !value.includes(f)) onChange([...value, f]);
    setDraft("");
  };
  return (
    <div className="field flex flex-wrap items-center gap-2 py-2">
      {value.map((f) => (
        <span key={f} className="inline-flex items-center gap-1 rounded-md bg-tint px-2.5 py-1 text-sm font-medium">
          {f}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== f))} aria-label={`Remove ${f}`} className="rounded hover:text-status-overdue"><X size={14} /></button>
        </span>
      ))}
      <input id="features" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={value.length ? "Add another…" : "e.g. Rear basket, then Enter"}
        className="min-w-[160px] flex-1 bg-transparent py-1 outline-none"
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }} onBlur={add} />
    </div>
  );
}

function PhotoManager({ photos, onChange }: { photos: ImageInput[]; onChange: (p: ImageInput[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const added = await Promise.all([...files].map((f) => compressImage(f)));
      const next = [...photos, ...added.map((storage_path) => ({ storage_path, is_primary: false }))];
      if (!next.some((p) => p.is_primary)) next[0] = { ...next[0], is_primary: true };
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <div key={p.storage_path + i} draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }}
            className={`group relative overflow-hidden rounded-xl border-2 bg-tint ${p.is_primary ? "border-primary" : "border-transparent"} ${dragIndex === i ? "opacity-50" : ""}`}>
            <img src={p.storage_path} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover mix-blend-multiply" />
            <span className="absolute left-2 top-2 grid h-7 w-7 cursor-grab place-items-center rounded-md bg-surface/90 text-ink-soft" title="Drag to reorder" aria-hidden><GripVertical size={15} /></span>
            {p.is_primary && <span className="absolute right-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-ink">Main photo</span>}
            <div className="flex flex-wrap gap-1 bg-surface p-1.5">
              {!p.is_primary && (
                <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-tint"
                  onClick={() => onChange(photos.map((x, j) => ({ ...x, is_primary: j === i })))}><Star size={13} /> Set as main</button>
              )}
              <button type="button" className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-tint" onClick={() => move(i, i - 1)} aria-label="Move earlier" disabled={i === 0}>←</button>
              <button type="button" className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-tint" onClick={() => move(i, i + 1)} aria-label="Move later" disabled={i === photos.length - 1}>→</button>
              <button type="button" className="ml-auto rounded-md px-2 py-1 text-status-overdue hover:bg-status-overdue-bg" aria-label={`Remove photo ${i + 1}`}
                onClick={() => {
                  const next = photos.filter((_, j) => j !== i);
                  if (p.is_primary && next[0]) next[0] = { ...next[0], is_primary: true };
                  onChange(next);
                }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-ink-soft transition hover:border-primary hover:text-primary">
          <ImagePlus size={26} aria-hidden />
          <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Add photos"}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} aria-label="Upload bike photos" />
      <p className="mt-2 text-xs text-ink-soft">Drag photos to reorder. The main photo is shown on bike cards. Prototype: photos are stored in this browser.</p>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

const EMPTY: Values = {
  name: "", slug: "", category_id: "", short_description: "", description: "", features: [], frame_size: "M",
  rider_height_min_cm: 150, rider_height_max_cm: 190, gear_count: 7, has_basket: false, is_electric: false,
  quantity_owned: 1, hourly_rate: 3, daily_rate: 10, weekly_rate: 55, is_active: true, is_featured: false,
};

export default function BikeForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<ImageInput[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const { data, loading } = useData(async () => {
    const [bike, categories, images] = await Promise.all([id ? getBikeById(id) : null, listCategories(), id ? listBikeImages(id) : []]);
    return { bike, categories, images };
  }, [id]);

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!data) return;
    if (data.bike) {
      const { id: _id, sort_order: _s, ...rest } = data.bike;
      reset(rest);
      setPhotos(data.images.map((i) => ({ storage_path: i.storage_path, is_primary: i.is_primary })));
    } else if (isNew) reset({ ...EMPTY, category_id: data.categories[0]?.id ?? "" });
    // Only reset when the loaded bike changes, not on every quiet refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.bike?.id, isNew, data === undefined]);

  const name = watch("name");
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(name));
  }, [name, slugTouched, setValue]);

  async function onSubmit(v: Values) {
    setSaveError(null);
    try {
      const bike = await saveBike({ ...v, id }, photos);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (isNew) navigate(`/admin/bikes/${bike.id}`, { replace: true });
      else reset(v);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Couldn't save. If you added large photos, try fewer or smaller ones.");
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-72" /><Skeleton className="h-[480px] rounded-2xl" /></div>;
  if (!isNew && !data?.bike) return <NotFound />;

  const num = (k: keyof Values, label: string, prefix?: string) => (
    <Field label={label} htmlFor={k} error={errors[k]?.message as string | undefined}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft">{prefix}</span>}
        <input id={k} type="number" step={prefix ? "0.5" : "1"} className={`field ${prefix ? "pl-7" : ""}`} {...register(k)} aria-invalid={!!errors[k]} />
      </div>
    </Field>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-5xl">
      <Link to="/admin/bikes" className="mb-4 inline-flex items-center gap-2 font-medium text-primary hover:underline"><ArrowLeft size={17} /> All bikes</Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="h-display text-4xl sm:text-5xl">{isNew ? "Add a bike" : watch("name") || "Edit bike"}</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-semibold text-status-available" role="status">Saved. Live on the site.</span>}
          {!isNew && data?.bike?.is_active && <Link to={`/bikes/${data.bike.slug}`} target="_blank" className="text-sm font-semibold text-primary hover:underline">View on site</Link>}
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isNew && !isDirty && !photosChanged(photos, data?.images ?? [])}>{isNew ? "Create bike" : "Save changes"}</Button>
        </div>
      </div>
      {saveError && <Alert className="mb-6">{saveError}</Alert>}
      {Object.keys(errors).length > 0 && <Alert className="mb-6">Please fix the highlighted fields below.</Alert>}

      <div className="space-y-6">
        <section className="card grid gap-5 p-6 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Basics</h2>
          <Field label="Name" htmlFor="name" error={errors.name?.message}><input id="name" className="field" {...register("name")} aria-invalid={!!errors.name} /></Field>
          <Field label="Web address" htmlFor="slug" error={errors.slug?.message} hint={`/bikes/${watch("slug") || "…"}`}>
            <input id="slug" className="field font-mono text-sm" {...register("slug", { onChange: () => setSlugTouched(true) })} aria-invalid={!!errors.slug} />
          </Field>
          <Field label="Category" htmlFor="category_id" error={errors.category_id?.message}>
            <select id="category_id" className="field" {...register("category_id")}>
              <option value="">Choose…</option>
              {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {num("quantity_owned", "Quantity owned")}
          <div className="sm:col-span-2">
            <Field label="One-line description" htmlFor="short_description" error={errors.short_description?.message}>
              <input id="short_description" className="field" {...register("short_description")} aria-invalid={!!errors.short_description} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Full description" htmlFor="description" error={errors.description?.message}>
              <textarea id="description" rows={4} className="field" {...register("description")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Feature chips" htmlFor="features" error={errors.features?.message}>
              <Controller control={control} name="features" render={({ field }) => <FeatureChips value={field.value} onChange={field.onChange} />} />
            </Field>
          </div>
        </section>

        <section className="card grid gap-5 p-6 sm:grid-cols-3">
          <h2 className="text-lg font-semibold sm:col-span-3">Prices (USD)</h2>
          {num("hourly_rate", "Per hour", "$")}
          {num("daily_rate", "Per day", "$")}
          {num("weekly_rate", "Per week", "$")}
          <p className="text-sm text-ink-soft sm:col-span-3">Guests are never overcharged: hours are capped at the daily price and days at the weekly price.</p>
        </section>

        <section className="card grid gap-5 p-6 sm:grid-cols-4">
          <h2 className="text-lg font-semibold sm:col-span-4">Size & specs</h2>
          <Field label="Frame size" htmlFor="frame_size" error={errors.frame_size?.message}><input id="frame_size" className="field" {...register("frame_size")} /></Field>
          {num("rider_height_min_cm", "Rider min (cm)")}
          {num("rider_height_max_cm", "Rider max (cm)")}
          {num("gear_count", "Gears")}
          <div className="flex flex-wrap gap-6 sm:col-span-4">
            <Controller control={control} name="has_basket" render={({ field }) => <Toggle label="Has a basket" checked={field.value} onChange={field.onChange} />} />
            <Controller control={control} name="is_electric" render={({ field }) => <Toggle label="Electric" checked={field.value} onChange={field.onChange} />} />
            <Controller control={control} name="is_active" render={({ field }) => <Toggle label="Shown on the website" checked={field.value} onChange={field.onChange} />} />
            <Controller control={control} name="is_featured" render={({ field }) => <Toggle label="Featured on home page" checked={field.value} onChange={field.onChange} />} />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Photos</h2>
          <PhotoManager photos={photos} onChange={setPhotos} />
        </section>
      </div>
    </form>
  );
}

function photosChanged(current: ImageInput[], saved: { storage_path: string; is_primary: boolean }[]) {
  return JSON.stringify(current) !== JSON.stringify(saved.map((s) => ({ storage_path: s.storage_path, is_primary: s.is_primary })));
}
