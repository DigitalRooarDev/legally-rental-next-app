'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Spin } from 'antd';
import { getCheckoutQuote } from '@/actions/getCheckoutQuote';
import { useAuth } from '@/context/authContext';

import BookingGuestPicker from '@/components/rental/BookingGuestPicker';
import BookingHoursPicker, { clampHours } from '@/components/rental/BookingHoursPicker';
import { ChangeDatesModal } from '@/components/rental/BookingEditModals';
import DateRangeTrigger from '@/components/theme/DateRangeTrigger';
import { formatBookingLength, resolveBookingLength } from '@/lib/bookingLength';
import { readBookingSelection, toBookingParams } from '@/lib/bookingParams';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { daysBetween, fromISO } from '@/utils/calendarDates';
import { formatPeriod, formatPrice } from '@/utils/formats';

/**
 * Nights between two `YYYY-MM-DD` strings. Rentals are priced per night, so a
 * same-day booking is one night, never zero.
 */
export const nightsBetween = (from, to) => {
  const start = fromISO(from);
  const end = fromISO(to);
  if (!start || !end) return 0;

  return Math.max(1, daysBetween(start, end));
};

/**
 * The booking panel on a listing page: dates, guests, and Reserve.
 *
 * Nothing is charged here — Reserve carries the selection to `/checkout` in the
 * URL, which keeps the choice shareable, survives the sign-in round trip the
 * checkout's first step may force, and leaves this component stateless from the
 * server's point of view.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').ServiceDetailViewModel} props.service
 */
export default function ServiceBookingCard({ service }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  // Seeded from the URL, so a shared or refreshed link comes back with the same
  // dates and party rather than an empty card.
  const seed = useState(() => readBookingSelection(searchParams))[0];

  const [dates, setDates] = useState(seed.dates);
  const [party, setParty] = useState(seed.party);
  // `seed.hours` is 0 when the URL carried none, which is where the default of
  // one hour comes from — `readBookingSelection` deliberately does not guess it.
  const [hours, setHours] = useState(() => clampHours(seed.hours));
  const [error, setError] = useState('');
  // Which dialog is up, if any — the same shape the checkout uses, so both
  // screens open the same two modals from the same kind of state.
  const [editing, setEditing] = useState(null);

  const price = formatPrice(service.amount);
  const hasPrice = Number.parseFloat(price.base) > 0;
  const period = service.periodType ? formatPeriod(service.periodType) : '';

  const rules = service.booking ?? {};

  /**
   * The seller's length rules, in the unit the listing is sold by — resolved in
   * one shared place so the checkout's copy of this dialog cannot disagree.
   */
  const length = useMemo(() => resolveBookingLength(service), [service]);

  /**
   * Mirrors the selection into the address bar on every change.
   *
   * `history.replaceState` rather than `router.replace`: Next picks the change up
   * for `useSearchParams` either way, but the router variant re-requests the
   * server component, which would mean a round trip per tap of a `+` button.
   * `replace` rather than `push` for the same reason in reverse — thirty history
   * entries between the visitor and the Back button is not navigation.
   */
  const syncUrl = useCallback(
    (nextDates, nextParty, nextHours) => {
      const query = toBookingParams({
        dates: nextDates,
        party: nextParty,
        takesGuests: rules.takesGuests,
        hours: service.isHourly ? nextHours : 0,
      }).toString();

      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
    },
    [pathname, rules.takesGuests, service.isHourly],
  );

  const applyDates = (nextDates) => {
    setDates(nextDates);
    setError('');
    syncUrl(nextDates, party, hours);
  };

  const applyParty = (nextParty) => {
    setParty(nextParty);
    syncUrl(dates, nextParty, hours);
  };

  const applyHours = (nextHours) => {
    setHours(nextHours);
    syncUrl(dates, party, nextHours);
  };

  const nights = nightsBetween(dates.from, dates.to);

  /** "1 week" / "7 nights" / "2 hours" — `''` until dates are chosen. */
  const lengthLabel = formatBookingLength({ nights, hours, length });

  /**
   * The app's own estimate, used until the API prices the booking.
   *
   * `amount` is the rate for **one period**, so it multiplies periods: a weekly
   * listing at ₦53,750 costs that for a seven-night booking, not seven times it.
   * Rounded up because a part-period is still charged whole — though the calendar
   * only allows part-periods on a hand-edited URL.
   *
   * Excludes everything only the server knows: the weekly discount and the
   * cleaning, pet and extra-guest fees. Only ever on screen for a signed-out
   * visitor — once there is a session, the spinner holds until the real figure
   * arrives rather than showing this one and correcting it.
   */
  const estimate = useMemo(() => {
    const rate = Number.parseFloat(price.base);
    const periods = length.singleDate ? hours : Math.ceil(nights / length.nightsStep);
    if (!Number.isFinite(rate) || periods <= 0) return null;

    return formatPrice(String(rate * periods));
  }, [price.base, nights, hours, length.singleDate, length.nightsStep]);

  /**
   * The server's figure for the booking itself — its `rentalAmount`, not its
   * `grandTotal`. This card quotes the listing, so the refundable deposit, the
   * service fee and the VAT are deliberately left out; they are the checkout's
   * business and would make the listing look dearer than it is.
   *
   * The server is still the authority on what remains: the weekly discount, the
   * cleaning/pet/extra-guest fees and how many nights of a range count as weekend
   * nights are all server-side, and no client formula can reproduce them.
   *
   * `checkoutOrder` despite the name — it prices and creates nothing, which is
   * what makes it safe to call on every change here. It needs a session, so a
   * signed-out visitor keeps the estimate above until they sign in.
   *
   * Tagged with the booking it priced so a stale figure is never shown beside
   * dates it does not belong to.
   */
  const [pricing, setPricing] = useState({ rental: null, key: '' });

  const pricingKey = `${service.id}|${dates.from}|${dates.to}|${party.adults}|${party.children}|${party.infants}|${party.pets}|${hours}`;

  useEffect(() => {
    if (!isAuthenticated || !dates.from || !dates.to) return undefined;

    let cancelled = false;

    getCheckoutQuote({
      serviceId: service.id,
      from: dates.from,
      to: dates.to,
      party: rules.takesGuests ? party : null,
      hours: service.isHourly ? hours : 0,
    }).then((result) => {
      if (cancelled) return;
      setPricing({ rental: result.quote?.rentalAmount ?? null, key: pricingKey });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `pricingKey` stands in for the booking inputs; see above
  }, [pricingKey, isAuthenticated]);

  /** Only while it still describes the booking on screen. */
  const quoted = pricing.key === pricingKey && pricing.rental !== null ? pricing.rental : null;
  const total = quoted !== null ? formatPrice(String(quoted)) : estimate;

  /**
   * A quote is in flight for the booking currently on screen.
   *
   * Spun rather than showing the local estimate meanwhile: the estimate leaves out
   * the discount and the per-stay fees, so displaying it first would print one
   * figure and then visibly correct itself a moment later. Derived from the tag
   * rather than a flag, which would have to be raised inside the effect.
   */
  const isPricing =
    isAuthenticated && Boolean(dates.from && dates.to) && pricing.key !== pricingKey;

  const handleReserve = () => {
    if (!dates.from || !dates.to) {
      setError('Choose your check-in and check-out dates.');
      return;
    }

    /**
     * The calendar already blocks all three, but a URL can carry any range in —
     * and these are worded in the listing's own unit, so a weekly listing says
     * "1 week" rather than the seven nights it is stored as.
     *
     * Skipped entirely for an hourly listing: there the hour stepper is the
     * length, and it cannot go below one.
     */
    if (length.nightsStep > 0) {
      const say = (nightsValue) => {
        const units = nightsValue / length.nightsStep;
        return `${units} ${length.unitLabel}${units === 1 ? '' : 's'}`;
      };

      if (nights < length.minNights) {
        setError(`This listing has a minimum booking of ${say(length.minNights)}.`);
        return;
      }

      if (length.maxNights > 0 && nights > length.maxNights) {
        setError(`This listing can be booked for at most ${say(length.maxNights)}.`);
        return;
      }

      if (length.nightsStep > 1 && nights % length.nightsStep !== 0) {
        setError(`This listing is booked in whole ${length.unitLabel}s.`);
        return;
      }
    }

    setError('');

    // The same keys the address bar already shows, so what the visitor sees in
    // the URL is exactly what checkout receives.
    const params = toBookingParams({
      dates,
      party,
      takesGuests: rules.takesGuests,
      hours: service.isHourly ? hours : 0,
    });

    router.push(`/rental/${service.slug}/checkout?${params.toString()}`);
  };

  return (
    <aside className="service-booking-card">
      {/* Dates chosen: the stay total, with the nightly rate implied by "for N
          nights". Before that there is no total to give, so the nightly rate
          stands on its own. */}
      <div className="booking-price-row">
        {hasPrice ? (
          <>
            {isPricing ? (
              <Spin size="small" />
            ) : (
              <strong>
                {CURRENCY_SYMBOL} {(total ?? price).formatted}
              </strong>
            )}
            {/* "for 1 week", not "for 7 nights" — the length is said in the unit
                the listing is sold by. Falls back to the bare period ("/per
                week") until something has been chosen. */}
            <span>{lengthLabel ? `for ${lengthLabel}` : period}</span>
          </>
        ) : (
          <strong>Price on request</strong>
        )}
      </div>

      {/* One bordered block, as the design draws it. */}
      <div className="booking-fields">
        <div className="booking-range">
          <DateRangeTrigger
            value={dates}
            onOpen={() => setEditing('dates')}
            expanded={editing === 'dates'}
            // Both cells always: on an hourly listing they simply read back the
            // same day, which the calendar sets on a single click.
            labels={['Check In', 'Check Out']}
            // The same three classes the guest trigger below uses, so both
            // halves of the block are styled once rather than described twice.
            classNames={{
              trigger: 'booking-field-trigger',
              label: 'booking-field-label',
              value: 'booking-field-value',
            }}
            ariaLabel="Booking dates"
          />
        </div>

        {/* Only an hourly listing needs a length in hours; a per-night one gets
            it from the range above. */}
        {service.isHourly ? <BookingHoursPicker value={hours} onChange={applyHours} /> : null}

        {/* Dates are asked of every rental type, but only a property is booked
            per guest — a hall, a car or a dress shows the date cells alone. */}
        {rules.takesGuests ? (
          <BookingGuestPicker
            value={party}
            onChange={applyParty}
            maxGuests={rules.maxGuests}
            petsAllowed={Boolean(rules.petsAllowed)}
            includedGuests={rules.includedGuests ?? 0}
            extraGuestFee={rules.extraGuestFee ?? 0}
          />
        ) : null}
      </div>

      {error ? <p className="booking-error">{error}</p> : null}

      <button type="button" className="btn btn-primary w-100" onClick={handleReserve}>
        Reserve
      </button>

      {/* <p className="booking-disclaimer">You won&apos;t be charged yet</p> */}

      {/* The listing's first choice and the checkout's later change are the same
          decision, so they are made in the same dialog. */}
      <ChangeDatesModal
        open={editing === 'dates'}
        value={dates}
        title="Select dates"
        onClose={() => setEditing(null)}
        onSave={(nextDates) => {
          applyDates(nextDates);
          setEditing(null);
        }}
        // The length rule is stated inside the dialog, where the calendar it
        // constrains actually is, rather than under the closed field.
        length={length}
        unavailableDates={service.unavailableDates}
      />
    </aside>
  );
}
