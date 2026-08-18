/**
 * How long a booking may be, in the unit the listing is actually sold by.
 *
 * `period_type` is free text from the seller portal ("Per Hour", "Per Day",
 * "Per Week"), and it decides three separate things: what the length is measured
 * in, what step the calendar may land on, and how the rule is worded. Resolving
 * all three in one place is what stops the listing card and the checkout — which
 * both render the same dates dialog — disagreeing about whether nine nights is a
 * valid weekly booking.
 *
 * Framework-neutral on purpose, like `bookingParams`: the server reads it too.
 */

/**
 * Matched in order, loosely, because the seller portal's wording is not fixed —
 * "Per Week", "per week" and "Weekly" are the same listing.
 *
 * `nightsStep` is the granularity of a range: 7 means check-out may only land a
 * whole number of weeks after check-in. `0` means the range does not carry the
 * length at all — an hourly listing gets that from its hour count.
 */
const PERIOD_UNITS = Object.freeze([
  { test: /hour/i, unit: 'hour', label: 'hour', nightsStep: 0 },
  { test: /week/i, unit: 'week', label: 'week', nightsStep: 7 },
]);

/** Everything not matched above is priced per night, which the calendar's own default already is. */
const NIGHTLY = Object.freeze({ unit: 'night', label: 'night', nightsStep: 1 });

/** @param {string} periodType `service.periodType` */
export const periodUnit = (periodType) =>
  PERIOD_UNITS.find((entry) => entry.test.test(String(periodType ?? ''))) ?? NIGHTLY;

/** Rounds `nights` up to the next whole unit — a floor must not fall below one unit. */
const ceilToStep = (nights, step) => Math.ceil(nights / step) * step;

/** Rounds `nights` down — a ceiling must not permit a part-unit booking. */
const floorToStep = (nights, step) => Math.floor(nights / step) * step;

/**
 * The resolved length rules for a listing.
 *
 * @param {import('@/utils/mappers').ServiceDetailViewModel} service
 * @returns {{unit: string, unitLabel: string, nightsStep: number,
 *   minNights: number, maxNights: number, singleDate: boolean}}
 *   `minNights`/`maxNights` are always in nights — that is what the calendar and
 *   the API speak — and always whole multiples of `nightsStep`. `singleDate` means
 *   the booking is one day rather than a span.
 */
export const resolveBookingLength = (service) => {
  const { unit, label, nightsStep } = periodUnit(service?.periodType);

  /**
   * Both minimums are counted in **days**, never in periods.
   *
   * `serviceDetails.minimum_booking_day` says so in its name, and the payloads
   * confirm it: a "Per Week" property sends `minimum_booking_day: 7` alongside
   * `property.minimum_nights: "7"`, which is seven nights — one week — not seven
   * weeks. `ceilToStep` below is what turns a day count into whole units, so a
   * two-day minimum on a weekly listing still comes out as one week: with
   * week-granular booking there is nothing shorter to sell.
   *
   * The root field wins because it is the only one every rental type has —
   * `minimum_nights` lives on the `property` block, so a vehicle or a dress has
   * none. A Fashion listing may still *carry* a stray `property.minimum_nights`,
   * since the API returns all four blocks, but `toBookingRules` only ever reads
   * the block matching the rental type, so that value never reaches here.
   */
  const rawMin = service?.minimumBookingDay || service?.booking?.minNights || 0;
  const rawMax = service?.booking?.maxNights > 0 ? service.booking.maxNights : 0;

  // Hourly: the hour stepper is the length, so there is no span to pick at all —
  // one date, and `booking_to_date` is sent equal to `booking_from_date`.
  if (nightsStep === 0) {
    return {
      unit,
      unitLabel: label,
      nightsStep: 0,
      minNights: 0,
      maxNights: 0,
      singleDate: true,
    };
  }

  const minNights = Math.max(nightsStep, ceilToStep(rawMin, nightsStep));

  /**
   * Snapped *down* so the cap can never permit a part-unit booking, then held at
   * one unit: a seller who caps a weekly listing at ten nights has really capped
   * it at one week, and floor alone would read as "no maximum".
   */
  const cappedMax = rawMax > 0 ? Math.max(nightsStep, floorToStep(rawMax, nightsStep)) : 0;

  return {
    unit,
    unitLabel: label,
    nightsStep,
    singleDate: false,
    minNights,
    /**
     * A cap below the floor is contradictory seller data — this listing sends
     * `minimum_nights: 7` with `maximum_nights: 5` — and taken literally it makes
     * *no* span bookable: the calendar greys out every day and the visitor can
     * never complete a range. Raised to the floor so the shortest valid booking is
     * always reachable, which keeps the cap the seller asked for while leaving the
     * listing bookable.
     */
    maxNights: cappedMax > 0 ? Math.max(cappedMax, minNights) : 0,
  };
};

/**
 * "1 week" / "7 nights" / "2 hours" — how long the chosen booking is, said in the
 * unit the listing is sold by.
 *
 * A weekly listing reads "for 1 week" rather than "for 7 nights": seven nights is
 * how the span is stored and priced, not how the visitor chose it.
 *
 * @param {object} input
 * @param {number} input.nights Whole nights in the range.
 * @param {number} [input.hours] Hourly listings only.
 * @param {ReturnType<typeof resolveBookingLength>} input.length
 * @returns {string} `''` when nothing has been chosen yet.
 */
export const formatBookingLength = ({ nights, hours = 0, length }) => {
  const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

  if (!length.nightsStep) return hours > 0 ? plural(hours, 'hour') : '';
  if (nights <= 0) return '';

  const units = nights / length.nightsStep;

  // A part-unit span should be impossible — the calendar greys those days out —
  // but a hand-edited URL can still carry one, and "1.43 weeks" is worse than
  // falling back to the nights it really is.
  return Number.isInteger(units) ? plural(units, length.unitLabel) : plural(nights, 'night');
};

/**
 * "Minimum 1 week · Maximum 8 weeks" — the rule, stated before it bites.
 *
 * Worded in the listing's own unit rather than in nights: a weekly listing whose
 * floor is seven nights has a minimum of one week, and saying "7 nights" invites
 * the visitor to try for eight.
 *
 * @returns {string} `''` when there is no rule worth stating.
 */
export const formatLengthWindow = ({ minNights, maxNights, nightsStep, unitLabel }) => {
  // An hourly listing's length is its hour count, so nights describe nothing.
  if (!nightsStep) return '';

  const say = (nights) => {
    const units = nights / nightsStep;
    return `${units} ${unitLabel}${units === 1 ? '' : 's'}`;
  };

  return [
    minNights > 0 ? `Minimum ${say(minNights)}` : '',
    maxNights > 0 ? `Maximum ${say(maxNights)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};
