/**
 * Presentation helpers. Every function is total — it returns a printable value
 * for junk input rather than leaking `NaN`/`undefined` into the markup.
 */

/**
 * "5375" | 5375 -> { base: "5375.00", formatted: "5,375.00" }
 * Render with the currency symbol at the call site: `₦ {formatPrice(x).formatted}`.
 */
export const formatPrice = (amount) => {
  const cleaned = String(amount ?? "0").replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const value = Number.parseFloat(cleaned);
  const base = Number.isFinite(value) ? value.toFixed(2) : "0.00";

  return {
    base,
    formatted: base.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  };
};

/** "Per Day" -> "/per day" */
export const formatPeriod = (periodType) =>
  periodType ? `/${String(periodType).toLowerCase()}` : "";

/** "4.33" -> "4.3". Returns null when there is no rating yet, so callers can hide the block. */
export const formatRating = (rating) => {
  const value = Number.parseFloat(rating);
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : null;
};

export const formatRatingCount = (count) => {
  const value = Number.parseInt(count, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const stripHtml = (html) => (html ? String(html).replace(/<\/?[^>]+(>|$)/g, "") : "");

/**
 * "2026-06-23" | ISO timestamp -> "23 Jun 2026".
 *
 * Pinned to en-GB/UTC so the server and client render the same string — the
 * visitor's locale would otherwise cause a hydration mismatch.
 */
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Parses an API timestamp to a fixed instant, whatever the runtime's zone.
 *
 * The API sends `"2026-08-17 08:26:29"` — a space, no zone. `new Date()` treats
 * that as **local** time, so the same string becomes a different instant on the
 * server than in the browser: the rendered text differs between the two, which
 * React reports as a hydration mismatch, and on a machine at UTC+5:30 it is also
 * simply 5½ hours wrong. Turning it into `…T08:26:29Z` first pins it to UTC, which
 * is the zone the formatters already print in.
 *
 * ISO strings, `"2026-06-23"` and anything else are handed straight to `Date`,
 * which already parses them unambiguously.
 */
const SPACE_SEPARATED = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(:\d{2})?)$/;

/**
 * `transactionHistory` is the odd one out: `"18-12-2025 06:19 PM"` — day first,
 * and a 12-hour clock.
 *
 * `Date` cannot read it at all (it yields `Invalid Date`, so the raw string used
 * to fall straight through to the page), and day-first is ambiguous with the
 * month-first form `Date` *does* accept — `18-12-2025` would silently become
 * December on one runtime and nothing on another. Rewritten to ISO here so it
 * joins the same UTC-pinned path as every other timestamp.
 */
const DAY_FIRST_12H = /^(\d{2})-(\d{2})-(\d{4}) (\d{1,2}):(\d{2})\s*(AM|PM)$/i;

const fromDayFirst = (raw) => {
  const match = DAY_FIRST_12H.exec(raw);
  if (!match) return null;

  const [, day, month, year, hour, minute, meridiem] = match;
  const hours = Number.parseInt(hour, 10) % 12 + (/pm/i.test(meridiem) ? 12 : 0);

  return `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${minute}:00Z`;
};

/**
 * `getOrderDetails` sends some timestamps as PHP's serialised `DateTime` —
 * `{ date: "2026-06-23 08:26:29.000000", timezone_type: 3, timezone: "UTC" }` —
 * where `orderList` sends the same field as a plain string. Unwrapped here rather
 * than at each call site so the list, the detail page and the timeline all agree;
 * without it `String(value)` yields "[object Object]", which is exactly what the
 * page then renders.
 */
const toDateString = (value) => {
  const raw = value && typeof value === "object" && !(value instanceof Date) ? (value.date ?? "") : value;

  // PHP appends microseconds (`08:26:29.000000`), which `SPACE_SEPARATED` below
  // will not match — leaving the string to `Date`, which reads a space-separated
  // stamp as *local* time. Dropping them keeps it on the UTC-pinned path.
  return typeof raw === "string" ? raw.replace(/(\d{2}:\d{2}:\d{2})\.\d+/, "$1") : raw;
};

const parseApiDate = (value) => {
  const raw = String(toDateString(value));

  const dayFirst = fromDayFirst(raw);
  if (dayFirst) return new Date(dayFirst);

  const match = SPACE_SEPARATED.exec(raw);
  return new Date(match ? `${match[1]}T${match[2]}Z` : raw);
};

export const formatDate = (value) => {
  const raw = toDateString(value);
  if (!raw) return "";
  const date = parseApiDate(value);
  // Falls back to the unwrapped string, never the raw object — `String({...})`
  // is how "[object Object]" reaches the page.
  return Number.isNaN(date.getTime()) ? String(raw) : dateFormatter.format(date);
};

/**
 * "23 Jun 2026, 04:15 pm" — a timeline entry, where the time of day is the point.
 *
 * Same en-GB/UTC pinning as `formatDate`, and for the same reason: a timestamp
 * rendered in the visitor's own zone would differ between the server's HTML and
 * the client's, which React reports as a hydration mismatch. UTC also keeps two
 * entries minutes apart in the order the API sent them.
 */
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

export const formatDateTime = (value) => {
  const raw = toDateString(value);
  if (!raw) return "";
  const date = parseApiDate(value);
  return Number.isNaN(date.getTime()) ? String(raw) : dateTimeFormatter.format(date);
};

/** Collapses a same-day booking to one date instead of "23 Jun – 23 Jun". */
export const formatBookingRange = (from, to) => {
  const start = formatDate(from);
  const end = formatDate(to);

  if (!start) return end;
  if (!end || start === end) return start;
  return `${start} – ${end}`;
};
