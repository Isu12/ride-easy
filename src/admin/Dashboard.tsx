import { ArrowDownToLine, ArrowUpFromLine, Bike, CalendarCheck, CircleDollarSign, MailWarning } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/booking";
import { Badge, Skeleton } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { listAllPromotions, listBikes, listBookings } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { discountLabel } from "@/lib/pricing";
import { bookingsPerDay, dashboardStats, promotionStatus } from "@/lib/stats";
import { formatDate, formatTime, scDate } from "@/lib/time";
import type { Bike as BikeT, Booking } from "@/lib/types";
import { AdminTitle } from "./AdminLayout";

function StatCard({ icon, label, value, sub, to }: { icon: ReactNode; label: string; value: ReactNode; sub?: string; to?: string }) {
  const body = (
    <div className="card h-full p-5 transition hover:shadow-lift">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-soft"><span className="text-primary">{icon}</span> {label}</div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

/** Bookings per day: one series, so no legend; hover shows the exact value. */
function LineChart({ series }: { series: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, PAD = { l: 32, r: 12, t: 12, b: 28 };
  const max = Math.max(4, ...series.map((d) => d.count));
  const niceMax = Math.ceil(max / 2) * 2;
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (series.length - 1);
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / niceMax);
  const path = series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(" ");
  const ticks = [0, niceMax / 2, niceMax];
  const h = hover !== null ? series[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bookings per day for the last 30 days"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (series.length - 1));
          setHover(Math.max(0, Math.min(series.length - 1, i)));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--border))" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="rgb(var(--ink-soft))">{t}</text>
          </g>
        ))}
        {[0, Math.floor(series.length / 2), series.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize={11} fill="rgb(var(--ink-soft))">
            {formatDate(series[i].date).replace(/ \d{4}$/, "")}
          </text>
        ))}
        <path d={`${path} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="rgb(var(--primary) / 0.08)" />
        <path d={path} fill="none" stroke="rgb(var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} stroke="rgb(var(--ink) / 0.3)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.count)} r={5} fill="rgb(var(--primary))" stroke="rgb(var(--surface))" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && h && (
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-dark px-3 py-1.5 text-xs text-white shadow-lift"
          style={{ left: `${(x(hover) / W) * 100}%` }}>
          <span className="font-semibold">{h.count} {h.count === 1 ? "booking" : "bookings"}</span> · {formatDate(h.date)}
        </div>
      )}
      <table className="sr-only">
        <caption>Bookings per day</caption>
        <thead><tr><th>Date</th><th>Bookings</th></tr></thead>
        <tbody>{series.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function MiniList({ title, items, bikes, timeOf, empty }: { title: string; items: Booking[]; bikes: BikeT[]; timeOf: (b: Booking) => string; empty: string }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-xl bg-tint/50 p-4 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {items.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{b.guest_name}</p>
                <p className="truncate text-sm text-ink-soft">{timeOf(b)} · {b.items.map((i) => `${i.quantity}× ${bikes.find((x) => x.id === i.bike_id)?.name ?? "Bike"}`).join(", ")}</p>
              </div>
              <StatusBadge status={b.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Dashboard() {
  const { data, loading } = useData(async () => {
    const [bookings, bikes, promotions] = await Promise.all([listBookings(), listBikes({ includeInactive: true }), listAllPromotions()]);
    return { bookings, bikes, promotions };
  });

  if (loading || !data) {
    return (
      <>
        <AdminTitle title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <Skeleton className="mt-6 h-72 rounded-2xl" />
      </>
    );
  }

  const s = dashboardStats(data.bookings, data.bikes);
  const live = data.promotions.filter((p) => promotionStatus(p) === "Live");
  const series = bookingsPerDay(data.bookings);

  return (
    <>
      <AdminTitle title="Dashboard">Today at a glance · {formatDate(scDate(new Date()))}</AdminTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<ArrowUpFromLine size={17} />} label="Pick-ups today" value={s.pickupsToday.length} to="/admin/bookings" />
        <StatCard icon={<ArrowDownToLine size={17} />} label="Returns today" value={s.returnsToday.length} to="/admin/bookings" />
        <StatCard icon={<Bike size={17} />} label="Bikes out now" value={<>{s.out} <span className="text-lg font-medium text-ink-soft">/ {s.owned}</span></>} sub={`${s.available} available at reception`} to="/admin/calendar" />
        <StatCard icon={<CalendarCheck size={17} />} label="Bookings this month" value={s.bookingsThisMonth} />
        <StatCard icon={<CircleDollarSign size={17} />} label="Revenue this month" value={formatMoney(s.revenueThisMonth)} sub="Paid bookings only" />
        <StatCard icon={<MailWarning size={17} />} label="Cancellation requests" value={s.pendingCancellations.length}
          sub={s.pendingCancellations.length ? "Waiting for your review" : "Nothing to review"} to="/admin/bookings?cancel=1" />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold">Bookings per day</h2>
        <p className="text-sm text-ink-soft">Last 30 days, by booking date</p>
        <div className="mt-4"><LineChart series={series} /></div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <MiniList title="Today's pick-ups" items={s.pickupsToday} bikes={data.bikes} timeOf={(b) => formatTime(b.start_at)} empty="No pick-ups today." />
        <MiniList title="Today's returns" items={s.returnsToday} bikes={data.bikes} timeOf={(b) => formatTime(b.end_at)} empty="No returns due today." />
        <section className="card p-5">
          <h2 className="font-semibold">Live promotions</h2>
          {live.length === 0 ? (
            <p className="mt-4 rounded-xl bg-tint/50 p-4 text-sm text-ink-soft">No promotions running. <Link to="/admin/promotions" className="link">Create one</Link></p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {live.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-ink-soft">Until {formatDate(p.ends_at)}{p.promo_code ? ` · code ${p.promo_code}` : " · automatic"}</p>
                  </div>
                  <Badge tone="ride">{discountLabel(p)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
