/**
 * Date helpers for `<DateRangeCalendar>`, working on plain `YYYY-MM-DD` strings.
 *
 * Everything constructs `Date`s from year/month/day parts and reads them back the
 * same way, so every value stays at *local* midnight. Parsing `"2026-08-20"` with
 * `new Date(string)` would instead read it as UTC and render as the 19th for any
 * negative-offset viewer — the classic off-by-one this module exists to avoid.
 *
 * Deliberately dependency-free: the calendar is the one date UI in the app that
 * does not go through antd, so it should not drag dayjs in either.
 */

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** @param {Date} date @returns {string} `YYYY-MM-DD` */
export function toISO(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * `""`, null, and unparseable or non-existent dates all mean "no date".
 *
 * @param {string} iso
 * @returns {Date | null} Local midnight.
 */
export function fromISO(iso) {
  if (typeof iso !== 'string') return null;

  const match = ISO_PATTERN.exec(iso);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // `new Date(2026, 1, 31)` silently rolls into March; reject rather than shift.
  return date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? date : null;
}

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addDays = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

export const addMonths = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

export const todayISO = () => toISO(new Date());

/**
 * Whole days from `a` to `b`, negative when `b` is earlier.
 *
 * Rounds because a DST boundary makes the span 23 or 25 hours, which would
 * otherwise truncate to the wrong day count.
 */
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY);

/** Chronological comparator on ISO strings — they sort lexicographically. */
export const compareISO = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Months between two dates, ignoring the day of month. */
export const monthsBetween = (a, b) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

/**
 * Calendar grid for one month, Sunday-first.
 *
 * Leading and trailing cells are `null` rather than the neighbouring month's
 * days: the design shows blanks there, and a `null` cannot be clicked by
 * accident or land in the keyboard tab order.
 *
 * @param {Date} monthDate Any day within the month.
 * @returns {Array<Array<Date | null>>} Weeks of seven cells.
 */
export function buildMonthGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

/**
 * Hardcoded locale so the server and client render identical labels — reading
 * the visitor's locale here would be a hydration mismatch waiting to happen.
 */
const LOCALE = 'en-AU';

const monthLabelFormat = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
const fullDateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatMonthLabel = (date) => monthLabelFormat.format(date);
export const formatFullDate = (date) => fullDateFormat.format(date);

/** Sunday-first initials for the column headers. */
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Sunday-first full names, for the header cells' screen-reader text. */
export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
