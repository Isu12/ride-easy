/**
 * Seychelles time helpers (Indian/Mahe, UTC+4, no daylight saving).
 * Instants are stored as ISO UTC strings; inputs and labels use Seychelles wall-clock time.
 */
export const TIMEZONE = "Indian/Mahe";
export const TZ_LABEL = "Seychelles time";
const OFFSET_MS = 4 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO instant → "YYYY-MM-DDTHH:mm" (Seychelles wall clock) for <input type="datetime-local">. */
export function toLocalInput(iso: string | Date): string {
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" (Seychelles wall clock) → ISO instant. Returns null if invalid. */
export function fromLocalInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi) - OFFSET_MS;
  return Number.isNaN(utc) ? null : new Date(utc).toISOString();
}

/** ISO instant → "YYYY-MM-DD" calendar date in Seychelles. */
export function scDate(iso: string | Date): string {
  return toLocalInput(iso).slice(0, 10);
}

/** Add whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Start of a Seychelles calendar day as an ISO instant. */
export function startOfScDay(date: string): string {
  return fromLocalInput(`${date}T00:00`)!;
}

const dtFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});
const dFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "numeric", month: "short", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });

export const formatDateTime = (iso: string) => dtFmt.format(new Date(iso));
export const formatDateTimeShort = (iso: string) => shortFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
/** "YYYY-MM-DD" → "1 Dec 2026" */
export const formatDate = (date: string) => dFmt.format(new Date(`${date}T12:00:00+04:00`));

/** A Seychelles wall-clock time on a date offset from today, e.g. tomorrow 09:00. */
export function scDateTime(dayOffset: number, hour: number, minute = 0, now = new Date()): string {
  return fromLocalInput(`${addDays(scDate(now), dayOffset)}T${pad(hour)}:${pad(minute)}`)!;
}
