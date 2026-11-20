import { CalendarClock, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BikeCard, BikeCardSkeleton } from "@/components/bikes";
import { Button, EmptyState, PageHeading, Sheet } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { getAvailabilityForAll, listBikeImages, listBikes, listCategories, primaryImageFor } from "@/lib/api";
import { validatePeriod } from "@/lib/availability";
import { formatDateTimeShort, fromLocalInput } from "@/lib/time";
import type { Bike } from "@/lib/types";

type Sort = "recommended" | "price-asc" | "price-desc";
const PRICE_RANGES = [
  { value: "", label: "Any daily price" },
  { value: "0-12", label: "Up to $12 / day" },
  { value: "12-20", label: "$12 – $20 / day" },
  { value: "20-999", label: "$20+ / day" },
];

export default function Bikes() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = params.get("category") ?? "";
  const sort = (params.get("sort") as Sort) ?? "recommended";
  const height = params.get("height") ?? "";
  const price = params.get("price") ?? "";
  const electric = params.get("electric") === "1";
  const basket = params.get("basket") === "1";

  const startIso = fromLocalInput(params.get("start"));
  const endIso = fromLocalInput(params.get("end"));
  const datesValid = !!startIso && !!endIso && !validatePeriod(startIso, endIso);
  const qty = Math.max(1, Number(params.get("qty")) || 1);

  const { data, loading } = useData(async () => {
    const [bikes, categories, images, availability] = await Promise.all([
      listBikes(), listCategories(), listBikeImages(),
      datesValid ? getAvailabilityForAll(startIso!, endIso!) : Promise.resolve(null),
    ]);
    return { bikes, categories, images, availability };
  }, [startIso, endIso]);

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const h = Number(height);
    const [min, max] = price ? price.split("-").map(Number) : [0, Infinity];
    const list = data.bikes.filter((b: Bike) =>
      (!category || b.category_id === category) &&
      (!electric || b.is_electric) &&
      (!basket || b.has_basket) &&
      (!h || (h >= b.rider_height_min_cm && h <= b.rider_height_max_cm)) &&
      b.daily_rate >= min && b.daily_rate <= max,
    );
    if (sort === "price-asc") list.sort((a, b) => a.daily_rate - b.daily_rate);
    if (sort === "price-desc") list.sort((a, b) => b.daily_rate - a.daily_rate);
    if (data.availability) {
      // Bikes with enough units for the requested quantity first
      list.sort((a, b) => Number((data.availability![b.id] ?? 0) >= qty) - Number((data.availability![a.id] ?? 0) >= qty));
    }
    return list;
  }, [data, category, electric, basket, height, price, sort, qty]);

  const activeFilters = [category, height, price, electric, basket].filter(Boolean).length;
  const clearFilters = () => {
    const next = new URLSearchParams();
    ["start", "end", "qty"].forEach((k) => params.get(k) && next.set(k, params.get(k)!));
    setParams(next, { replace: true });
  };

  const dateQuery = datesValid ? `?${new URLSearchParams({ start: params.get("start")!, end: params.get("end")!, qty: String(qty) })}` : "";

  const filters: ReactNode = (
    <div className="grid gap-4 md:grid-cols-4">
      <div>
        <label className="sr-only md:not-sr-only md:field-label" htmlFor="f-cat">Category</label>
        <select id="f-cat" className="field" value={category} onChange={(e) => update("category", e.target.value)}>
          <option value="">All categories</option>
          {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="sr-only md:not-sr-only md:field-label" htmlFor="f-sort">Sort by</label>
        <select id="f-sort" className="field" value={sort} onChange={(e) => update("sort", e.target.value === "recommended" ? null : e.target.value)}>
          <option value="recommended">Recommended</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>
      <div>
        <label className="sr-only md:not-sr-only md:field-label" htmlFor="f-height">Rider height (cm)</label>
        <input id="f-height" className="field" inputMode="numeric" placeholder="Rider height (cm)" value={height}
          onChange={(e) => update("height", e.target.value.replace(/\D/g, "").slice(0, 3))} />
      </div>
      <div>
        <label className="sr-only md:not-sr-only md:field-label" htmlFor="f-price">Daily price</label>
        <select id="f-price" className="field" value={price} onChange={(e) => update("price", e.target.value)}>
          {PRICE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-6 md:col-span-4">
        {[
          { key: "electric", label: "Electric bikes", on: electric },
          { key: "basket", label: "With basket", on: basket },
        ].map((c) => (
          <label key={c.key} className="inline-flex cursor-pointer items-center gap-2.5 font-semibold">
            <input type="checkbox" className="h-5 w-5 rounded accent-[rgb(var(--primary))]" checked={c.on} onChange={(e) => update(c.key, e.target.checked ? "1" : null)} />
            {c.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container-page py-14">
      <PageHeading eyebrow="Your island, your pace" title="Find your perfect ride">
        {data ? `${numberWord(data.bikes.length)} ways to make the island your own.` : "Every way to make the island your own."}
      </PageHeading>

      {datesValid && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="flex items-center gap-2 font-medium">
            <CalendarClock size={18} className="text-primary" aria-hidden />
            Showing availability for {formatDateTimeShort(startIso!)} → {formatDateTimeShort(endIso!)} · {qty} {qty === 1 ? "bike" : "bikes"}
          </p>
          <Link to="/" className="text-sm font-semibold text-primary hover:underline">Change dates</Link>
        </div>
      )}

      {/* Filters: inline on desktop, sheet on mobile */}
      <div className="hidden md:block">{filters}</div>
      <div className="flex items-center justify-between md:hidden">
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={17} /> Filters & sort {activeFilters > 0 && <span className="rounded-full bg-primary px-2 text-xs text-primary-ink">{activeFilters}</span>}
        </Button>
      </div>
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters & sort" side="bottom">
        {filters}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={clearFilters}>Clear</Button>
          <Button className="flex-1" onClick={() => setFiltersOpen(false)}>Show {filtered.length} bikes</Button>
        </div>
      </Sheet>

      <div className="mb-6 mt-6 flex items-center justify-between text-ink-soft">
        {activeFilters > 0 ? (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><X size={15} /> Clear filters</button>
        ) : <span />}
        {!loading && <span aria-live="polite">{filtered.length} {filtered.length === 1 ? "bike" : "bikes"}</span>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading || !data
          ? Array.from({ length: 6 }, (_, i) => <BikeCardSkeleton key={i} />)
          : filtered.map((b) => (
              <BikeCard key={b.id} bike={b} category={data.categories.find((c) => c.id === b.category_id)}
                image={primaryImageFor(b.id, data.images)} free={data.availability ? data.availability[b.id] ?? 0 : undefined} linkSearch={dateQuery} />
            ))}
      </div>

      {!loading && data && filtered.length === 0 && (
        <EmptyState icon={<SearchX />} title="No bikes match those filters" action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}>
          Try a different category or price range, or clear the rider height.
        </EmptyState>
      )}
    </div>
  );
}

function numberWord(n: number) {
  const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  return words[n] ?? String(n);
}
