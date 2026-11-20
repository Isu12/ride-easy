import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button, Skeleton } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { listBikes, listBookings } from "@/lib/api";
import { dailyUnitsBooked } from "@/lib/stats";
import { addDays, formatDate, scDate } from "@/lib/time";
import { AdminTitle } from "./AdminLayout";

const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/** Week / month grid of booked vs owned units per bike per day. */
export default function CalendarAdmin() {
  const today = scDate(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [start, setStart] = useState(today);
  const length = view === "week" ? 7 : 30;
  const dates = Array.from({ length }, (_, i) => addDays(start, i));

  const { data, loading } = useData(async () => {
    const [bikes, bookings] = await Promise.all([listBikes({ includeInactive: true }), listBookings()]);
    return { bikes, bookings };
  });

  return (
    <>
      <AdminTitle title="Availability">Booked vs owned units per bike, per day (Seychelles time).</AdminTitle>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, -length))} aria-label="Previous period"><ChevronLeft size={16} /></Button>
          <Button variant="outline" size="sm" onClick={() => setStart(today)}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, length))} aria-label="Next period"><ChevronRight size={16} /></Button>
          <span className="ml-2 font-semibold">{formatDate(dates[0])} – {formatDate(dates[dates.length - 1])}</span>
        </div>
        <div role="tablist" className="flex rounded-xl bg-surface p-1 ring-1 ring-line">
          {(["week", "month"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize ${view === v ? "bg-primary text-primary-ink" : "text-ink-soft hover:text-ink"}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded bg-status-available-bg ring-1 ring-status-available/30" /> Plenty free</span>
        <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded bg-status-low-bg ring-1 ring-status-low/30" /> 1–2 left</span>
        <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded bg-status-booked-bg ring-1 ring-status-booked/30" /> Fully booked</span>
      </div>

      {loading || !data ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[190px] border-b border-line bg-surface px-4 py-3 text-left font-semibold">Bike</th>
                {dates.map((d) => (
                  <th key={d} className={`min-w-[58px] border-b border-line px-1 py-2 text-center font-medium ${d === today ? "text-primary" : "text-ink-soft"}`}>
                    <span className="block text-xs">{dayLabel.format(new Date(`${d}T00:00:00Z`))}</span>
                    <span className="block text-base font-bold">{Number(d.slice(8))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.bikes.map((bike) => {
                const booked = dailyUnitsBooked(bike.id, data.bookings, dates);
                return (
                  <tr key={bike.id}>
                    <th scope="row" className="sticky left-0 z-10 border-b border-line bg-surface px-4 py-2 text-left font-medium">
                      {bike.name}<span className="block text-xs font-normal text-ink-soft">{bike.quantity_owned} owned</span>
                    </th>
                    {booked.map((n, i) => {
                      const free = bike.quantity_owned - n;
                      const cls = free <= 0 ? "bg-status-booked-bg text-status-booked" : free <= 2 ? "bg-status-low-bg text-status-low" : "bg-status-available-bg text-status-available";
                      return (
                        <td key={dates[i]} className="border-b border-line p-1">
                          <div className={`rounded-md px-1 py-2 text-center text-xs font-bold tabular-nums ${cls}`} title={`${bike.name}, ${formatDate(dates[i])}: ${n} of ${bike.quantity_owned} booked`}>
                            {n}/{bike.quantity_owned}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
