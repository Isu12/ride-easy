import { Clock, MapPin, Phone } from "lucide-react";
import { ButtonLink, PageHeading, Skeleton } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { getSettings } from "@/lib/api";
import { TZ_LABEL } from "@/lib/time";
import { STEPS } from "./Home";

export function HowItWorks() {
  const { data: settings } = useData(getSettings);
  return (
    <div className="container-page py-14">
      <PageHeading eyebrow="Less planning. More pedalling." title="Your holiday, made easy">
        Four simple steps from hotel reception to your next adventure.
      </PageHeading>
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card p-6">
            <span className="text-lg font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-6 text-lg font-medium">{s.title}</p>
            <p className="mt-1 text-ink-soft">{s.text}</p>
          </li>
        ))}
      </ol>

      <section className="mt-16 overflow-hidden rounded-3xl hero-gradient p-8 text-white sm:p-12">
        <h2 className="font-display text-5xl uppercase tracking-wide">Collect your island companion</h2>
        {settings ? (
          <div className="mt-6 grid gap-4 text-white/90 sm:grid-cols-3">
            <p className="flex gap-3"><MapPin className="shrink-0 text-on-dark-accent" aria-hidden /> {settings.pickup_location_text}</p>
            <p className="flex gap-3"><Clock className="shrink-0 text-on-dark-accent" aria-hidden /> {settings.opening_hours} · {TZ_LABEL}</p>
            <p className="flex gap-3"><Phone className="shrink-0 text-on-dark-accent" aria-hidden /> {settings.phone} · {settings.email}</p>
          </div>
        ) : <Skeleton className="mt-6 h-20 bg-white/20" />}
        <ButtonLink to="/bikes" className="mt-8">Find my ride</ButtonLink>
      </section>
    </div>
  );
}

export function Terms() {
  const { data: settings, loading } = useData(getSettings);
  return (
    <div className="container-page max-w-3xl py-14">
      <PageHeading eyebrow="The small print, kept short" title="Rental terms" />
      {loading || !settings ? (
        <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-5" />)}</div>
      ) : (
        <div className="card space-y-4 p-7 leading-relaxed text-ink-soft">
          {settings.terms_text.split(/\n{2,}/).map((p) => <p key={p}>{p}</p>)}
        </div>
      )}
    </div>
  );
}
