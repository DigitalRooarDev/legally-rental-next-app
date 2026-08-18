/**
 * The booking selection, and how it travels in a URL.
 *
 * Deliberately framework-neutral — no `"use client"`, no React, no dayjs — so
 * both sides can use it: the listing card writes the query string, and
 * `/rental/<slug>/checkout` reads it back on the **server**. Exporting these
 * from the client component that happened to need them first meant the server
 * could not call them at all ("Attempted to call readBookingSelection() from the
 * server but readBookingSelection is on the client").
 */

/**
 * The party being booked, as `checkoutOrder` takes it.
 *
 * Starts at one adult because a stay with nobody in it is not a booking.
 */
export const EMPTY_PARTY = Object.freeze({ adults: 1, children: 0, infants: 0, pets: 0 });

/**
 * The keys the selection travels under.
 *
 * One definition for the listing page's query string *and* the checkout link, so
 * the two cannot drift — a Reserve that wrote `from` while checkout read
 * `check_in` would silently lose the dates.
 */
export const BOOKING_PARAM_KEYS = Object.freeze([
  'check_in',
  'check_out',
  'adults',
  'children',
  'infants',
  'pets',
  'hours',
]);

const int = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/**
 * Reads a selection out of a query string.
 *
 * @param {URLSearchParams|{get: (key: string) => string|null}} params
 *   Anything with `get` — `useSearchParams()` on the client, a `URLSearchParams`
 *   built from `searchParams` on the server.
 */
export const readBookingSelection = (params) => ({
  dates: { from: params.get('check_in') ?? '', to: params.get('check_out') ?? '' },
  party: {
    adults: int(params.get('adults'), EMPTY_PARTY.adults),
    children: int(params.get('children')),
    infants: int(params.get('infants')),
    pets: int(params.get('pets')),
  },
  /**
   * `0` means "not in the URL", not "zero hours" — only hourly listings carry
   * this, and it is those components that supply the default of 1. Reading a
   * default here would put `hours=1` on every per-night booking.
   */
  hours: int(params.get('hours')),
});

/**
 * The inverse. Zero counts are dropped rather than written as `0`, so a URL
 * carries only what the visitor actually chose.
 *
 * @param {object} input
 * @param {{from: string, to: string}} input.dates
 * @param {object} input.party
 * @param {boolean} [input.takesGuests] Property only; see `BookingRules`.
 * @param {number} [input.hours]        Hourly listings only.
 */
export const toBookingParams = ({ dates, party, takesGuests, hours }) => {
  const params = new URLSearchParams();

  if (dates.from) params.set('check_in', dates.from);
  if (dates.to) params.set('check_out', dates.to);

  if (takesGuests) {
    // Adults is always written: one adult is a real choice, not an empty one.
    params.set('adults', String(party.adults));
    if (party.children > 0) params.set('children', String(party.children));
    if (party.infants > 0) params.set('infants', String(party.infants));
    if (party.pets > 0) params.set('pets', String(party.pets));
  }

  if (hours > 0) params.set('hours', String(hours));

  return params;
};

/**
 * Normalises Next's `searchParams` object into something `readBookingSelection`
 * can read — a repeated key arrives as an array, and every value as a string.
 */
export const toSearchParams = (searchParams) =>
  new URLSearchParams(
    Object.entries(searchParams ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(Array.isArray(value) ? value[0] : value)]),
  );
