const DAY_MS = 24 * 60 * 60 * 1000;

/** Nights between date-input values. Checkout morning is not an extra night. */
export function nightsBetweenDateInputs(checkIn: string, checkOut: string): number {
  const start = checkIn.slice(0, 10);
  const end = checkOut.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 0;
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS);
}

export function formatPropertyWhen(
  timestamp: number,
  timeZone: string | undefined,
  withTime: boolean,
): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  };
  if (timeZone) options.timeZone = timeZone;
  try {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}
