/** Build an .ics calendar file for a booking. */
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

export function bookingIcs(b: { reference: string; start_at: string; end_at: string }, bikeName: string, location: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ride Easy Bike Rentals//Prototype//EN",
    "BEGIN:VEVENT",
    `UID:${b.reference}@rideeasy.test`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.start_at)}`,
    `DTEND:${stamp(b.end_at)}`,
    `SUMMARY:${escape(`Bike rental: ${bikeName} (${b.reference})`)}`,
    `LOCATION:${escape(location)}`,
    `DESCRIPTION:${escape(`Booking ${b.reference}. Bring your booking reference and a photo ID to reception.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadFile(filename: string, content: string, type = "text/calendar") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
