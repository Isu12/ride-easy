import { ArrowLeft, Check, ChevronLeft, ChevronRight, Ruler } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BookingPanel, useBookingQuote, type PanelState } from "@/components/BookingPanel";
import { BikeBadge } from "@/components/bikes";
import { Button, Sheet, Skeleton } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { getBikeBySlug, listBikeImages, listCategories, listPublicPromotions } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { scDateTime, toLocalInput } from "@/lib/time";
import type { BikeImage } from "@/lib/types";
import NotFound from "./NotFound";

function Gallery({ images, name }: { images: BikeImage[]; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const next = (i + images.length) % images.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  if (!images.length) return <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-tint text-ink-soft">No photos yet</div>;
  return (
    <div className="relative">
      <div ref={ref} onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto rounded-3xl bg-tint [scrollbar-width:none]" aria-roledescription="carousel" aria-label={`${name} photos`}>
        {images.map((img, i) => (
          <img key={img.id} src={img.storage_path} alt={`${name}, photo ${i + 1} of ${images.length}`}
            className={`h-full w-full shrink-0 snap-center ${img.storage_path.includes("hero") ? "object-cover" : "object-contain mix-blend-multiply"}`} />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button onClick={() => go(index - 1)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-soft hover:bg-surface" aria-label="Previous photo"><ChevronLeft /></button>
          <button onClick={() => go(index + 1)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-soft hover:bg-surface" aria-label="Next photo"><ChevronRight /></button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {images.map((img, i) => (
              <button key={img.id} onClick={() => go(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index}
                className={`h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2.5 bg-surface/90"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function BikeDetail() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panel, setPanel] = useState<PanelState>({
    start: params.get("start") ?? toLocalInput(scDateTime(1, 9)),
    end: params.get("end") ?? toLocalInput(scDateTime(1, 18)),
    qty: Math.max(1, Number(params.get("qty")) || 1),
    code: "",
  });

  const { data, loading } = useData(async () => {
    const bike = await getBikeBySlug(slug);
    if (!bike) return { bike: null, images: [], categories: [], promotions: [] };
    const [images, categories, promotions] = await Promise.all([listBikeImages(bike.id), listCategories(), listPublicPromotions()]);
    return { bike, images: [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order), categories, promotions };
  }, [slug]);

  const mobileQuote = useBookingQuote(data?.bike, data?.promotions ?? [], panel, panel.code);

  if (loading) {
    return (
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4"><Skeleton className="aspect-[4/3] rounded-3xl" /><Skeleton className="h-12 w-2/3" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-[560px] rounded-2xl" />
      </div>
    );
  }
  if (!data?.bike) return <NotFound />;
  const { bike, images, categories, promotions } = data;
  const category = categories.find((c) => c.id === bike.category_id);

  return (
    <div className="container-page pb-28 pt-10 lg:pb-16">
      <Link to="/bikes" className="mb-6 inline-flex items-center gap-2 font-medium text-primary hover:underline"><ArrowLeft size={17} /> Back to our bikes</Link>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Gallery images={images} name={bike.name} />
          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              {category && <p className="eyebrow">{category.name}</p>}
              <BikeBadge bike={bike} />
            </div>
            <h1 className="h-display mt-2 text-5xl sm:text-6xl">{bike.name}</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">{bike.short_description} {bike.description}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {bike.features.map((f) => (
                <li key={f} className="inline-flex items-center gap-1.5 rounded-md bg-tint px-3 py-1.5 text-sm font-medium"><Check size={14} className="text-primary" aria-hidden /> {f}</li>
              ))}
            </ul>
            <p className="mt-5 flex items-center gap-2 text-ink-soft">
              <Ruler size={18} className="text-primary" aria-hidden />
              Fits riders {bike.rider_height_min_cm}–{bike.rider_height_max_cm} cm · Frame {bike.frame_size} · {bike.gear_count} gears{bike.is_electric ? " · Electric assist" : ""}
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3" aria-label="Prices">
              {[
                [bike.hourly_rate, "per hour"],
                [bike.daily_rate, "per day"],
                [bike.weekly_rate, "per week"],
              ].map(([v, l]) => (
                <div key={l as string} className="rounded-2xl bg-tint/70 px-3 py-5 text-center">
                  <p className="text-xl font-bold sm:text-3xl">{formatMoney(v as number)}</p>
                  <p className="mt-1 text-sm text-ink-soft">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-soft">We always charge the lowest price for your rental time. Hours never cost more than a day, and days never cost more than a week.</p>
          </div>
        </div>

        {/* Desktop sticky panel */}
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-7">
            <BookingPanel bike={bike} promotions={promotions} state={panel} onChange={setPanel} />
          </div>
        </aside>
      </div>

      {/* Mobile: bottom bar + sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-soft">{mobileQuote.q ? `Total for ${mobileQuote.q.hours} h` : "From"}</p>
            <p className="text-xl font-bold">{formatMoney(mobileQuote.q?.total ?? bike.hourly_rate)}{!mobileQuote.q && <span className="text-sm font-normal text-ink-soft"> / hour</span>}</p>
          </div>
          <Button onClick={() => setSheetOpen(true)}>Choose dates & book</Button>
        </div>
      </div>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={bike.name} side="bottom">
        <BookingPanel bike={bike} promotions={promotions} state={panel} onChange={setPanel} />
      </Sheet>
    </div>
  );
}
