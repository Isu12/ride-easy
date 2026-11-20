import { ArrowRight, Clock, MapPin, MessageCircle, ShieldCheck, ShoppingBasket, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { BikeCard, BikeCardSkeleton, QuickSearch } from "@/components/bikes";
import { ButtonLink, buttonClass } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { getSettings, listBikeImages, listBikes, listCategories, listPublicPromotions, primaryImageFor } from "@/lib/api";
import { formatMoneyCompact } from "@/lib/money";
import { discountLabel, lowestDailyRate } from "@/lib/pricing";
import { promotionStatus } from "@/lib/stats";
import { scDateTime, toLocalInput } from "@/lib/time";

export const STEPS = [
  { title: "Choose your bike", text: "Find your perfect ride and pick your dates." },
  { title: "Book & pay online", text: "A few details and you're ready to roll." },
  { title: "Collect at reception", text: "Your bike, helmet and lock will be waiting." },
  { title: "Explore the island", text: "Take the scenic route. Make it your own." },
];

const FAQ = [
  { q: "What's included with my rental?", a: "Every bike comes with a helmet, a lock and a quick safety check before you set off. Kids' bikes include a kids' helmet." },
  { q: "Where do I collect my bike?", a: "At the hotel reception. Bring your booking reference and a photo ID. Our team will set the saddle height for you." },
  { q: "Can I rent for just a few hours?", a: "Yes. Rent by the hour, day or week. We always charge the lowest price for your time, so a long afternoon never costs more than a full day." },
  { q: "What if it rains or I change my plans?", a: "Cancel for free up to 24 hours before pick-up. You can request a cancellation from Find my booking." },
];

function useHomeData() {
  return useData(async () => {
    const [bikes, categories, images, promotions, settings] = await Promise.all([
      listBikes(), listCategories(), listBikeImages(), listPublicPromotions(), getSettings(),
    ]);
    return { bikes, categories, images, promotions, settings };
  });
}

export default function Home() {
  const { data, loading } = useHomeData();
  const fromRate = data ? lowestDailyRate(data.bikes) : null;
  const livePromo = data?.promotions.find((p) => p.promo_code === null && p.applies_to === "all_bikes" && promotionStatus(p) === "Live");
  const featured = data?.bikes.filter((b) => b.is_featured).slice(0, 3) ?? [];
  const whatsapp = data?.settings.whatsapp.replace(/[^\d]/g, "");

  return (
    <>
      {/* Hero */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden bg-island">
          <img src="/images/hero-beach.jpg" alt="" className="h-full w-full object-cover object-[70%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-island/90 via-island/60 to-island/0" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-island/50 to-transparent md:hidden" />
        </div>
        <div className="container-page pb-40 pt-16 text-white sm:pt-24 md:pb-44">
          <p className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-white/90">
            <MapPin size={16} aria-hidden /> La Digue, Seychelles
          </p>
          <h1 className="font-display text-7xl uppercase leading-[0.9] tracking-wide sm:text-8xl lg:text-[120px]">Bike for rent</h1>
          <p className="mt-6 text-2xl font-semibold sm:text-3xl">
            Explore more. <span className="text-on-dark-accent">Spend less.</span>
          </p>
          <p className="mt-3 max-w-md text-[17px] leading-relaxed text-white/90">
            Quiet coastal roads. Hidden beaches. A little island freedom, at your own pace.
          </p>
          <div className="mt-7 h-12">
            {fromRate !== null && (
              <ButtonLink to="/bikes" variant="cta" className="animate-fade-up">
                Your island adventure starts at {formatMoneyCompact(fromRate)} / day <ArrowRight size={17} />
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      <div className="container-page relative z-10 -mt-28">
        <QuickSearch defaultStart={toLocalInput(scDateTime(1, 9))} defaultEnd={toLocalInput(scDateTime(1, 18))} />
      </div>

      {/* Live promotion */}
      {livePromo && (
        <section className="container-page mt-10" aria-label="Current offer">
          <div className="flex flex-col gap-4 rounded-2xl bg-island px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-start gap-4">
              <Ticket className="mt-0.5 shrink-0 text-on-dark-accent" size={26} aria-hidden />
              <div>
                <p className="text-lg font-bold">{livePromo.name} · {discountLabel(livePromo).replace("−", "")} off your ride</p>
                <p className="text-white/85">{livePromo.description}</p>
              </div>
            </div>
            <Link to="/bikes" className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-on-dark-accent hover:underline">
              Make the most of it <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {/* Feature strip */}
      <section className="container-page mt-12" aria-label="Why ride with us">
        <ul className="grid gap-6 border-b border-line pb-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, title: "Your time, your ride", text: "Hourly, daily or weekly" },
            { icon: MapPin, title: "Easy hotel pick-up", text: "Collect at reception" },
            { icon: ShieldCheck, title: "Ready for adventure", text: "Safe, well-maintained bikes" },
            { icon: ShoppingBasket, title: "Room for the little things", text: "Baskets available" },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tint text-primary"><Icon size={22} aria-hidden /></span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-ink-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured bikes */}
      <section className="container-page py-16" aria-labelledby="featured-title">
        <p className="eyebrow mb-2">Find your island companion</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="featured-title" className="h-display text-5xl sm:text-6xl">A ride for every adventure</h2>
            <p className="mt-2 text-lg text-ink-soft">From easy beach days to the road less travelled.</p>
          </div>
          <Link to="/bikes" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">Explore all bikes <ArrowRight size={17} /></Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading || !data
            ? Array.from({ length: 3 }, (_, i) => <BikeCardSkeleton key={i} />)
            : featured.map((b) => (
                <BikeCard key={b.id} bike={b} category={data.categories.find((c) => c.id === b.category_id)} image={primaryImageFor(b.id, data.images)} />
              ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface py-16" aria-labelledby="steps-title">
        <div className="container-page">
          <p className="eyebrow mb-2 text-center">Less planning. More pedalling.</p>
          <h2 id="steps-title" className="h-display text-center text-5xl">Your holiday, in four easy steps</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-tint font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-5 text-lg font-medium">{s.title}</p>
                <p className="mt-1 text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16" aria-labelledby="faq-title">
        <div className="container-page max-w-4xl">
          <h2 id="faq-title" className="h-display text-5xl">Good to know before you go</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-lg font-semibold marker:hidden">
                  <span className="text-primary transition group-open:rotate-90" aria-hidden>▸</span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-7 text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/how-it-works" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
              More about your island ride <ArrowRight size={16} />
            </Link>
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className={buttonClass("primary", "md")}>
                <MessageCircle size={18} /> Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
